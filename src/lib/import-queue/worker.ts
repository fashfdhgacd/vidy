/**
 * Auto Import Queue — background worker.
 *
 * Jobs live in Postgres (import_jobs), so the queue survives restarts: on boot,
 * jobs stuck in 'processing' are re-queued (or failed when attempts ran out).
 * The worker claims ONE pending job at a time per slot (atomic UPDATE … RETURNING),
 * runs the pipeline, then applies retry-with-backoff on transient failures.
 *
 * Concurrency is configurable via IMPORT_QUEUE_CONCURRENCY (default 1, max 4).
 * Pausing a batch only stops NEW claims — a job already running finishes its
 * catalog commit safely before the worker moves on.
 */
import { getSql } from "@/lib/db";
import { processImportJob, type JobOutcome } from "./pipeline";
import type { JobRow } from "./store";

const POLL_MS = 1500;
const START_GAP_MS = 400;

function concurrency(): number {
  const n = Number(process.env.IMPORT_QUEUE_CONCURRENCY || 1);
  return Number.isFinite(n) ? Math.min(4, Math.max(1, Math.floor(n))) : 1;
}

function backoffMs(attempts: number): number {
  // 20s, 40s, 80s … capped at 10 min, plus jitter so retries don't herd.
  const base = Math.min(600_000, 20_000 * 2 ** Math.max(0, attempts - 1));
  return base + Math.floor(Math.random() * 5000);
}

type WorkerState = {
  timer: ReturnType<typeof setTimeout> | null;
  active: number;
  ticking: boolean;
  recovered: boolean;
};
const g = globalThis as typeof globalThis & { __importQueueWorker__?: WorkerState };
const state: WorkerState = (g.__importQueueWorker__ ??= {
  timer: null,
  active: 0,
  ticking: false,
  recovered: false,
});

/** Re-queue jobs orphaned by a previous process; fail the ones out of attempts. */
async function recoverStale(): Promise<void> {
  try {
    const sql = await getSql();
    await sql.query(
      `update import_jobs set status = 'failed', error = 'worker restart', finished_at = now()
       where status = 'processing' and attempts >= max_attempts`,
      [],
    );
    await sql.query(
      `update import_jobs set status = 'pending', stage = null, next_attempt_at = null
       where status = 'processing'`,
      [],
    );
    // Batches left "running" with nothing left to do are finished.
    await sql.query(
      `update import_batches b set status = 'done', finished_at = now()
       where b.status = 'running'
         and not exists (select 1 from import_jobs j where j.batch_id = b.id and j.status in ('pending', 'processing'))`,
      [],
    );
  } catch {
    /* db not ready yet — retried on next ensure */
  }
}

/** Atomically claim the next runnable job. Null when the queue is idle. */
async function claimNext(): Promise<JobRow | null> {
  const sql = await getSql();
  const rows = await sql<JobRow>`
    update import_jobs j
    set status = 'processing', stage = 'claimed', started_at = coalesce(j.started_at, now()),
        attempts = j.attempts + 1
    from (
      select id from import_jobs
      where status = 'pending'
        and (next_attempt_at is null or next_attempt_at <= now())
        and batch_id in (select id from import_batches where status = 'running')
      order by position, created_at
      limit 1
    ) q
    where j.id = q.id
    returning j.*
  `;
  return rows[0] || null;
}

async function markBatchStarted(batchId: string): Promise<void> {
  try {
    const sql = await getSql();
    await sql.query(
      `update import_batches set started_at = coalesce(started_at, now()) where id = $1`,
      [batchId],
    );
  } catch {
    /* cosmetic */
  }
}

/** When a running batch has no pending/processing jobs left, close it out. */
async function finalizeBatch(batchId: string): Promise<void> {
  try {
    const sql = await getSql();
    await sql.query(
      `update import_batches b set status = 'done', finished_at = now()
       where b.id = $1 and b.status = 'running'
         and not exists (select 1 from import_jobs j where j.batch_id = b.id and j.status in ('pending', 'processing'))`,
      [batchId],
    );
  } catch {
    /* cosmetic */
  }
}

