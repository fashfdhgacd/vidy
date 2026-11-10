import assert from "node:assert/strict";
import test from "node:test";
import { noteSkipPop, readSkipCounts, skipPopCount, skipPopOpen, VIDEY_SKIP_POP_MAX } from "./videy-skip-pop.ts";

test("each Videy id gets 3 skip pops, and another id is untouched", () => {
  let counts = readSkipCounts(null);
  assert.equal(skipPopOpen(counts, "videy-a"), true);
  counts = noteSkipPop(counts, "videy-a");
  counts = noteSkipPop(counts, "videy-a");
  counts = noteSkipPop(counts, "videy-a");
  assert.equal(skipPopOpen(counts, "videy-a"), false);
  assert.equal(skipPopCount(counts, "videy-a"), VIDEY_SKIP_POP_MAX);
  assert.equal(skipPopOpen(counts, "videy-b"), true);
  assert.deepEqual(readSkipCounts(JSON.stringify(counts)), counts);
});

test("a bad stored count does not open extra pops", () => {
  assert.deepEqual(readSkipCounts("nope"), {});
  assert.deepEqual(readSkipCounts(JSON.stringify({ ok: 1, bad: -1, x: "2" })), { ok: 1 });
});
