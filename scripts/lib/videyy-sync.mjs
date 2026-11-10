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
  if (overlay.sites && typeof overlay.sites === "object") {
    next.sites = { ...(base.sites || {}) };
    for (const [id, rule] of Object.entries(overlay.sites)) {
      if (!rule || typeof rule !== "object") continue;
      const prev = { ...(next.sites[id] || {}) };
      if (typeof rule.enabled === "boolean") prev.enabled = rule.enabled;
      if (rule.sources === "all" || Array.isArray(rule.sources)) prev.sources = rule.sources;
      if (typeof rule.folderUrl === "string") prev.folderUrl = rule.folderUrl.trim();
      if (typeof rule.panelMarker === "string" && rule.panelMarker.trim()) prev.panelMarker = rule.panelMarker.trim();
      next.sites[id] = prev;
    }
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
