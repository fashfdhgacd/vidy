/**
 * Sync-time HEAD of https://img.koleksidrpinguin.com/posters/typed/<id>.
 * `ok` is kept and not requested again. Missing and never-checked ids are the only ones HEAD'd.
 * A Cloudflare challenge, timeout, or 5xx is not stored, so a bad run cannot mark real posters missing.
 */
import { isCloudflareChallenge } from "./thumb-health-http.mjs";

export const R2_POSTER_BASE = "https://img.koleksidrpinguin.com/posters/typed/";
export const MIN_POSTER_BYTES = 3000;

export function posterKeyOf(id) {
  return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export function emptyProbe() {
  return { v: 1, at: "", ok: {}, miss: {} };
}

export function normalizeProbe(raw) {
  const probe = emptyProbe();
  if (!raw || typeof raw !== "object") return probe;
  const ok = raw.ok && typeof raw.ok === "object" ? raw.ok : {};
  const miss = raw.miss && typeof raw.miss === "object" ? raw.miss : {};
  for (const id of Object.keys(ok)) {
    const key = posterKeyOf(id);
    if (key) probe.ok[key] = 1;
  }
  for (const id of Object.keys(miss)) {
    const key = posterKeyOf(id);
    if (key && !probe.ok[key]) probe.miss[key] = String(miss[id] || "");
  }
  probe.at = typeof raw.at === "string" ? raw.at : "";
  return probe;
}

/** Ids to HEAD: not already confirmed. Order is stable (input order). */
export function planChecks(ids, probe) {
  const cache = normalizeProbe(probe);
  const out = [];
  const seen = new Set();
  for (const id of ids) {
    const key = posterKeyOf(id);
    if (!key || seen.has(key) || cache.ok[key]) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * @param {ReturnType<typeof emptyProbe>} probe
 * @param {string} id
 * @param {"ok" | "miss" | "skip"} verdict
 * @param {string} day
 */
export function applyProbe(probe, id, verdict, day) {
  const key = posterKeyOf(id);
  if (!key) return probe;
  if (verdict === "ok") {
    probe.ok[key] = 1;
    delete probe.miss[key];
  } else if (verdict === "miss") {
    delete probe.ok[key];
    probe.miss[key] = day;
  }
  return probe;
}

export function verdictFromHead(response) {
  if (!response) return "skip";
  if (isCloudflareChallenge(response)) return "challenge";
  const status = response.status;
  if (status === 404 || status === 410) return "miss";
  if (status !== 200 && status !== 204) return "skip";
  const type = String(response.headers?.get?.("content-type") || "");
  if (type && !/^image\//i.test(type.split(";")[0].trim())) return "miss";
  const len = Number(response.headers?.get?.("content-length") || 0);
  if (len && len < MIN_POSTER_BYTES) return "miss";
  const etag = String(response.headers?.get?.("etag") || "").replace(/"/g, "").toLowerCase();
  if (etag && response.placeholderMd5 && response.placeholderMd5[etag]) return "miss";
  return "ok";
}

/**
 * HEAD `ids` into `probe`. Stops on the first Cloudflare challenge and leaves unchecked ids alone.
 * @returns {Promise<{ checked: number, ok: number, miss: number, skipped: number, challenged: boolean }>}
 */
export async function probeHeads(ids, opts) {
  const probe = opts.probe;
  const day = opts.day;
  const concurrency = Math.max(1, opts.concurrency || 16);
  const fetchImpl = opts.fetchImpl;
  const timeoutMs = opts.timeoutMs || 12000;
  const headers = opts.headers || { "user-agent": "videyy-poster-probe/1.0" };
  const placeholderMd5 = opts.placeholderMd5 || {};
  let cursor = 0;
  let checked = 0;
  let ok = 0;
  let miss = 0;
  let skipped = 0;
  let challenged = false;

  async function one(id) {
    if (challenged) return;
    let response;
    try {
      response = await fetchImpl(`${R2_POSTER_BASE}${id}`, {
        method: "HEAD",
        redirect: "follow",
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      skipped++;
      return;
    }
    response.placeholderMd5 = placeholderMd5;
    const verdict = verdictFromHead(response);
    if (verdict === "challenge") {
      challenged = true;
      return;
    }
    checked++;
    if (verdict === "ok") {
      applyProbe(probe, id, "ok", day);
      ok++;
    } else if (verdict === "miss") {
      applyProbe(probe, id, "miss", day);
      miss++;
    } else skipped++;
  }

  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
    while (!challenged) {
      const i = cursor++;
      if (i >= ids.length) return;
      await one(ids[i]);
    }
  });
  await Promise.all(workers);
  return { checked, ok, miss, skipped, challenged };
}
