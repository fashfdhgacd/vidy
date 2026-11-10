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
  extraBlockIds,
  idsFromBlock,
  isJsonDocument,
  itemsFromUnknown,
  mergeBlocklist,
  planSync,
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
  const prevKey = JSON.stringify(itemsFromUnknown(prev));
  const nextKey = JSON.stringify(plan.items);
  if (plan.skipped || prevKey === nextKey) {
    console.log("no snapshot change", { local: localItems.length, upstream: upstreamItems.length, added: plan.added, dropped: plan.dropped });
    return;
  }
  writeJson(output, {
    syncedAt: new Date().toISOString(),
    source: upstreamItems.length ? "upstream" : "bundled",
    added: plan.added,
    items: plan.items,
  });
  console.log("wrote", output, "added", plan.added, "dropped", plan.dropped);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
