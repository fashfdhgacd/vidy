/**
 * Once-a-day catalog sync. Runs in GitHub Actions, never inside a visitor request.
 *
 * Reads data/videyy-sync.config.json (and an optional remote/KV overlay).
 * Pulls koleksidrpinguin.com catalog files when they answer JSON, drops the blocklist,
 * and writes only the new rows to data/synced-catalog.json. The Worker bundles that file.
 */
import { folderPageUrl, parseFolderCatalog, parseFolderUrl, planVideqsssCatalog } from "./lib/videqsss-catalog.mjs";
import fs from "node:fs";
import path from "node:path";
import {
  applyConfigOverlay,
  droppedSinceLast,
  extraBlockIds,
  idsFromBlock,
  isJsonDocument,
  itemsFromUnknown,
  mergeBlocklist,
  effectiveSkipIds,
  nextUpstreamMap,
  planSync,
  upstreamMapPlan,
  withRetained,
} from "./lib/videyy-sync.mjs";

const root = process.cwd();

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  fs.writeFileSync(path.join(root, rel), JSON.stringify(data, null, 2) + "\n");
}

async function fetchText(url, headers) {
  const res = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function pullJson(config, relPath) {
  const gh = config.upstream?.github || {};
  const repo = `${gh.owner}/${gh.repo}`;
  const self = process.env.GITHUB_REPOSITORY || "";
  const token = process.env.VIDEY_SYNC_TOKEN || process.env.GITHUB_TOKEN || "";
  if (gh.owner && gh.repo && repo !== self && token) {
    const url = `https://raw.githubusercontent.com/${gh.owner}/${gh.repo}/${gh.ref || "main"}/${relPath}`;
    try {
      const got = await fetchText(url, {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.raw",
        "User-Agent": "videyy-daily-sync",
      });
      if (got.ok && isJsonDocument(got.text)) return JSON.parse(got.text);
      console.log("github miss", relPath, got.status);
    } catch (err) {
      console.log("github fail", relPath, err instanceof Error ? err.message : err);
    }
  }
  if (config.upstream?.tryHttp && config.upstream.httpOrigin) {
    const url = `${String(config.upstream.httpOrigin).replace(/\/$/, "")}/${relPath}`;
    try {
      const got = await fetchText(url, { "User-Agent": "videyy-daily-sync", Accept: "application/json" });
      if (got.ok && isJsonDocument(got.text)) return JSON.parse(got.text);
      console.log("http miss", relPath, got.status);
    } catch (err) {
      console.log("http fail", relPath, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

/** Rows whose main-site watch page redirects (merged multi-server copy). Errors count as "not merged". */
async function mergedCopies(config, rows) {
  const origin = String(config.upstream?.httpOrigin || "").replace(/\/$/, "");
  if (!origin || !rows.length) return [];
  const kept = [];
  for (let i = 0; i < rows.length; i += 8) {
    const batch = rows.slice(i, i + 8);
    const codes = await Promise.all(
      batch.map(async (it) => {
        try {
          const res = await fetch(`${origin}/watch/${encodeURIComponent(String(it.id))}`, {
            method: "HEAD",
            redirect: "manual",
            headers: { "User-Agent": "videyy-daily-sync" },
            signal: AbortSignal.timeout(10000),
          });
          return res.status;
        } catch {
          return 0;
        }
      }),
    );
    batch.forEach((it, j) => {
      if (codes[j] === 301 || codes[j] === 308) kept.push(it);
    });
  }
  return kept;
}

/** HEAD /watch/<id> on the main site for each id (16 at a time): status + Location, 0 on error. */
async function watchStatuses(config, ids) {
  const origin = String(config.upstream?.httpOrigin || "").replace(/\/$/, "");
  if (!origin || !ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 16) {
    const batch = ids.slice(i, i + 16);
    out.push(
      ...(await Promise.all(
        batch.map(async (id) => {
          try {
            const res = await fetch(`${origin}/watch/${encodeURIComponent(id)}`, {
              method: "HEAD",
              redirect: "manual",
              headers: { "User-Agent": "videyy-daily-sync" },
              signal: AbortSignal.timeout(10000),
            });
            return { id, status: res.status, location: res.headers.get("location") || "" };
          } catch {
            return { id, status: 0, location: "" };
          }
        }),
      )),
    );
  }
  return out;
}

/**
 * Main-site merges / hides for bundled ids it no longer lists, kept under `upstream` in the
 * site config file (data/satelit-config.json, already committed by the sync job). The
 * Worker folds merged copies into their main page and leaves hidden/removed ids out. Only
 * unknown ids are checked, except on the daily run, which re-checks every missing id.
 */
async function refreshUpstreamMap(config, { localItems, syncedItems, upstreamItems, blockIds }) {
  const rel = config.siteConfigOutput;
  if (!upstreamItems.length || !rel) return;
  let file = {};
  try {
    file = readJson(rel);
  } catch {}
  const prev = file.upstream || { merged: {}, gone: [], unlisted: [] };
  const { missing, toCheck } = upstreamMapPlan({
    localIds: [...localItems, ...syncedItems].map((it) => String(it.id || "")),
    upstreamIds: upstreamItems.map((it) => String(it.id || "")),
    blockIds,
    prev,
    recheckAll: process.env.SYNC_TRIGGER === "daily",
  });
  const results = await watchStatuses(config, toCheck);
  const next = nextUpstreamMap(prev, missing, results);
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    console.log("upstream map unchanged", { missing: missing.length, checked: toCheck.length });
    return;
  }
  writeJson(rel, { ...file, upstream: next });
  console.log("upstream map", {
    missing: missing.length,
    checked: toCheck.length,
    merged: Object.keys(next.merged).length,
    gone: next.gone.length,
    unlisted: next.unlisted.length,
  });
}

function loadLocalItems(files) {
  const items = [];
  for (const rel of files) {
    if (rel.endsWith("catalog-blocklist.json")) continue;
    try {
      items.push(...itemsFromUnknown(readJson(rel)));
    } catch (err) {
      console.log("skip local", rel, err instanceof Error ? err.message : err);
    }
  }
  return items;
}

const HOSTS = { "videyy.icu": "videyy", "videqsss.icu": "videqsss" };

/** Per-site panel settings from /api/satelit/config.json, reduced to what the build needs. */
function siteSettingsFrom(remote) {
  const out = { blockedIds: [], sites: {} };
  if (!remote || typeof remote !== "object") return out;
  out.blockedIds = [...new Set((remote.blockedIds || []).map(String))].sort();
  for (const site of Array.isArray(remote.sites) ? remote.sites : []) {
    const id = HOSTS[site?.host];
    if (!id) continue;
    const ids = (list) => [...new Set((Array.isArray(list) ? list : []).map(String))].sort();
    out.sites[id] = {
      sync: site.sync !== false,
      skipIds: ids(site.skipIds),
      ...(Array.isArray(site.hiddenIds) && Array.isArray(site.uploadExcludeIds)
        ? { hiddenIds: ids(site.hiddenIds), uploadExcludeIds: ids(site.uploadExcludeIds) }
        : {}),
      syncRequestedAt: site.syncRequestedAt || null,
    };
  }
  return out;
}

function readStatus(rel) {
  try {
    return readJson(rel);
  } catch {
    return {};
  }
}

/** Poll mode (frequent cron): only sync when the /pemilik "Sync sekarang" request is newer than the last sync. */
function pendingRequest(settings, status) {
  const last = Date.parse(String(status?.syncedAt || "")) || 0;
  return Object.entries(settings.sites).some(([, s]) => (Date.parse(String(s.syncRequestedAt || "")) || 0) > last);
}

async function main() {
  let config = readJson("data/videyy-sync.config.json");
  const statusRel = config.statusOutput || "public/sync-status.json";
  let siteSettings = null;
  if (config.siteConfigUrl) {
    try {
      const got = await fetchText(config.siteConfigUrl, { "User-Agent": "videyy-daily-sync", Accept: "application/json" });
      if (got.ok && isJsonDocument(got.text)) siteSettings = siteSettingsFrom(JSON.parse(got.text));
      else console.log("site config miss", got.status);
    } catch (err) {
      console.log("site config fail", err instanceof Error ? err.message : err);
    }
  }
  if (process.env.SYNC_MODE === "poll") {
    if (!siteSettings || !pendingRequest(siteSettings, readStatus(statusRel))) {
      console.log("poll: no pending sync request");
      return;
    }
    console.log("poll: pending /pemilik sync request, syncing now");
  }
  if (config.remoteConfigUrl) {
    try {
      const got = await fetchText(config.remoteConfigUrl, { "User-Agent": "videyy-daily-sync", Accept: "application/json" });
      if (got.ok && isJsonDocument(got.text)) config = applyConfigOverlay(config, JSON.parse(got.text));
    } catch (err) {
      console.log("remote config skipped", err instanceof Error ? err.message : err);
    }
  }
  if (config.enabled === false) {
    console.log("sync disabled by config");
    return;
  }
  const files = config.upstream?.files || [];
  // Bundled copies to dedupe against; `files` are the upstream paths (koleksidrpinguin.com
  // /api/satelit/catalog.json — the main repo is private, so its raw files are unreachable here).
  const localItems = loadLocalItems(config.upstream?.localFiles || files);
  const upstreamItems = [];
  let upstreamBlock = null;
  for (const rel of files) {
    const data = await pullJson(config, rel);
    if (!data) continue;
    if (rel.endsWith("catalog-blocklist.json")) upstreamBlock = data;
    else upstreamItems.push(...itemsFromUnknown(data));
  }
  const localBlock = readJson(config.blocklist || "src/lib/catalog/catalog-blocklist.json");
  const extra = extraBlockIds(localBlock, upstreamBlock);
  if (extra.length) {
    const merged = mergeBlocklist(localBlock, extra);
    writeJson(config.blocklist || "src/lib/catalog/catalog-blocklist.json", merged.block);
    console.log("blocklist added", merged.added);
  }
  if (siteSettings && config.siteConfigOutput) {
    // Keep the owner's per-site hide/exclude lists (no request stamps, so the file only changes with them).
    const byId = new Map([...localItems, ...upstreamItems].map((it) => [String(it.id), it]));
    const upstream = (() => {
      try {
        return readJson(config.siteConfigOutput).upstream;
      } catch {
        return undefined;
      }
    })();
    const keep = {
      blockedIds: siteSettings.blockedIds,
      sites: Object.fromEntries(
        Object.entries(siteSettings.sites).map(([id, s]) => [id, { sync: s.sync, skipIds: effectiveSkipIds(id, s, byId) }]),
      ),
      ...(upstream ? { upstream } : {}),
    };
    writeJson(config.siteConfigOutput, keep);
  }
  const blockIds = idsFromBlock(extra.length ? mergeBlocklist(localBlock, extra).block : localBlock);
  if (siteSettings?.sites?.videqsss?.sync !== false) {
    const panelFeeds = (config.upstream?.localFiles || files).filter(rel => /videos-latest/.test(rel) && !rel.endsWith("-index.json"));
    await syncVideqsss(config, [...blockIds, ...(config.excludeIds || []), ...(siteSettings?.blockedIds || [])], loadLocalItems(panelFeeds));
  }
  const plan = planSync({ localItems, upstreamItems, blockIds, config });
  const output = config.output || "data/synced-catalog.json";
  const prev = (() => {
    try {
      return readJson(output);
    } catch {
      return { items: [] };
    }
  })();
  // Keep rows the main site merged into another id (its /watch/<id> answers 301): their watch
  // pages here stay up (already indexed/shared). Rows hidden or removed there (404/410) are dropped.
  if (upstreamItems.length && !plan.skipped) {
    const dropped = droppedSinceLast({ prevItems: itemsFromUnknown(prev), nextItems: plan.items, localItems, blockIds });
    const kept = await mergedCopies(config, dropped);
    if (kept.length) {
      plan.items = withRetained(plan.items, kept);
      console.log("kept merged copies", kept.length, "of", dropped.length, "dropped upstream");
    }
  }
  await refreshUpstreamMap(config, { localItems, syncedItems: plan.items, upstreamItems, blockIds });
  const prevKey = JSON.stringify(itemsFromUnknown(prev));
  const nextKey = JSON.stringify(plan.items);
  const prevIds = new Set(itemsFromUnknown(prev).map((it) => String(it.id)));
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
  const status = (changed) => ({
    syncedAt: new Date().toISOString(),
    trigger: process.env.SYNC_TRIGGER || "manual",
    upstream: upstreamItems.length,
    added: changed ? plan.items.filter((it) => !prevIds.has(String(it.id))).length : 0,
    snapshotItems: changed ? plan.items.length : itemsFromUnknown(prev).length,
    ok: upstreamItems.length > 0,
    runUrl,
  });
  if (plan.skipped || prevKey === nextKey) {
    console.log("no snapshot change", { local: localItems.length, upstream: upstreamItems.length, added: plan.added, dropped: plan.dropped });
    writeJson(statusRel, status(false));
    return;
  }
  writeJson(output, {
    syncedAt: new Date().toISOString(),
    source: upstreamItems.length ? "upstream" : "bundled",
    added: plan.added,
    items: plan.items,
  });
  writeJson(statusRel, status(true));
  console.log("wrote", output, "added", plan.added, "dropped", plan.dropped);
}

const FOLDER_UA =
  "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

function isChallenge(text) {
  return /just a moment|cf-browser-verification|attention required/i.test(String(text || "").slice(0, 800));
}

/** All pages of the configured folder. null = unread (keep the previous import). */
async function crawlFolder(folder) {
  const items = [];
  const seen = new Set();
  let empty = 0;
  const date = new Date().toISOString().slice(0, 10);
  for (let page = 1; page <= 200; page++) {
    const url = folderPageUrl(folder, page);
    let got;
    try {
      got = await fetchText(url, { "User-Agent": FOLDER_UA, Accept: "text/html" });
    } catch (err) {
      console.log("videqsss folder fail", url, err instanceof Error ? err.message : err);
      return null;
    }
    if (got.status === 404) {
      empty++;
      if (empty >= 2) break;
      continue;
    }
    if (!got.ok || isChallenge(got.text)) {
      console.log("videqsss folder unread", url, got.status);
      return null;
    }
    const rows = parseFolderCatalog(got.text, folder, date);
    if (!rows.length) {
      empty++;
      if (empty >= 2) break;
    } else {
      empty = 0;
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        items.push(row);
      }
    }
  }
  return items;
}

async function syncVideqsss(config, blockIds, panelItems) {
  const rule = config.sites?.videqsss;
  if (!rule || rule.enabled === false) {
    console.log("videqsss catalog skipped");
    return;
  }
  const output = "data/videqsss-catalog.json";
  const previous = (() => {
    try {
      return readJson(output);
    } catch {
      return { folderUrl: "", importedAt: null, items: [] };
    }
  })();
  const folderUrl = String(rule.folderUrl || "").trim();
  const parsed = parseFolderUrl(folderUrl);
  const same = Boolean(parsed && previous.importedAt && previous.folderUrl === folderUrl);
  let folderItems = null;
  if (parsed && !same) {
    console.log("videqsss folder import", folderUrl);
    folderItems = await crawlFolder(parsed);
  } else if (!parsed && folderUrl) {
    console.log("videqsss folderUrl ignored (want https://<indoav|userbokep>/f/<id>)");
  }
  const next = planVideqsssCatalog({
    previous,
    folderItems,
    panelItems,
    blockIds,
    config,
    now: new Date().toISOString(),
  });
  const prevKey = JSON.stringify({ folderUrl: previous.folderUrl || "", importedAt: previous.importedAt || null, items: itemsFromUnknown(previous) });
  const nextKey = JSON.stringify({ folderUrl: next.folderUrl || "", importedAt: next.importedAt || null, items: next.items });
  if (prevKey === nextKey) {
    console.log("videqsss catalog unchanged", { items: next.items.length, crawled: next.crawled });
    return;
  }
  writeJson(output, { folderUrl: next.folderUrl, importedAt: next.importedAt, items: next.items });
  console.log("wrote", output, "items", next.items.length, "crawled", next.crawled);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
