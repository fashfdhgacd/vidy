/**
 * Pure helpers for the once-a-day catalog sync.
 * The Worker never imports this. It only bundles data/synced-catalog.json.
 */

export function itemsFromUnknown(data) {
  if (Array.isArray(data)) return data.filter((row) => row && typeof row === "object" && row.id);
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return itemsFromUnknown(data.items);
    if (Array.isArray(data.videos)) return itemsFromUnknown(data.videos);
  }
  return [];
}

export function idsFromBlock(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data.map((id) => String(id || "").trim()).filter(Boolean);
  if (data.ids && typeof data.ids === "object" && !Array.isArray(data.ids)) {
    return Object.keys(data.ids).map((id) => id.trim()).filter(Boolean);
  }
  return [];
}

export function isJsonDocument(text) {
  const t = String(text || "").trim();
  return t.startsWith("{") || t.startsWith("[");
}

/** Later panel toggles override the committed file. Unknown keys are ignored. */
export function applyConfigOverlay(base, overlay) {
  const next = { ...base, upstream: { ...(base.upstream || {}) } };
  if (!overlay || typeof overlay !== "object") return next;
  if (typeof overlay.enabled === "boolean") next.enabled = overlay.enabled;
  if (overlay.mix === "newest" || overlay.mix === "shuffled") next.mix = overlay.mix;
  if (Array.isArray(overlay.excludeIds)) next.excludeIds = overlay.excludeIds.map(String);
  if (Array.isArray(overlay.excludeSources)) next.excludeSources = overlay.excludeSources.map(String);
  if (typeof overlay.tryHttp === "boolean") next.upstream.tryHttp = overlay.tryHttp;
  if (overlay.github && typeof overlay.github === "object") {
    next.upstream.github = { ...(next.upstream.github || {}), ...overlay.github };
  }
  return next;
}

export function sourceExcluded(item, excludeSources) {
  if (!excludeSources?.length) return false;
  const blob = `${item?.source || ""} ${item?.creator || ""} ${item?.embed || ""}`.toLowerCase();
  return excludeSources.some((name) => name && blob.includes(String(name).toLowerCase()));
}

/**
 * Videos to append to the static snapshot: upstream rows that are not already bundled
 * and are not on the blocklist (or the config exclude list).
 */
