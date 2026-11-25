/**
 * videqsss catalog plan. The Worker never imports this.
 *
 * Two inputs, both written into data/videqsss-catalog.json by the daily sync:
 *   1. One-time bulk import of the folder URL in sites.videqsss.folderUrl.
 *      Empty string means the owner has not given the link yet. Nothing is fetched.
 *   2. Later uploads from the koleksidrpinguin /pemilik flow (data/videos-latest*.json).
 *      A row is included when it carries the panel marker (sites, site, or tags)
 *      or when its date/updated_at is on or after the bulk import.
 */

export function parseFolderUrl(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.replace(/^www\./i, "");
  if (!/indoav\.|userbokep\./i.test(host)) return null;
  const m = url.pathname.match(/\/f\/([A-Za-z0-9_-]+)/i);
  if (!m) return null;
  return {
    origin: `${url.protocol}//${url.host}`,
    id: m[1],
    source: /userbokep\./i.test(host) ? "UserBokep" : "IndoAV",
  };
}

export function folderPageUrl(folder, page) {
  const n = Math.max(1, Math.floor(Number(page) || 1));
  return n === 1 ? `${folder.origin}/f/${folder.id}` : `${folder.origin}/f/${folder.id}/page/${n}`;
}

function decode(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function num(value) {
  const s = String(value || "").toLowerCase().replace(/,/g, ".").trim();
  const m = s.match(/^([\d.]+)\s*(k|rb|m|jt)?/);
  if (!m) return 0;
  const n = m[2] ? parseFloat(m[1]) : parseFloat(m[1].replace(/\./g, ""));
  if (!Number.isFinite(n)) return 0;
  const mul = m[2] === "k" || m[2] === "rb" ? 1e3 : m[2] === "m" || m[2] === "jt" ? 1e6 : 1;
  return Math.round(n * mul);
}

function dur(value) {
  let t = 0;
  for (const m of String(value || "").matchAll(/(\d+)\s*([hms])/g)) {
    t += Number(m[1]) * (m[2] === "h" ? 3600 : m[2] === "m" ? 60 : 1);
  }
  return t;
}

function stat(block, icon) {
  const m = block.match(new RegExp(`data-icon="${icon}">[\\s\\S]*?<span class="text-xs">([^<]+)</span>`));
  return m ? m[1].trim() : "";
}

function sourceAllowed(item, sources) {
  if (!sources || sources === "all") return true;
  const blob = `${item?.embed || ""} ${item?.source || ""} ${item?.direct || ""}`;
  return sources.some((name) => {
    if (name === "indoav") return /indoav/i.test(blob);
    if (name === "userbokep") return /userbokep/i.test(blob);
    return false;
  });
}

/** Cards on one IndoAV / UserBokep folder page → catalog rows. */
export function parseFolderCatalog(html, folder, date = new Date().toISOString().slice(0, 10)) {
  if (!folder?.origin || !folder?.id) return [];
  const articles = String(html || "").match(/<article class="video-card[\s\S]*?<\/article>/g) || [];
  const items = [];
  const seen = new Set();
  for (const block of articles) {
    const ids = [...block.matchAll(/href="(?:https?:\/\/[^/"']+)?\/d\/([A-Za-z0-9_-]+)"/gi)].map((m) => m[1]);
    const id = ids.find((code) => code && !seen.has(code));
    if (!id) continue;
    seen.add(id);
    const heading = block.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const alt = block.match(/<img[^>]+alt="([^"]*)"/i);
    const title = decode(heading?.[1]) || decode(alt?.[1]) || id;
    const poster = block.match(/<img[^>]+(?:data-src|src)="(https?:\/\/[^"]+)"/i)?.[1] || "";
    const embed = `${folder.origin}/e/${id}`;
    items.push({
      id,
      title,
      embed,
      direct: embed,
      source: folder.source,
      category: "",
      tags: [String(folder.source || "").toLowerCase(), "folder"],
      ...(poster ? { poster } : {}),
      duration: dur(stat(block, "clock")),
      views: num(stat(block, "eye")),
      likes: num(stat(block, "heart")),
      date,
      via: "folder",
    });
  }
  return items;
}

/** Panel hook: sites: ["videqsss"], site: "videqsss", or a tag of that name. */
export function markedForSite(item, marker = "videqsss") {
  const mark = String(marker || "videqsss").toLowerCase();
  if (!mark) return false;
  if (String(item?.site || "").toLowerCase() === mark) return true;
  const sites = Array.isArray(item?.sites) ? item.sites : [];
  if (sites.some((name) => String(name).toLowerCase() === mark)) return true;
  const tags = Array.isArray(item?.tags) ? item.tags : [];
  return tags.some((name) => String(name).toLowerCase() === mark);
}

function isOnOrAfter(item, sinceIso) {
  const since = String(sinceIso || "");
  if (!since) return false;
  const iso = String(item?.updated_at || "");
  if (/^\d{4}-\d{2}-\d{2}T/.test(iso)) return iso >= since;
  const day = String(item?.date || iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  return day >= since.slice(0, 10);
}

/**
 * @param previous existing data/videqsss-catalog.json
 * @param folderItems parsed folder rows, or null when the crawl did not run or failed
 * @param panelItems rows from the pemilik upload feeds (videos-latest)
 */
export function planVideqsssCatalog({ previous, folderItems, panelItems, blockIds, config, now }) {
  const rule = config?.sites?.videqsss || {};
  const marker = rule.panelMarker || "videqsss";
  const sources = rule.sources ?? ["indoav", "userbokep"];
  const blocked = new Set((blockIds || []).map((id) => String(id)));
  const folderUrl = String(rule.folderUrl || "").trim();
  const parsed = parseFolderUrl(folderUrl);
  const prevItems = Array.isArray(previous?.items) ? previous.items : [];
  const prevUrl = String(previous?.folderUrl || "");
  const prevAt = previous?.importedAt || null;
  const sameFolder = Boolean(parsed && prevAt && prevUrl === folderUrl);
  const crawlOk = Boolean(parsed && !sameFolder && Array.isArray(folderItems));

  const folderRows = crawlOk
    ? folderItems
    : prevItems.filter((it) => it?.via !== "panel");
  const since = sameFolder ? prevAt : null;

  const items = [];
  const seen = new Set();
  const push = (it, via) => {
    const id = String(it?.id || "").trim();
    if (!id || seen.has(id) || blocked.has(id)) return;
    if (!sourceAllowed(it, sources)) return;
    seen.add(id);
    const { via: _via, ...rest } = it;
    items.push({ ...rest, via });
  };

  for (const it of folderRows) push(it, "folder");
  for (const it of prevItems) {
    if (it?.via === "panel") push(it, "panel");
  }
  for (const it of panelItems || []) {
    if (!markedForSite(it, marker) && !isOnOrAfter(it, since)) continue;
    push(it, "panel");
  }

  return {
    folderUrl: crawlOk ? folderUrl : prevUrl,
    importedAt: crawlOk ? now : prevAt,
    items,
    crawled: crawlOk,
  };
}
