import { createFileRoute } from "@tanstack/react-router";
import { isOwnerRequest, ownerSecret } from "@/lib/owner-auth";
import {
  createBatch,
  queueSnapshot,
  queueSummary,
  controlQueue,
  type ControlOp,
} from "@/lib/import-queue/store";
import { ensureImportQueueWorker, kickImportQueue } from "@/lib/import-queue/worker";

export const maxDuration = 30;

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

const CONTROL_OPS = new Set([
  "start",
  "pause",
  "resume",
  "cancel",
  "retry-failed",
  "delete",
  "clear-finished",
  "retry-job",
  "cancel-job",
]);

export const Route = createFileRoute("/api/import-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!ownerSecret()) return json({ ok: false, error: "not_configured" }, 503);
        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        if (!(await isOwnerRequest(request, body.key as string | undefined))) {
          return json({ ok: false, error: "forbidden" }, 403);
        }
        const action = String(body.action || "");

        // Keep the worker alive on every call; the DB is the source of truth.
        void ensureImportQueueWorker().catch(() => undefined);

        try {
          if (action === "create") {
            const res = await createBatch({
              text: typeof body.text === "string" ? body.text : undefined,
              urls: Array.isArray(body.urls) ? (body.urls as string[]) : undefined,
              category: typeof body.category === "string" ? body.category : undefined,
              requireReview: body.requireReview === true,
              autostart: body.autostart !== false,
            });
            if (res.ok) kickImportQueue();
            return json(res, res.status);
          }

          if (action === "list" || action === "snapshot") {
            const batchId = typeof body.batchId === "string" && body.batchId ? body.batchId : undefined;
            return json({ ok: true, ...(await queueSnapshot(batchId)) });
          }

          if (action === "summary") {
            return json({ ok: true, summary: await queueSummary() });
          }

          if (action === "control") {
            const op = String(body.op || "") as ControlOp;
            if (!CONTROL_OPS.has(op)) return json({ ok: false, error: "bad_op" }, 400);
            const res = await controlQueue(
              op,
              typeof body.batchId === "string" ? body.batchId : undefined,
              typeof body.jobId === "string" ? body.jobId : undefined,
            );
            if (res.ok && ["start", "resume", "retry-failed", "retry-job"].includes(op)) kickImportQueue();
            return json(res, res.status);
          }

          return json({ ok: false, error: "bad_action" }, 400);
        } catch (err) {
          console.error("[import-queue]", action, err);
          return json(
            { ok: false, error: `import_queue_failed: ${String((err as Error)?.message || err).slice(0, 160)}` },
            500,
          );
        }
      },
    },
  },
});
