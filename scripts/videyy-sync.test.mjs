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

test("upstream map: classify missing ids, keep old answers on errors, drop ids back in export", async () => {
  const { upstreamMapPlan, nextUpstreamMap, watchIdFromLocation } = await import("./lib/videyy-sync.mjs");
  assert.equal(watchIdFromLocation("https://koleksidrpinguin.com/watch/by-abc123"), "by-abc123");
  assert.equal(watchIdFromLocation("/"), "");
  const prev = { merged: { old1: "m1" }, gone: ["g1"], unlisted: [] };
  const plan = upstreamMapPlan({ localIds: ["old1", "g1", "n1", "n2", "n3", "up1", "b1"], upstreamIds: ["up1"], blockIds: ["b1"], prev, recheckAll: false });
  assert.deepEqual(plan.missing, ["old1", "g1", "n1", "n2", "n3"]);
  assert.deepEqual(plan.toCheck, ["n1", "n2", "n3"]);
  const next = nextUpstreamMap(prev, plan.missing, [
    { id: "n1", status: 301, location: "https://koleksidrpinguin.com/watch/m22" },
    { id: "n2", status: 302, location: "https://koleksidrpinguin.com/" },
    { id: "n3", status: 0, location: "" },
  ]);
  assert.deepEqual(next, { merged: { n1: "m22", old1: "m1" }, gone: ["g1", "n2"], unlisted: [] });
  const all = upstreamMapPlan({ localIds: ["old1", "g1"], upstreamIds: ["g1"], blockIds: [], prev, recheckAll: true });
  assert.deepEqual(all.toCheck, ["old1"]);
  assert.deepEqual(nextUpstreamMap(prev, all.missing, [{ id: "old1", status: 200 }]), { merged: {}, gone: [], unlisted: ["old1"] });
});

test("effectiveSkipIds: videqsss ignores automatic host excludes, keeps hides and IndoAV choices", async () => {
  const { effectiveSkipIds } = await import("./lib/videyy-sync.mjs");
  const byId = new Map([
    ["by-1", { id: "by-1", source: "Byse", embed: "https://bysejikuar.com/e/1" }],
    ["ia-1", { id: "ia-1", source: "IndoAV", embed: "https://tv1.indoav.app/e/1" }],
  ]);
  const site = { skipIds: ["by-1", "ia-1", "h1", "zz"], hiddenIds: ["h1"], uploadExcludeIds: ["by-1", "ia-1", "zz"] };
  assert.deepEqual(effectiveSkipIds("videqsss", site, byId), ["h1", "ia-1", "zz"]);
  assert.deepEqual(effectiveSkipIds("videyy", site, byId), ["by-1", "h1", "ia-1", "zz"]);
  assert.deepEqual(effectiveSkipIds("videqsss", { skipIds: ["by-1"] }, byId), ["by-1"]);
});

test("overlay can set the videqsss folder link without touching other sites", () => {
  const next = applyConfigOverlay(
    { enabled: true, sites: { videyy: { sources: "all" }, videqsss: { sources: ["indoav", "userbokep"], folderUrl: "" } }, upstream: {} },
    { sites: { videqsss: { folderUrl: "https://tv1.indoav.app/f/AbC123", ignored: true } } },
  );
  assert.equal(next.sites.videqsss.folderUrl, "https://tv1.indoav.app/f/AbC123");
  assert.equal(next.sites.videqsss.sources[0], "indoav");
  assert.equal(next.sites.videyy.sources, "all");
  assert.equal("ignored" in next.sites.videqsss, false);
});

