/**
 * Auto Import Queue — per-job pipeline.
 *
 * One URL = one job = one catalog commit (idempotent: the GitHub upsert dedupes
 * by id/embed key, so a retry never creates a second copy). Mirrors the checks
 * the Telegram upload path applies (title guard, minor moderation, DRP/Byse
 * embed resolution, dead-Videy file check) but runs job-by-job in the worker.
 */
import { getSql } from "@/lib/db";
import { parseVideoLink, cleanTitle, brandTitle, detectCategory } from "@/lib/bot/parse.js";
import {
  resolveMetaFast,
  isDeadVideyFile,
  DEAD_VIDEY_REASON,
} from "@/lib/bot/upload-handler.js";
import { expandPutarinFolder } from "@/lib/bot/providers.js";
import { toRecord } from "@/lib/bot/store.js";
import { upsertVideosBatch } from "@/lib/bot/github.js";
import { isHttpPoster } from "@/lib/bot/posters.js";
import { uploadModeration } from "@/lib/catalog/moderation.js";
import { uploadRejectReason } from "@/lib/bot/title-guard.js";
import { DRP_CATEGORY } from "@/lib/catalog/drp-hosts.js";
import type { JobRow } from "./store";
import { dedupeKeyOf } from "./store";
import { randomUUID } from "node:crypto";

const DRP_HOSTS = new Set(["lulu", "dood", "byse", "byse-probe"]);
const isDrpHost = (host: unknown) => DRP_HOSTS.has(String(host || ""));

export type JobOutcome =
  | { kind: "done" | "review" | "duplicate"; title?: string; videoId?: string; note?: string }
  | { kind: "spawned"; count: number }
  | { kind: "fail"; error: string; permanent?: boolean };

async function setProgress(jobId: string, stage: string, progress: number) {
  try {
    const sql = await getSql();
    await sql.query(
      `update import_jobs set stage = $2, progress = $3 where id = $1`,
      [jobId, stage, Math.max(0, Math.min(100, Math.round(progress)))],
    );
  } catch {
    /* progress is cosmetic */
  }
}

/**
 * Putarin folder link → expand into child jobs in the same batch and finish the
 * parent. Returns spawned count; the parent itself is marked done by the worker.
 */
