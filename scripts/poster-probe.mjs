/**
 * HEAD poster URLs and cache the result in data/poster-probe.json.
 * Confirmed ids are not requested again. Unknown and previously failed ids are.
 * Usage:
 *   node scripts/poster-probe.mjs
 *   node scripts/poster-probe.mjs --bucket-list /tmp/poster-ok-ids.txt
 * --bucket-list marks those ids ok (a full R2 listing) and every other catalog id miss,
 * without HEAD. The daily sync runs without the flag.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { applyProbe, emptyProbe, normalizeProbe, planChecks, posterKeyOf, probeHeads } from "./lib/poster-probe.mjs";

const require = createRequire(import.meta.url);
const { loadAll } = require("./lib/latest-chunks.cjs");

const OUT = "data/poster-probe.json";
const DAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const CONCURRENCY = Math.max(1, Number(process.env.POSTER_PROBE_CONCURRENCY || 16));

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return undefined;
  }
}

function listOf(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.items)) return v.items;
  return [];
}

function collectIds() {
  const ids = [];
  const seen = new Set();
  const add = (id) => {
    const key = posterKeyOf(id);
    if (!key || key.length < 3 || seen.has(key)) return;
    seen.add(key);
    ids.push(key);
  };
  for (const base of ["videos-latest", "putarin-latest"]) {
    for (const it of loadAll(base)) add(it && it.id);
  }
  const skip = /^(videos-latest|putarin-latest)(-p\d+|-index)?\.json$/;
  for (const f of fs.readdirSync("data").filter((f) => f.endsWith(".json") && !skip.test(f) && f !== "poster-probe.json")) {
    for (const it of listOf(readJson(path.join("data", f)))) add(it && it.id);
  }
  for (const f of fs.readdirSync("src/lib/catalog").filter((f) => f.endsWith(".json"))) {
    for (const it of listOf(readJson(path.join("src/lib/catalog", f)))) add(it && it.id);
  }
  return ids;
}

function probeSignature(probe) {
  return JSON.stringify({ ok: probe.ok, miss: probe.miss });
}

function writeProbe(probe) {
  probe.at = new Date().toISOString();
  const body = JSON.stringify({ v: 1, at: probe.at, ok: probe.ok, miss: probe.miss });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, body + "\n");
}

function seedFromBucketList(file, ids) {
  const probe = emptyProbe();
  const listed = new Set();
  for (const line of fs.readFileSync(file, "utf8").split(/\s+/)) {
    const key = posterKeyOf(line);
    if (!key) continue;
    listed.add(key);
    applyProbe(probe, key, "ok", DAY);
  }
  let miss = 0;
  for (const id of ids) {
    if (listed.has(id)) continue;
    applyProbe(probe, id, "miss", DAY);
    miss++;
  }
  writeProbe(probe);
  console.log(`poster-probe: seeded ok=${listed.size} catalog-miss=${miss} from ${file}`);
}

const bucketArg = process.argv.indexOf("--bucket-list");
const ids = collectIds();
if (bucketArg !== -1) {
  const file = process.argv[bucketArg + 1];
  if (!file) {
    console.error("poster-probe: --bucket-list needs a file of ids");
    process.exit(1);
  }
  seedFromBucketList(file, ids);
  process.exit(0);
}

const probe = normalizeProbe(readJson(OUT));
const before = probeSignature(probe);
const todo = planChecks(ids, probe);
console.log(`poster-probe: catalog=${ids.length} known-ok=${Object.keys(probe.ok).length} to-check=${todo.length}`);
if (!todo.length) {
  console.log("poster-probe: nothing to check");
  process.exit(0);
}

let blocklist = {};
try {
  blocklist = JSON.parse(fs.readFileSync("src/lib/image-blocklist.json", "utf8")).md5 || {};
} catch {
  blocklist = {};
}

const result = await probeHeads(todo, {
  probe,
  day: DAY,
  concurrency: CONCURRENCY,
  fetchImpl: globalThis.fetch,
  placeholderMd5: blocklist,
});
console.log(
  `poster-probe: checked=${result.checked} ok=${result.ok} miss=${result.miss} skipped=${result.skipped} challenged=${result.challenged}`,
);
if (result.checked === 0 || probeSignature(probe) === before) {
  console.log("poster-probe: cache unchanged");
  process.exit(0);
}
writeProbe(probe);
if (result.challenged) {
  console.log("poster-probe: stopped on a Cloudflare challenge; unchecked ids stay unknown");
}
