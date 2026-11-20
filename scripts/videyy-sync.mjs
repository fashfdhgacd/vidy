/**
 * Once-a-day catalog sync. Runs in GitHub Actions, never inside a visitor request.
 *
 * Reads data/videyy-sync.config.json (and an optional remote/KV overlay).
 * Pulls koleksidrpinguin.com catalog files when they answer JSON, drops the blocklist,
 * and writes only the new rows to data/synced-catalog.json. The Worker bundles that file.
 */
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
  planSync,
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
    out.sites[id] = {
      sync: site.sync !== false,
      skipIds: [...new Set((site.skipIds || []).map(String))].sort(),
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
  if (siteSettings && config.siteConfigOutput) {
    // Keep the owner's per-site hide/exclude lists (no request stamps, so the file only changes with them).
    const keep = {
      blockedIds: siteSettings.blockedIds,
      sites: Object.fromEntries(Object.entries(siteSettings.sites).map(([id, s]) => [id, { sync: s.sync, skipIds: s.skipIds }])),
    };
    writeJson(config.siteConfigOutput, keep);
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
  const blockIds = idsFromBlock(extra.length ? mergeBlocklist(localBlock, extra).block : localBlock);
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
