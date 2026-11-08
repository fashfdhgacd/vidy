/**
 * Auto Import Queue — persistence + intake.
 *
 * Tables: migrations/0003_import_queue.sql (import_batches, import_jobs).
 * Works on both backends (Neon via DATABASE_URL, local PGlite preview).
 * All functions are server-only (getSql throws in the browser).
 */
import { randomUUID } from "node:crypto";
import { getSql, type Sql } from "@/lib/db";
import { parseVideoLink } from "@/lib/bot/parse.js";
import { validateImportUrl, splitUrlLines } from "./validate";

export const MAX_BATCH_URLS = 500;
export const DEFAULT_MAX_ATTEMPTS = 3;

export type BatchStatus = "queued" | "running" | "paused" | "cancelled" | "done";
export type JobStatus =
  | "pending"
  | "processing"
  | "done"
  | "failed"
  | "duplicate"
  | "review"
  | "cancelled";

export type BatchRow = {
  id: string;
  status: BatchStatus;
  category: string | null;
  require_review: boolean;
  total_urls: number;
  valid_urls: number;
  invalid_urls: number;
  duplicate_urls: number;
  created_at: unknown;
  started_at: unknown;
  finished_at: unknown;
  note: string | null;
};

export type JobRow = {
  id: string;
  batch_id: string;
  position: number;
  url: string;
  dedupe_key: string | null;
  parsed: Record<string, unknown> | null;
  status: JobStatus;
  stage: string | null;
  progress: number;
  title: string | null;
  video_id: string | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  next_attempt_at: unknown;
  started_at: unknown;
  finished_at: unknown;
  created_at: unknown;
};

function iso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  return s || null;
}

export function batchOut(b: BatchRow, counts?: Record<string, number>) {
  return {
    id: b.id,
    status: b.status,
    category: b.category,
    requireReview: Boolean(b.require_review),
    total: Number(b.total_urls) || 0,
    valid: Number(b.valid_urls) || 0,
    invalid: Number(b.invalid_urls) || 0,
    duplicates: Number(b.duplicate_urls) || 0,
    createdAt: iso(b.created_at),
    startedAt: iso(b.started_at),
    finishedAt: iso(b.finished_at),
    note: b.note,
    ...(counts || {}),
  };
}

export function jobOut(j: JobRow) {
  const p = j.parsed && typeof j.parsed === "object" ? (j.parsed as Record<string, unknown>) : {};
  return {
    id: j.id,
    batchId: j.batch_id,
    position: j.position,
    url: j.url,
    host: String(p.host || ""),
    source: String(p.source || ""),
    status: j.status,
    stage: j.stage,
    progress: Number(j.progress) || 0,
    title: j.title,
    videoId: j.video_id,
    error: j.error,
    attempts: Number(j.attempts) || 0,
    nextAttemptAt: iso(j.next_attempt_at),
    startedAt: iso(j.started_at),
    finishedAt: iso(j.finished_at),
  };
}

/** Dedupe key shared by intake and the worker: provider host + video id. */
export function dedupeKeyOf(parsed: { host?: unknown; id?: unknown } | null | undefined): string {
  return `${String(parsed?.host || "")}:${String(parsed?.id || "")}`.toLowerCase();
}

async function catalogIdSet(): Promise<Set<string>> {
  try {
    const { loadItemsRaw } = await import("@/lib/catalog/local-cache");
    const cache = await loadItemsRaw();
    const list = (cache as { raw?: unknown[]; items?: unknown[] }).raw ||
      (cache as { items?: unknown[] }).items ||
      [];
    const out = new Set<string>();
    for (const it of list as { id?: unknown }[]) {
      const id = String(it?.id || "").toLowerCase();
      if (id) out.add(id);
    }
    return out;
  } catch {
    return new Set();
  }
}

export type CreateBatchInput = {
  text?: string;
  urls?: string[];
  category?: string;
  requireReview?: boolean;
  autostart?: boolean;
};

export type CreateBatchResult = {
  ok: boolean;
  status: number;
  error?: string;
  batchId?: string;
  total?: number;
  valid?: number;
  invalid?: number;
  duplicates?: number;
  invalidSamples?: { url: string; error: string }[];
  duplicateSamples?: string[];
};