async function expandFolderJob(job: JobRow, parsed: Record<string, unknown>): Promise<number> {
  const sql = await getSql();
  const folderTitle = cleanTitle(String(parsed.title || ""));
  const kids = await expandPutarinFolder(String(parsed.id || ""), folderTitle);
  if (!kids.length) return 0;
  const [{ max }] = await sql<{ max: number }>`
    select coalesce(max(position), 0)::int as max from import_jobs where batch_id = ${job.batch_id}
  `;
  let pos = Number(max) || 0;
  for (const kid of kids) {
    pos += 1;
    const embed = String((kid as { embed?: string }).embed || "");
    if (!/^https:\/\//i.test(embed)) continue;
    await sql.query(
      `insert into import_jobs (id, batch_id, position, url, dedupe_key, parsed, max_attempts)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
      [
        `iqj-${randomUUID().slice(0, 12)}`,
        job.batch_id,
        pos,
        embed,
        dedupeKeyOf(kid as { host?: unknown; id?: unknown }),
        JSON.stringify(kid),
        job.max_attempts || 3,
      ],
    );
  }
  return pos - (Number(max) || 0);
}

/** Category rules copied from the Telegram upload path (no per-message override here). */
function jobCategory(host: string, baseTitle: string, given: string): string {
  if (isDrpHost(host)) return DRP_CATEGORY;
  if (host === "videy") return "videy";
  if (host === "putarin" || host === "putarin-folder") return given || "jav";
  if (host === "streamtape") return given || "ai-plus";
  const detected = detectCategory(baseTitle);
  const generic = !given || ["amatir", "umum", "lainnya", "bokep"].includes(given);
  if (!generic) return given;
  if (detected !== "lainnya") return detected;
  return given || (host === "indoav" || host === "userbokep" ? "amatir" : "lainnya");
}

export async function processImportJob(job: JobRow): Promise<JobOutcome> {
  const parsed = (job.parsed && typeof job.parsed === "object" ? job.parsed : null) ||
    (parseVideoLink(job.url) as Record<string, unknown> | null);
  if (!parsed) return { kind: "fail", error: "URL tidak dikenali platformnya", permanent: true };

  let video = { ...parsed } as Record<string, any>;

  // --- Stage: parse / folder expansion -------------------------------------
  await setProgress(job.id, "parse", 10);
  if (video.host === "putarin-folder" || video.folder) {
    try {
      const n = await expandFolderJob(job, video);
      if (!n) return { kind: "fail", error: "Folder kosong atau gagal dibaca", permanent: false };
      return { kind: "spawned", count: n };
    } catch (err) {
      return { kind: "fail", error: `Gagal baca folder: ${String((err as Error)?.message || err).slice(0, 160)}` };
    }
  }

  // --- Stage: metadata -------------------------------------------------------
  await setProgress(job.id, "metadata", 35);
  const givenTitle = cleanTitle(String(video.title || ""));
  const meta = (await resolveMetaFast(video, givenTitle === "Video" ? "" : givenTitle, process.env)) || {
    title: `Video ${video.id}`,
    thumb: "",
  };

  if (isDrpHost(video.host)) {
    if (video.host === "byse-probe" && !meta.byseOk) {
      return { kind: "fail", error: "Link tidak dikenal (bukan LuluStream/DoodStream/Byse)", permanent: true };
    }
    const byseEmbed =
      (video.host === "byse" || video.host === "byse-probe") &&
      /^https:\/\/[^/]+\/e\/[A-Za-z0-9]+/i.test(String(meta.embed || ""))
        ? String(meta.embed)
        : "";
    if (video.needsEmbedDomain && !byseEmbed) {
      return {
        kind: "fail",
        error: "Link panel byse.sx tanpa domain embed — kirim link embed akun Byse",
        permanent: true,
      };
    }
    video = {
      ...video,
      host: video.host === "byse-probe" ? "byse" : video.host,
      ...(byseEmbed ? { embed: byseEmbed, direct: byseEmbed } : {}),
    };
  }

  // --- Stage: title guard + moderation ---------------------------------------
  await setProgress(job.id, "moderation", 60);
  const guardText = `${String(video.title || "")} ${String(meta.title || "")}`;
  const rejectReason = uploadRejectReason(guardText);
  if (rejectReason) {
    return { kind: "fail", error: `Judul ditolak: ${rejectReason}`, permanent: true };
  }

  const baseTitle = cleanTitle(meta.title || `Video ${video.id}`);
  const title = brandTitle(baseTitle === "Video" ? `Video ${video.id}` : baseTitle);

  const batch = await getBatchRow(job.batch_id);
  const given = String(batch?.category || "").trim().toLowerCase();
  const category = jobCategory(String(video.host || ""), baseTitle, given);

  const minorText = `${baseTitle} ${String(video.title || "")} ${String(meta.title || "")}`;
  const mod = uploadModeration(minorText, { category });
  const hiddenReason = mod.hide;
  const reviewReason = mod.review;

  // Dead Videy file (cdn 404 on every retry): stored hidden, never deleted.
  let deadVidey = false;
  if (video.host === "videy") {
    await setProgress(job.id, "embed-check", 75);
    try {
      deadVidey = await isDeadVideyFile(video.id, video.direct);
    } catch {
      deadVidey = false;
    }
  } else {
    await setProgress(job.id, "embed-check", 75);
  }

  // --- Stage: build record ----------------------------------------------------
  const withPoster = isHttpPoster(meta.thumb)
    ? { ...video, poster: meta.thumb, thumbnail: meta.thumb }
    : video;
  const recordBase = toRecord({ parsed: withPoster, title, category });
  const record: Record<string, unknown> = isDrpHost(video.host)
    ? { ...recordBase, code: video.code, ...(meta.length ? { duration: meta.length } : {}) }
    : recordBase;
  if (meta.titleAuto) record.titleAuto = true;

  let finalRecord = record;
  const flagged = reviewReason ? { ...finalRecord, review_reason: reviewReason } : finalRecord;
  finalRecord = hiddenReason
    ? { ...flagged, hidden: true, hidden_reason: hiddenReason }
    : deadVidey
      ? { ...flagged, hidden: true, hidden_reason: DEAD_VIDEY_REASON }
      : flagged;

  // Admin option: hold every imported video for review before it goes public.
  if (batch?.require_review && !finalRecord.hidden && !finalRecord.review_reason) {
    finalRecord = {
      ...finalRecord,
      hidden: true,
      hidden_reason: "review-pending: import massal — menunggu review admin",
      review_reason: "import massal — verifikasi admin",
    };
  }

  // --- Stage: dedupe + commit ---------------------------------------------------
  await setProgress(job.id, "commit", 88);
  const fileName = String(video.file || "videos.json");
  const poster = String(finalRecord.poster || finalRecord.thumbnail || "").trim();
  const posters = isHttpPoster(poster) ? { [String(finalRecord.id)]: poster } : {};

  let result;
  try {
    result = await upsertVideosBatch(process.env, fileName, [finalRecord], { posters });
  } catch (err) {
    return { kind: "fail", error: `GitHub commit gagal: ${String((err as Error)?.message || err).slice(0, 200)}` };
  }
  if (!result.ok) {
    return { kind: "fail", error: (result.errors || []).join("; ").slice(0, 240) || "commit gagal" };
  }
  if ((result.created || 0) > 0) {
    const needsReview = Boolean(finalRecord.hidden || finalRecord.review_reason);
    return {
      kind: needsReview ? "review" : "done",
      title: String(title || ""),
      videoId: String(finalRecord.id || ""),
      note: deadVidey
        ? "video mati — disimpan tersembunyi"
        : hiddenReason || reviewReason || (batch?.require_review ? "menunggu review admin" : ""),
    };
  }
  const blocked = (result.blockedIds || []).map((x: unknown) => String(x).toLowerCase());
  if (blocked.includes(String(finalRecord.id || "").toLowerCase())) {
    return { kind: "fail", error: "Diblokir daftar blokir katalog", permanent: true };
  }
  return { kind: "duplicate", title: String(title || ""), videoId: String(finalRecord.id || "") };
}

async function getBatchRow(batchId: string) {
  const sql = await getSql();
  const rows = await sql<{ category: string | null; require_review: boolean }>`
    select category, require_review from import_batches where id = ${batchId} limit 1
  `;
  return rows[0] || null;
}