async function applyOutcome(job: JobRow, outcome: JobOutcome): Promise<void> {
  const sql = await getSql();
  const now = new Date().toISOString();
  if (outcome.kind === "spawned") {
    await sql.query(
      `update import_jobs set status = 'done', stage = 'folder', progress = 100,
         title = $2, finished_at = $3 where id = $1`,
      [job.id, `Folder → ${outcome.count} video`, now],
    );
    await finalizeBatch(job.batch_id);
    return;
  }
  if (outcome.kind === "fail") {
    const attempts = Number(job.attempts) || 0;
    const max = Number(job.max_attempts) || 3;
    // A cancelled batch never re-queues: the in-flight job just stops here.
    const batchRows = await sql<{ status: string }>`
      select status from import_batches where id = ${job.batch_id} limit 1
    `;
    if (batchRows[0]?.status === "cancelled") {
      await sql.query(
        `update import_jobs set status = 'cancelled', error = $2, finished_at = $3, stage = 'cancelled'
         where id = $1`,
        [job.id, String(outcome.error).slice(0, 500), now],
      );
      return;
    }
    if (outcome.permanent || attempts >= max) {
      await sql.query(
        `update import_jobs set status = 'failed', error = $2, finished_at = $3, stage = 'failed'
         where id = $1`,
        [job.id, String(outcome.error).slice(0, 500), now],
      );
    } else {
      const waitMs = backoffMs(attempts);
      await sql.query(
        `update import_jobs set status = 'pending', error = $2, next_attempt_at = $3,
           stage = 'retry', progress = greatest(progress - 20, 0) where id = $1`,
        [job.id, String(outcome.error).slice(0, 500), new Date(Date.now() + waitMs).toISOString()],
      );
    }
    await finalizeBatch(job.batch_id);
    return;
  }
  // done | review | duplicate
  await sql.query(
    `update import_jobs set status = $2, title = $3, video_id = $4, stage = 'done', progress = 100,
       finished_at = $5 where id = $1`,
    [job.id, outcome.kind, outcome.title || null, outcome.videoId || null, now],
  );
  await finalizeBatch(job.batch_id);
}

async function runJob(job: JobRow): Promise<void> {
  try {
    await markBatchStarted(job.batch_id);
    const outcome = await processImportJob(job);
    await applyOutcome(job, outcome);
  } catch (err) {
    // Pipeline threw unexpectedly — treat as a transient failure with backoff.
    try {
      const sql = await getSql();
      const attempts = Number(job.attempts) || 0;
      const max = Number(job.max_attempts) || 3;
      if (attempts >= max) {
        await sql.query(
          `update import_jobs set status = 'failed', error = $2, finished_at = now(), stage = 'failed' where id = $1`,
          [job.id, `worker error: ${String((err as Error)?.message || err).slice(0, 300)}`],
        );
      } else {
        await sql.query(
          `update import_jobs set status = 'pending', error = $2, next_attempt_at = $3, stage = 'retry' where id = $1`,
          [
            job.id,
            `worker error: ${String((err as Error)?.message || err).slice(0, 300)}`,
            new Date(Date.now() + backoffMs(attempts)).toISOString(),
          ],
        );
      }
      await finalizeBatch(job.batch_id);
    } catch {
      /* leave the job in 'processing'; recovery on next boot re-queues it */
    }
  }
}

async function tick(): Promise<void> {
  if (state.ticking) return;
  state.ticking = true;
  try {
    while (state.active < concurrency()) {
      let job: JobRow | null = null;
      try {
        job = await claimNext();
      } catch {
        break; // db unavailable — try again next tick
      }
      if (!job) break;
      state.active += 1;
      void runJob(job).finally(() => {
        state.active -= 1;
      });
      // Small gap between claims so bursts don't hammer the providers/GitHub API.
      await new Promise((r) => setTimeout(r, START_GAP_MS));
    }
  } finally {
    state.ticking = false;
    schedule();
  }
}

function schedule(): void {
  if (state.timer) return;
  state.timer = setTimeout(() => {
    state.timer = null;
    void tick();
  }, POLL_MS);
  // Never keep the process alive just for the queue.
  (state.timer as { unref?: () => void }).unref?.();
}

/**
 * Boot the worker: recover stale claims, then poll for work. Idempotent — safe to
 * call on every API request; the first call starts the loop, later calls no-op.
 */
export async function ensureImportQueueWorker(): Promise<void> {
  if (typeof window !== "undefined") return;
  // Recovery resets 'processing' rows — it must run ONCE per process, otherwise
  // every API poll would yank in-flight jobs back to pending and double-process them.
  if (!state.recovered) {
    state.recovered = true;
    await recoverStale();
  }
  if (!state.timer) schedule();
}

/** Kick the worker immediately (e.g. after "Mulai" or a manual retry). */
export function kickImportQueue(): void {
  if (typeof window !== "undefined") return;
  if (state.timer) {
    clearTimeout(state.timer);
    state.timer = null;
  }
  void tick();
}
