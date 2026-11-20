import assert from "node:assert/strict";
import test from "node:test";
import {
  applyConfigOverlay,
  extraBlockIds,
  idsFromBlock,
  isJsonDocument,
  itemsFromUnknown,
  mergeBlocklist,
  planSync,
} from "./lib/videyy-sync.mjs";

const local = [
  { id: "a", title: "Ada", source: "IndoAV", date: "2026-11-01" },
  { id: "blocked-local", title: "Jangan", source: "Videy" },
];
const upstream = [
  { id: "a", title: "Ada", source: "IndoAV" },
  { id: "new-1", title: "Baru", source: "UserBokep", embed: "https://userbokep.example/x" },
  { id: "blocked-up", title: "Hapus", source: "Videy" },
  { id: "skip-src", title: "Lewat", source: "Streamtape" },
];

test("snapshot keeps only new, unblocked videos", () => {
  const plan = planSync({
    localItems: local,
    upstreamItems: upstream,
    blockIds: ["blocked-up"],
    config: { enabled: true, excludeIds: [], excludeSources: ["streamtape"] },
  });
  assert.equal(plan.skipped, false);
  assert.deepEqual(plan.items.map((item) => item.id), ["new-1"]);
  assert.equal(plan.dropped, 2);
});

test("disabled config writes nothing", () => {
  const plan = planSync({
    localItems: local,
    upstreamItems: upstream,
    blockIds: [],
    config: { enabled: false },
  });
  assert.equal(plan.skipped, true);
  assert.deepEqual(plan.items, []);
});

test("upstream blocklist ids merge into the bundled file shape", () => {
  const localBlock = { ids: { old: { at: 1 } } };
  const extra = extraBlockIds(localBlock, { ids: { old: {}, fresh: { at: 2 } } });
  assert.deepEqual(extra, ["fresh"]);
  const merged = mergeBlocklist(localBlock, extra, 10);
  assert.equal(merged.added, 1);
  assert.equal(idsFromBlock(merged.block).includes("fresh"), true);
  assert.equal(idsFromBlock(merged.block).includes("old"), true);
});

test("overlay from a later panel only changes the toggles", () => {
  const next = applyConfigOverlay(
    { enabled: true, mix: "newest", excludeIds: [], upstream: { tryHttp: true, github: { repo: "vidy" } } },
    { enabled: false, mix: "shuffled", excludeIds: ["x"], tryHttp: false, ignored: 1 },
  );
  assert.equal(next.enabled, false);
  assert.equal(next.mix, "shuffled");
  assert.deepEqual(next.excludeIds, ["x"]);
  assert.equal(next.upstream.tryHttp, false);
  assert.equal(next.upstream.github.repo, "vidy");
  assert.equal("ignored" in next, false);
});

test("challenge HTML is not a catalog", () => {
  assert.equal(isJsonDocument("<!DOCTYPE html><title>Just a moment"), false);
  assert.equal(isJsonDocument('[{"id":"a"}]'), true);
  assert.deepEqual(itemsFromUnknown({ items: [{ id: "a" }, { title: "nope" }] }).map((row) => row.id), ["a"]);
});

import { droppedSinceLast, withRetained } from "./lib/videyy-sync.mjs";

test("rows that left upstream are candidates unless blocked or now bundled", () => {
  const prevItems = [{ id: "keep-me" }, { id: "still-up" }, { id: "blocked" }, { id: "now-local" }];
  const got = droppedSinceLast({
    prevItems,
    nextItems: [{ id: "still-up" }],
    localItems: [{ id: "now-local" }],
    blockIds: ["blocked"],
  });
  assert.deepEqual(got.map((it) => it.id), ["keep-me"]);
});

test("retained merged copies go after the new rows, once", () => {
  const out = withRetained([{ id: "n1" }], [{ id: "m1" }, { id: "n1" }, { id: "m1" }]);
  assert.deepEqual(out.map((it) => it.id), ["n1", "m1"]);
});