export function planSync({ localItems, upstreamItems, blockIds, config }) {
  if (!config || config.enabled === false) {
    return { skipped: true, items: [], dropped: 0, added: 0 };
  }
  const blocked = new Set((blockIds || []).map((id) => String(id)));
  for (const id of config.excludeIds || []) blocked.add(String(id));
  const localIds = new Set();
  for (const it of localItems || []) {
    const id = String(it?.id || "").trim();
    if (id) localIds.add(id);
  }
  const items = [];
  const seen = new Set();
  let dropped = 0;
  for (const it of upstreamItems || []) {
    const id = String(it?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (blocked.has(id) || sourceExcluded(it, config.excludeSources)) {
      dropped++;
      continue;
    }
    if (localIds.has(id)) continue;
    items.push(it);
  }
  return { skipped: false, items, dropped, added: items.length };
}

/** Ids the upstream blocklist adds on top of the file already bundled in this repo. */
export function extraBlockIds(localBlock, upstreamBlock) {
  const have = new Set(idsFromBlock(localBlock));
  const extra = [];
  for (const id of idsFromBlock(upstreamBlock)) {
    if (!have.has(id)) extra.push(id);
  }
  return extra;
}

export function mergeBlocklist(localBlock, extraIds, now = Date.now()) {
  const ids = { ...(localBlock?.ids && typeof localBlock.ids === "object" ? localBlock.ids : {}) };
  let added = 0;
  for (const id of extraIds || []) {
    if (!id || ids[id]) continue;
    ids[id] = { at: now, via: "videyy-sync" };
    added++;
  }
  return { block: { ...(localBlock || {}), ids }, added };
}

/**
 * Rows the previous snapshot had that the new upstream export no longer lists, minus blocked ids
 * and rows now bundled locally. Upstream drops a row both when the owner hides it and when its
 * multi-server merge folds it into another id; the caller tells the two apart (kept only when the
 * main site answers /watch/<id> with a redirect, i.e. a merged copy).
 */
export function droppedSinceLast({ prevItems, nextItems, localItems, blockIds }) {
  const next = new Set((nextItems || []).map((it) => String(it?.id || "")));
  const local = new Set((localItems || []).map((it) => String(it?.id || "")));
  const blocked = new Set((blockIds || []).map(String));
  return (prevItems || []).filter((it) => {
    const id = String(it?.id || "");
    return id && !next.has(id) && !local.has(id) && !blocked.has(id);
  });
}

/** Merged copies go back in, after the new rows, without duplicates. */
export function withRetained(nextItems, retained) {
  const seen = new Set((nextItems || []).map((it) => String(it.id)));
  const out = [...(nextItems || [])];
  for (const it of retained || []) {
    const id = String(it.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(it);
  }
  return out;
}

/**
 * Bundled ids the main site no longer lists (not in its export), split by what its
 * /watch/<id> answered: 301/308 → merged into another id, 302/404/410 → hidden or removed,
 * 200 → still reachable but unlisted. `prev` is the last map; ids back in the export leave it.
 * Returns the ids to (re)check: every missing id when `recheckAll`, else only unknown ones.
 */
export function upstreamMapPlan({ localIds, upstreamIds, blockIds, prev, recheckAll }) {
  const up = new Set(upstreamIds);
  const block = new Set(blockIds || []);
  const missing = [...new Set(localIds)].filter((id) => id && !up.has(id) && !block.has(id));
  const known = new Set([
    ...Object.keys(prev?.merged || {}),
    ...(prev?.gone || []),
    ...(prev?.unlisted || []),
  ]);
  return { missing, toCheck: recheckAll ? missing : missing.filter((id) => !known.has(id)) };
}

/** Main id from a main-site redirect Location (`/watch/<id>` or an absolute URL), else "". */
export function watchIdFromLocation(location) {
  const m = /\/watch\/([A-Za-z0-9_-]{3,64})(?:[/?#]|$)/.exec(String(location || ""));
  return m ? m[1] : "";
}

/**
 * Next map from the previous one plus fresh results ({ id, status, location }). Ids no longer
 * missing drop out; a failed check (status 0 / 5xx) keeps the previous answer for that id.
 */
export function nextUpstreamMap(prev, missing, results) {
  const was = new Map();
  for (const [id, main] of Object.entries(prev?.merged || {})) was.set(id, { kind: "merged", main });
  for (const id of prev?.gone || []) was.set(id, { kind: "gone" });
  for (const id of prev?.unlisted || []) was.set(id, { kind: "unlisted" });
  const now = new Map();
  for (const r of results) {
    const s = Number(r.status) || 0;
    const main = watchIdFromLocation(r.location);
    if ((s === 301 || s === 308) && main && main !== r.id) now.set(r.id, { kind: "merged", main });
    else if (s === 302 || s === 404 || s === 410) now.set(r.id, { kind: "gone" });
    else if (s === 200) now.set(r.id, { kind: "unlisted" });
  }
  const out = { merged: {}, gone: [], unlisted: [] };
  for (const id of [...new Set(missing)].sort()) {
    const v = now.get(id) || was.get(id);
    if (!v) continue;
    if (v.kind === "merged") out.merged[id] = v.main;
    else out[v.kind].push(id);
  }
  return out;
}

/**
 * Ids a satellite build leaves out. Owner hides always count. On videqsss.icu the upload
 * checkbox used to apply only to IndoAV/UserBokep links, so every other host was excluded
 * automatically at upload (not an owner choice); since videqsss carries all hosts (except Videy),
 * those automatic marks are ignored. Upload excludes on IndoAV/UserBokep (a real checkbox
 * choice) and on ids this sync cannot place still count. Without the split lists, skipIds as is.
 */
export function effectiveSkipIds(siteId, site, itemsById) {
  if (!Array.isArray(site?.hiddenIds) || !Array.isArray(site?.uploadExcludeIds) || siteId !== "videqsss") {
    return [...new Set((site?.skipIds || []).map(String))].sort();
  }
  const keep = new Set(site.hiddenIds.map(String));
  for (const raw of site.uploadExcludeIds) {
    const id = String(raw);
    const it = itemsById.get(id);
    const blob = it ? `${it.embed || ""} ${it.source || ""} ${it.direct || ""}` : "";
    if (!it || /indoav|userbokep/i.test(blob)) keep.add(id);
  }
  return [...keep].sort();
}
