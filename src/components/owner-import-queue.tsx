"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ownerToast, wibDateTime } from "@/components/owner-dashboard-shared";

/**
 * /pemilik → Impor: mass video-URL import queue.
 * Paste many URLs (one per line), start the batch, watch per-job status update
 * live (3 s poll while the tab is open — this section is the one place the owner
 * panel polls on purpose, because the queue is expected to change constantly).
 */

type Job = {
  id: string;
  position: number;
  url: string;
  host: string;
  source: string;
  status: string;
  stage: string | null;
  progress: number;
  title: string | null;
  videoId: string | null;
  error: string | null;
  attempts: number;
  startedAt: string | null;
  finishedAt: string | null;
};

type Batch = {
  id: string;
  status: string;
  category: string | null;
  requireReview: boolean;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  total?: number;
  valid?: number;
  invalid?: number;
  duplicates?: number;
};

type Snapshot = {
  ok?: boolean;
  batches?: Batch[];
  selected?: (Batch & { pending?: number; done?: number; failed?: number; review?: number; duplicate?: number }) | null;
  jobs?: Job[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  processing: "Diproses",
  done: "Berhasil",
  failed: "Gagal",
  duplicate: "Duplikat",
  review: "Perlu cek",
  cancelled: "Dibatalkan",
};

const STATUS_CLS: Record<string, string> = {
  pending: "bg-zinc-500/15 text-zinc-300",
  processing: "bg-sky-400/15 text-sky-300",
  done: "bg-emerald-400/15 text-emerald-300",
  failed: "bg-red-400/15 text-red-300",
  duplicate: "bg-amber-400/15 text-amber-300",
  review: "bg-violet-400/15 text-violet-300",
  cancelled: "bg-zinc-600/20 text-zinc-500",
};

const BATCH_LABEL: Record<string, string> = {
  queued: "Antre (belum dimulai)",
  running: "Berjalan",
  paused: "Dijeda",
  cancelled: "Dibatalkan",
  done: "Selesai",
};

const STAGE_LABEL: Record<string, string> = {
  claimed: "disita",
  parse: "baca URL",
  metadata: "metadata",
  moderation: "cek judul",
  "embed-check": "cek embed",
  commit: "simpan",
  folder: "folder",
  retry: "coba lagi",
  failed: "gagal",
  done: "selesai",
};

async function call(secret: string, body: Record<string, unknown>) {
  const res = await fetch("/api/import-queue", {
    method: "POST",
    headers: { "content-type": "application/json", "x-online-key": secret },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
}

export function OwnerImportQueue({ secret }: { secret: string }) {
  const [text, setText] = useState("");
  const [quickUrl, setQuickUrl] = useState("");
  const [category, setCategory] = useState("");
  const [requireReview, setRequireReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [batchId, setBatchId] = useState<string>("");
  const [openJob, setOpenJob] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const lineCount = useMemo(() => text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length, [text]);

  const load = useCallback(
    async (id?: string) => {
      const d = await call(secret, { action: "list", batchId: id || batchId || undefined });
      if (d?.ok) {
        setSnap(d as Snapshot);
        const sel = (d as Snapshot).selected;
        if (sel?.id && !batchId) setBatchId(sel.id);
      }
    },
    [secret, batchId],
  );

  // Live updates: poll every 3 s while this tab is mounted (queue changes constantly).
  useEffect(() => {
    void load();
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret]);

  async function submit(raw?: string) {
    const payload = (raw ?? text).trim();
    if (!payload || busy) return;
    setBusy(true);
    try {
      const d = await call(secret, {
        action: "create",
        text: payload,
        category: category || undefined,
        requireReview,
        autostart: true,
      });
      if (!d?.ok) {
        ownerToast(`Import gagal: ${String(d?.error || "unknown")}`, "error");
        return;
      }
      ownerToast(
        `Batch dibuat: ${d.valid} valid · ${d.invalid} tidak valid · ${d.duplicates} duplikat.`,
        "ok",
      );
      setText("");
      setQuickUrl("");
      setBatchId(String(d.batchId || ""));
      await load(String(d.batchId || ""));
    } finally {
      setBusy(false);
    }
  }

  async function control(op: string, jobId?: string) {
    const d = await call(secret, {
      action: "control",
      op,
      batchId: snap?.selected?.id || batchId,
      jobId,
    });
    if (!d?.ok) ownerToast(`Gagal: ${String(d?.error || "unknown")}`, "error");
    await load();
  }

  const sel = snap?.selected;
  const jobs = snap?.jobs || [];
  const batches = snap?.batches || [];
  const hasActive = jobs.some((j) => j.status === "pending" || j.status === "processing");

  const btn =
    "rounded-lg border border-white/[0.12] px-2.5 py-1.5 text-[12px] text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50";
  const btnPrimary =
    "rounded-lg border border-[#2dd4bf] bg-[#2dd4bf] px-3 py-1.5 text-[13px] font-medium text-zinc-950 hover:bg-[#5eead4] disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      {/* Upload manual: satu URL langsung masuk antrean */}
      <div className="rounded-xl border border-white/[0.07] bg-[#101214] p-4">
        <h3 className="text-sm font-medium text-zinc-100">Upload Manual — 1 URL</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit(quickUrl);
            }}
            spellCheck={false}
            placeholder="https://… satu URL video"
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-[#2dd4bf]/50 focus:outline-none"
          />
          <button
            type="button"
            className={btnPrimary}
            disabled={busy || !quickUrl.trim()}
            onClick={() => void submit(quickUrl)}
          >
            {busy ? "Mengirim…" : "Upload"}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          Langsung masuk antrean background — pantau hasilnya di tabel di bawah. Pakai kategori &amp; review yang sama dengan import massal.
        </p>
      </div>

      {/* Input massal */}
      <div className="rounded-xl border border-white/[0.07] bg-[#101214] p-4">
        <h3 className="text-sm font-medium text-zinc-100">Import Video — tempel banyak URL</h3>
        <p className="mt-1 text-[12px] text-zinc-500">
          Satu URL per baris (maks {500}). Mendukung IndoAV, UserBokep, Puterin, Streamtape, Videy, LuluStream, DoodStream, Byse.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={"https://videy.co/v/?id=XXXXXXXXX\nhttps://streamtape.com/e/XXXXXXX\n…"}
          className="mt-3 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:border-[#2dd4bf]/50 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-zinc-400">{lineCount} baris URL</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5 text-[12px] text-zinc-200"
          >
            <option value="">Kategori: otomatis</option>
            <option value="amatir">Amatir</option>
            <option value="jav">JAV</option>
            <option value="ai-plus">AI+</option>
            <option value="viral">Viral</option>
            <option value="live">Live</option>
          </select>
          <label className="flex items-center gap-1.5 text-[12px] text-zinc-300">
            <input
              type="checkbox"
              checked={requireReview}
              onChange={(e) => setRequireReview(e.target.checked)}
              className="accent-[#2dd4bf]"
            />
            Tahan semua untuk review
          </label>
          <button type="button" className={btnPrimary} disabled={busy || !lineCount} onClick={() => void submit()}>
            {busy ? "Mengirim…" : "Mulai Import"}
          </button>
        </div>
      </div>

      {/* Pilih batch */}
      {batches.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sel?.id || ""}
            onChange={(e) => {
              setBatchId(e.target.value);
              void load(e.target.value);
            }}
            className="rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1.5 text-[12px] text-zinc-200"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.id} · {BATCH_LABEL[b.status] || b.status} · {wibDateTime(b.createdAt)}
              </option>
            ))}
          </select>
          {sel ? (
            <span className="text-[12px] text-zinc-400">
              {sel.valid ?? "?"} valid · {sel.invalid ?? 0} tidak valid · {sel.duplicates ?? 0} duplikat
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Kontrol batch */}
      {sel ? (
        <div className="flex flex-wrap items-center gap-2">
          {sel.status === "queued" || sel.status === "paused" ? (
            <button type="button" className={btnPrimary} onClick={() => void control(sel.status === "paused" ? "resume" : "start")}>
              {sel.status === "paused" ? "Lanjutkan" : "Mulai"}
            </button>
          ) : null}
          {sel.status === "running" ? (
            <button type="button" className={btn} onClick={() => void control("pause")}>
              Jeda
            </button>
          ) : null}
          {["queued", "running", "paused"].includes(sel.status) ? (
            <button type="button" className={btn} onClick={() => void control("cancel")}>
              Batalkan sisa
            </button>
          ) : null}
          <button type="button" className={btn} onClick={() => void control("retry-failed")}>
            Ulangi yang gagal
          </button>
          <button type="button" className={btn} onClick={() => void control("delete")}>
            Hapus riwayat
          </button>
          <button type="button" className={btn} onClick={() => void control("clear-finished")}>
            Bersihkan selesai
          </button>
          {hasActive ? <span className="text-[12px] text-sky-300">● antrean aktif — status diperbarui otomatis</span> : null}
        </div>
      ) : null}

      {/* Tabel antrean */}
      {sel && jobs.length ? (
        <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#101214]">
          <table className="w-full min-w-[720px] text-left text-[12px] text-zinc-300">
            <thead className="text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-normal">#</th>
                <th className="px-3 py-2 font-normal">URL</th>
                <th className="px-3 py-2 font-normal">Judul</th>
                <th className="px-3 py-2 font-normal">Status</th>
                <th className="px-3 py-2 font-normal">Progress</th>
                <th className="px-3 py-2 font-normal">Waktu</th>
                <th className="px-3 py-2 font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {jobs.map((j) => (
                <JobRow
                  key={j.id}
                  job={j}
                  open={openJob === j.id}
                  onToggle={() => setOpenJob(openJob === j.id ? "" : j.id)}
                  onControl={(op, id) => void control(op, id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : sel ? (
        <p className="rounded-xl border border-white/[0.07] bg-[#101214] px-4 py-6 text-center text-[13px] text-zinc-500">
          Belum ada job di batch ini.
        </p>
      ) : null}
    </div>
  );
}

function JobRow({
  job,
  open,
  onToggle,
  onControl,
}: {
  job: Job;
  open: boolean;
  onToggle: () => void;
  onControl: (op: string, jobId: string) => void;
}) {
  const time =
    job.startedAt || job.finishedAt
      ? `${wibDateTime(job.startedAt)}${job.finishedAt ? ` → ${wibDateTime(job.finishedAt)}` : ""}`
      : "—";
  return (
    <>
      <tr className="align-top hover:bg-white/[0.02]">
        <td className="px-3 py-2 tabular-nums text-zinc-500">{job.position}</td>
        <td className="max-w-[220px] px-3 py-2">
          <a
            href={job.url}
            target="_blank"
            rel="noopener"
            className="block truncate font-mono text-[11px] text-sky-300/80 hover:text-sky-200"
            title={job.url}
          >
            {job.url}
          </a>
          {job.source ? <span className="text-zinc-500">{job.source}</span> : null}
        </td>
        <td className="max-w-[200px] px-3 py-2">
          <span className="line-clamp-2">{job.title || "—"}</span>
          {job.videoId ? <span className="block font-mono text-[10px] text-zinc-500">{job.videoId}</span> : null}
        </td>
        <td className="px-3 py-2">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] ${STATUS_CLS[job.status] || "bg-zinc-500/15 text-zinc-300"}`}>
            {STATUS_LABEL[job.status] || job.status}
          </span>
          {job.attempts > 1 ? <span className="ml-1 text-[10px] text-zinc-500">×{job.attempts}</span> : null}
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full ${job.status === "failed" ? "bg-red-400" : job.status === "done" ? "bg-emerald-400" : "bg-sky-400"}`}
                style={{ width: `${Math.max(4, Math.min(100, job.progress))}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500">
              {job.progress}%{job.stage ? ` · ${STAGE_LABEL[job.stage] || job.stage}` : ""}
            </span>
          </div>
        </td>
        <td className="px-3 py-2 text-[10px] text-zinc-500">{time}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {(job.error || job.status === "failed") && (
              <button type="button" className="rounded border border-white/[0.12] px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-white/[0.06]" onClick={onToggle}>
                Detail
              </button>
            )}
            {["failed", "duplicate", "cancelled", "review"].includes(job.status) ? (
              <button
                type="button"
                className="rounded border border-white/[0.12] px-1.5 py-0.5 text-[10px] text-zinc-300 hover:bg-white/[0.06]"
                onClick={() => onControl("retry-job", job.id)}
              >
                Retry
              </button>
            ) : null}
            {["pending", "failed"].includes(job.status) ? (
              <button
                type="button"
                className="rounded border border-white/[0.12] px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-white/[0.06]"
                onClick={() => onControl("cancel-job", job.id)}
              >
                Batal
              </button>
            ) : null}
          </div>
        </td>
      </tr>
      {open ? (
        <tr>
          <td colSpan={7} className="bg-black/30 px-4 py-2 text-[12px] text-zinc-400">
            {job.error ? <p className="text-red-300/90">Error: {job.error}</p> : null}
            {job.status === "duplicate" ? <p>Video ini sudah ada di katalog — tidak dibuat ulang.</p> : null}
            {job.status === "review" ? <p>Video tersimpan tapi ditahan untuk review (judul/moderation).</p> : null}
            {!job.error && !["duplicate", "review"].includes(job.status) ? <p>Tidak ada error tercatat.</p> : null}
          </td>
        </tr>
      ) : null}
    </>
  );
}
