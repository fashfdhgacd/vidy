/**
 * Once-a-day catalog sync. Runs in GitHub Actions, never inside a visitor request.
 *
 * Reads data/videyy-sync.config.json (and an optional remote/KV overlay).
 * Pulls koleksidrpinguin.com catalog files when they answer JSON, drops the blocklist,
 * and writes only the new rows to data/synced-catalog.json. The Worker bundles that file.
 *
 * videqsss also gets data/videqsss-catalog.json: a one-time import of
 * sites.videqsss.folderUrl (empty until the owner sets it) plus later rows from
 * the pemilik upload feeds. No fetch happens when folderUrl is empty.
 */
import fs from "node:fs";
import path from "node:path";
import {
  applyConfigOverlay,
  extraBlockIds,
  idsFromBlock,
  isJsonDocument,
  itemsFromUnknown,
  mergeBlocklist,
  planSync,
} from "./lib/videyy-sync.mjs";
import { folderPageUrl, parseFolderCatalog, parseFolderUrl, planVideqsssCatalog } from "./lib/videqsss-catalog.mjs";

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

async function main() {
  let config = readJson("data/videyy-sync.config.json");
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
  const localItems = loadLocalItems(files);
  const upstreamItems = [];
  const panelItems = [];
  let upstreamBlock = null;
  for (const rel of files) {
    const data = await pullJson(config, rel);
    const panelFeed = /videos-latest/i.test(rel) && !rel.endsWith("-index.json");
    if (panelFeed) {
      let doc = data;
      if (!doc) {
        try {
          doc = readJson(rel);
        } catch {
          doc = null;
        }
      }
      panelItems.push(...itemsFromUnknown(doc));
    }
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
  const prevKey = JSON.stringify(itemsFromUnknown(prev));
  const nextKey = JSON.stringify(plan.items);
  if (plan.skipped || prevKey === nextKey) {
    console.log("no snapshot change", { local: localItems.length, upstream: upstreamItems.length, added: plan.added, dropped: plan.dropped });
  } else {
    writeJson(output, {
      syncedAt: new Date().toISOString(),
      source: upstreamItems.length ? "upstream" : "bundled",
      added: plan.added,
      items: plan.items,
    });
    console.log("wrote", output, "added", plan.added, "dropped", plan.dropped);
  }
  await syncVideqsss(config, blockIds, panelItems);
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