/**
 * Intake: split pasted text, validate every line (URL shape + SSRF guard), detect the
 * provider with the same parser the Telegram bot uses, drop duplicates (inside the
 * batch, against the live catalog, and against still-open queue jobs), then store
 * one row per accepted URL. Nothing is fetched and nothing is processed here —
 * that is the worker's job.
 */
export async function createBatch(input: CreateBatchInput): Promise<CreateBatchResult> {
  const sql = await getSql();
  const lines = Array.isArray(input.urls) ? input.urls.map(String) : splitUrlLines(input.text || "");
  if (!lines.length) return { ok: false, status: 400, error: "Tidak ada URL." };
  if (lines.length > MAX_BATCH_URLS) {
    return { ok: false, status: 400, error: `Maksimal ${MAX_BATCH_URLS} URL per batch (dapat ${lines.length}).` };
  }

  const invalidSamples: { url: string; error: string }[] = [];
  const duplicateSamples: string[] = [];
  const seenKeys = new Set<string>();
  const seenUrls = new Set<string>();
  // Every pasted line becomes a job row: pending ones get processed, the rest are
  // stored already-finished (failed = invalid URL, duplicate = seen before) so the
  // monitoring table accounts for 100% of the batch.
  const jobs: {
    url: string;
    parsed: Record<string, unknown> | null;
    key: string;
    status: "pending" | "failed" | "duplicate";
    error: string | null;
  }[] = [];
  let invalid = 0;
  let duplicates = 0;
  let valid = 0;

  const catalogIds = await catalogIdSet();
  const openRows = await sql<{ dedupe_key: string | null; url: string }>`
    select dedupe_key, url from import_jobs
    where status in ('pending', 'processing')
  `;
  const openKeys = new Set(openRows.map((r) => String(r.dedupe_key || "").toLowerCase()).filter(Boolean));
  const openUrls = new Set(openRows.map((r) => String(r.url || "").toLowerCase()));

  for (const line of lines) {
    const check = validateImportUrl(line);
    if (!check.ok) {
      invalid += 1;
      if (invalidSamples.length < 10) invalidSamples.push({ url: line.slice(0, 200), error: check.error });
      jobs.push({ url: line.slice(0, 500), parsed: null, key: "", status: "failed", error: `URL tidak valid: ${check.error}` });
      continue;
    }
    const parsed = parseVideoLink(check.url) as Record<string, unknown> | null;
    if (!parsed) {
      invalid += 1;
      if (invalidSamples.length < 10) invalidSamples.push({ url: check.url.slice(0, 200), error: "platform tidak didukung" });
      jobs.push({ url: check.url, parsed: null, key: "", status: "failed", error: "Platform tidak didukung" });
      continue;
    }
    const key = dedupeKeyOf(parsed);
    const normUrl = check.url.toLowerCase();
    const catalogId = String(parsed.id || "").toLowerCase();
    if (
      seenKeys.has(key) ||
      seenUrls.has(normUrl) ||
      openKeys.has(key) ||
      openUrls.has(normUrl) ||
      (catalogId && catalogIds.has(catalogId))
    ) {
      duplicates += 1;
      if (duplicateSamples.length < 10) duplicateSamples.push(check.url.slice(0, 200));
      jobs.push({ url: check.url, parsed, key, status: "duplicate", error: "Duplikat: sudah ada di katalog atau antrean" });
      continue;
    }
    seenKeys.add(key);
    seenUrls.add(normUrl);
    valid += 1;
    jobs.push({ url: check.url, parsed, key, status: "pending", error: null });
  }

  if (!valid) {
    return {
      ok: false,
      status: 400,
      error: "Semua URL tidak valid atau duplikat.",
      total: lines.length,
      valid: 0,
      invalid,
      duplicates,
      invalidSamples,
      duplicateSamples,
    };
  }

  const batchId = `iq-${randomUUID().slice(0, 8)}`;
  const autostart = input.autostart !== false;
  const category = String(input.category || "").trim().toLowerCase() || null;
  const now = new Date().toISOString();

  await sql.query(
    `insert into import_batches (id, status, category, require_review, total_urls, valid_urls, invalid_urls, duplicate_urls)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      batchId,
      autostart ? "running" : "queued",
      category,
      Boolean(input.requireReview),
      lines.length,
      valid,
      invalid,
      duplicates,
    ],
  );

  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    const terminal = j.status !== "pending";
    await sql.query(
      `insert into import_jobs (id, batch_id, position, url, dedupe_key, parsed, status, stage, error, finished_at, max_attempts)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11)`,
      [
        `iqj-${randomUUID().slice(0, 12)}`,
        batchId,
        i + 1,
        j.url,
        j.key || null,
        j.parsed ? JSON.stringify(j.parsed) : null,
        j.status,
        terminal ? "intake" : "queued",
        j.error,
        terminal ? now : null,
        DEFAULT_MAX_ATTEMPTS,
      ],
    );
  }

  return {
    ok: true,
    status: 200,
    batchId,
    total: lines.length,
    valid,
    invalid,
    duplicates,
    invalidSamples,
    duplicateSamples,
  };
}

async function jobCounts(sql: Sql, batchId: string): Promise<Record<string, number>> {
  const rows = await sql<{ status: string; n: number }>`
    select status, count(*)::int as n from import_jobs where batch_id = ${batchId} group by status
  `;
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = Number(r.n) || 0;
  return out;
}

export async function listBatches(limit = 20): Promise<BatchRow[]> {
  const sql = await getSql();
  return sql<BatchRow>`
    select * from import_batches order by created_at desc limit ${limit}
  `;
}

export async function getBatch(id: string): Promise<BatchRow | null> {
  const sql = await getSql();
  const rows = await sql<BatchRow>`select * from import_batches where id = ${id} limit 1`;
  return rows[0] || null;
}

export async function listJobs(batchId: string, limit = 500): Promise<JobRow[]> {
  const sql = await getSql();
  return sql<JobRow>`
    select * from import_jobs where batch_id = ${batchId} order by position asc limit ${limit}
  `;
}

/** Full queue snapshot for the monitoring UI: recent batches + jobs of the selected one. */
export async function queueSnapshot(batchId?: string) {
  const sql = await getSql();
  // Close out batches whose jobs all reached a terminal state (covers cancels
  // and intake-only batches the worker never touched).
  await sql.query(
    `update import_batches b set status = 'done', finished_at = now()
     where b.status = 'running'
       and not exists (select 1 from import_jobs j where j.batch_id = b.id and j.status in ('pending', 'processing'))`,
    [],
  );
  const batches = await listBatches(20);
  const selected = batchId
    ? await getBatch(batchId)
    : batches.find((b) => ["queued", "running", "paused"].includes(b.status)) || batches[0] || null;
  const jobs = selected ? await listJobs(selected.id) : [];
  const counts = selected ? await jobCounts(sql, selected.id) : {};
  return {
    batches: batches.map((b) => batchOut(b)),
    selected: selected ? batchOut(selected, counts) : null,
    jobs: jobs.map(jobOut),
  };
}

/** Dashboard summary: active queue, processing now, done/failed today, needs review. */
export async function queueSummary() {
  const sql = await getSql();
  const [row] = await sql<{
    active: number;
    processing: number;
    done_today: number;
    failed_today: number;
    review: number;
    duplicate_today: number;
  }>`
    select
      count(*) filter (where j.status in ('pending'))::int as pending,
      count(*) filter (where j.status = 'processing')::int as processing,
      count(*) filter (where j.status = 'done' and j.finished_at >= date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')::int as done_today,
      count(*) filter (where j.status = 'failed' and j.finished_at >= date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')::int as failed_today,
      count(*) filter (where j.status = 'review')::int as review,
      count(*) filter (where j.status = 'duplicate' and j.finished_at >= date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta')::int as duplicate_today
    from import_jobs j
    join import_batches b on b.id = j.batch_id
    where b.status <> 'cancelled'
  `;
  const r = row || ({} as Record<string, never>);
  return {
    pending: Number((r as { pending?: number }).pending) || 0,
    active:
      (Number((r as { pending?: number }).pending) || 0) + (Number(r.processing) || 0),
    processing: Number(r.processing) || 0,
    doneToday: Number(r.done_today) || 0,
    failedToday: Number(r.failed_today) || 0,
    review: Number(r.review) || 0,
    duplicateToday: Number(r.duplicate_today) || 0,
  };
}

// ---------------------------------------------------------------------------
// Queue controls (all owner-only via the API layer)
// ---------------------------------------------------------------------------

export type ControlOp =
  | "start"
  | "pause"
  | "resume"
  | "cancel"
  | "retry-failed"
  | "delete"
  | "clear-finished"
  | "retry-job"
  | "cancel-job";

export async function controlQueue(
  op: ControlOp,
  batchId?: string,
  jobId?: string,
): Promise<{ ok: boolean; status: number; error?: string; affected?: number }> {
  const sql = await getSql();

  if (op === "clear-finished") {
    // Remove history of batches whose jobs are all finished. Videos already
    // committed to the catalog are NOT touched — they live in the feed files.
    const res = await sql.query(
      `delete from import_batches b
       where not exists (select 1 from import_jobs j where j.batch_id = b.id and j.status in ('pending', 'processing'))
         and b.status in ('done', 'cancelled', 'queued', 'paused')
       returning id`,
      [],
    );
    return { ok: true, status: 200, affected: res.length };
  }

  if (!batchId) return { ok: false, status: 400, error: "batchId wajib." };
  const batch = await getBatch(batchId);
  if (!batch) return { ok: false, status: 404, error: "Batch tidak ditemukan." };

  switch (op) {
    case "start":
    case "resume":
      await sql.query(`update import_batches set status = 'running' where id = $1`, [batchId]);
      return { ok: true, status: 200 };
    case "pause":
      await sql.query(`update import_batches set status = 'paused' where id = $1`, [batchId]);
      return { ok: true, status: 200 };
    case "cancel":
      await sql.query(
        `update import_jobs set status = 'cancelled', finished_at = now()
         where batch_id = $1 and status in ('pending', 'failed', 'duplicate', 'review')`,
        [batchId],
      );
      await sql.query(`update import_batches set status = 'cancelled', finished_at = now() where id = $1`, [batchId]);
      return { ok: true, status: 200 };
    case "retry-failed": {
      const res = await sql.query(
        `update import_jobs set status = 'pending', error = null, next_attempt_at = null, progress = 0
         where batch_id = $1 and status = 'failed'
         returning id`,
        [batchId],
      );
      if (batch.status === "cancelled" || batch.status === "done") {
        await sql.query(`update import_batches set status = 'running', finished_at = null where id = $1`, [batchId]);
      } else if (batch.status === "paused") {
        await sql.query(`update import_batches set status = 'running' where id = $1`, [batchId]);
      }
      return { ok: true, status: 200, affected: res.length };
    }
    case "delete": {
      const active = await sql<{ n: number }>`
        select count(*)::int as n from import_jobs
        where batch_id = ${batchId} and status in ('pending', 'processing')
      `;
      if (Number(active[0]?.n) > 0) {
        return { ok: false, status: 409, error: "Batch masih punya pekerjaan aktif." };
      }
      await sql.query(`delete from import_batches where id = $1`, [batchId]);
      return { ok: true, status: 200 };
    }
    case "retry-job": {
      if (!jobId) return { ok: false, status: 400, error: "jobId wajib." };
      const res = await sql.query(
        `update import_jobs set status = 'pending', error = null, next_attempt_at = null,
           progress = 0, attempts = 0, stage = null, finished_at = null
         where id = $1 and batch_id = $2 and status in ('failed', 'duplicate', 'cancelled', 'review')
         returning id`,
        [jobId, batchId],
      );
      if (!res.length) return { ok: false, status: 404, error: "Job tidak bisa diulang." };
      if (batch.status !== "running") {
        await sql.query(`update import_batches set status = 'running', finished_at = null where id = $1`, [batchId]);
      }
      return { ok: true, status: 200, affected: 1 };
    }
    case "cancel-job": {
      if (!jobId) return { ok: false, status: 400, error: "jobId wajib." };
      const res = await sql.query(
        `update import_jobs set status = 'cancelled', finished_at = now()
         where id = $1 and batch_id = $2 and status in ('pending', 'failed')
         returning id`,
        [jobId, batchId],
      );
      return res.length ? { ok: true, status: 200, affected: 1 } : { ok: false, status: 409, error: "Hanya job pending/gagal yang bisa dibatalkan." };
    }
    default:
      return { ok: false, status: 400, error: "Aksi tidak dikenal." };
  }
}
