import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXO_ZONE_VIDEQSSS,
  EXO_ZONE_VIDEYY,
  EXO_ZONES_VIDEQSSS,
  EXO_ZONES_VIDEYY,
  GRID_SLOTS,
  MAX_GRID_ADS,
  adPositions,
  gridAdsOn,
  gridSlot,
  planGrid,
  slotsForHost,
  type GridCell,
  type GridSlot,
} from "./grid-ads.ts";

type AdCell = Extract<GridCell, { kind: "ad" }>;
const ads = (cells: GridCell[], bp?: "mobile" | "desktop") =>
  cells.filter((c): c is AdCell => c.kind === "ad" && (!bp || c.breakpoint === bp));

const FULL: GridSlot[] = [
  { network: "exoclick", zoneId: "e1" },
  { network: "trafficstars", zoneId: "t1" },
  { network: "wynq", zoneId: "w1" },
  { network: "exoclick", zoneId: "e2" },
  { network: "trafficstars", zoneId: "t2" },
  { network: "wynq", zoneId: "w2" },
];

test("at most 6 ad slots per breakpoint, slotIndex 0..5 in order", () => {
  for (const n of [24, 30, 36, 60, 200]) {
    const cells = planGrid(n, true, FULL, true);
    for (const bp of ["mobile", "desktop"] as const) {
      const list = ads(cells, bp);
      assert.ok(list.length <= MAX_GRID_ADS, `${bp} ${n}: ${list.length}`);
      assert.deepEqual(list.map((c) => c.slotIndex), list.map((_, i) => i));
    }
  }
  assert.equal(ads(planGrid(200, true, FULL, true), "mobile").length, 6);
  assert.equal(ads(planGrid(200, true, FULL, true), "desktop").length, 6);
});

test("keeps position rules on a full page: phone after every 4th video, laptop after 2, 7, 12 ...", () => {
  const cells = planGrid(36, true, FULL, true);
  const prevVideo = (i: number) => {
    for (let j = i - 1; j >= 0; j--) if (cells[j].kind === "video") return (cells[j] as { index: number }).index + 1;
    return -1;
  };
  const m = cells.flatMap((c, i) => (c.kind === "ad" && c.breakpoint === "mobile" ? [prevVideo(i)] : []));
  const d = cells.flatMap((c, i) => (c.kind === "ad" && c.breakpoint === "desktop" ? [prevVideo(i)] : []));
  assert.deepEqual(m, [4, 8, 12, 16, 20, 24]);
  assert.deepEqual(d, [2, 7, 12, 17, 22, 27]);
});

test("every page with videos and 6 filled slots gets exactly 6 banners per breakpoint", () => {
  for (const n of [1, 8, 12, 16, 24, 30, 36]) {
    for (const [slots, wynq] of [
      [slotsForHost("videyy"), false],
      [slotsForHost("videqsss"), false],
      [FULL, true],
    ] as const) {
      const cells = planGrid(n, true, slots, wynq);
      for (const bp of ["mobile", "desktop"] as const) {
        assert.equal(ads(cells, bp).length, 6, `${bp} n=${n}`);
        assert.deepEqual(adPositions(n, bp).length, 6);
      }
    }
  }
  assert.deepEqual(adPositions(0, "mobile"), []);
  assert.equal(ads(planGrid(0, true, FULL, true)).length, 0);
});

test("no zone ID appears twice in one view (per breakpoint)", () => {
  for (const [slots, wynq] of [[GRID_SLOTS, false], [slotsForHost("videqsss"), false], [FULL, true]] as const) {
    for (const n of [1, 8, 12, 24, 30, 36, 100]) {
      const cells = planGrid(n, true, slots, wynq);
      for (const bp of ["mobile", "desktop"] as const) {
        const ids = ads(cells, bp).map((c) => c.slot.zoneId);
        assert.equal(new Set(ids).size, ids.length, `${bp} ${n}: ${ids.join(",")}`);
      }
    }
  }
});

test("each satellite fills all 6 slots with distinct ExoClick 300x250 zones", () => {
  const videyy = slotsForHost("videyy");
  const videq = slotsForHost("videqsss");
  assert.deepEqual(videyy.map((s) => [s.network, s.zoneId]), EXO_ZONES_VIDEYY.map((z) => ["exoclick", z]));
  assert.deepEqual(videq.map((s) => [s.network, s.zoneId]), EXO_ZONES_VIDEQSSS.map((z) => ["exoclick", z]));
  assert.equal(EXO_ZONE_VIDEYY, "6088478");
  assert.equal(EXO_ZONE_VIDEQSSS, "6088488");
  assert.deepEqual([...EXO_ZONES_VIDEYY], ["6088478", "6111326", "6111330", "6111332", "6111334", "6111336"]);
  assert.deepEqual([...EXO_ZONES_VIDEQSSS], ["6088488", "6111338", "6111340", "6111342", "6111344", "6111346"]);
  assert.equal(new Set(EXO_ZONES_VIDEYY).size, 6);
  assert.equal(new Set(EXO_ZONES_VIDEQSSS).size, 6);
  // Zones are not shared across the two satellites or with the main site.
  const MAIN = ["6053864", "6111252"];
  const all = [...EXO_ZONES_VIDEYY, ...EXO_ZONES_VIDEQSSS];
  assert.equal(new Set(all).size, 12);
  for (const z of MAIN) assert.ok(!all.includes(z));
  for (const slots of [videyy, videq]) {
    const cells = planGrid(24, true, slots, false);
    for (const bp of ["mobile", "desktop"] as const) {
      assert.deepEqual(
        ads(cells, bp).map((c) => [c.slotIndex, c.slot.network, c.slot.zoneId]),
        slots.map((s, i) => [i, "exoclick", s.zoneId]),
      );
    }
    assert.equal(gridAdsOn(slots, false), true);
    assert.ok(gridSlot(5, slots));
  }
});

test("empty slot renders nothing and never borrows another zone; videos are never displaced", () => {
  const sparse: GridSlot[] = FULL.map((s, i) => (i === 2 || i === 4 ? { ...s, zoneId: "" } : s));
  const cells = planGrid(36, true, sparse, true);
  assert.deepEqual(ads(cells, "desktop").map((c) => [c.slotIndex, c.slot.zoneId]), [[0, "e1"], [1, "t1"], [3, "e2"], [5, "w2"]]);
  assert.deepEqual(ads(cells, "mobile").map((c) => c.slotIndex), [0, 1, 3, 5]);
  assert.deepEqual(cells.filter((c) => c.kind === "video").map((c) => (c as { index: number }).index), [...Array(36).keys()]);
  assert.equal(gridSlot(2, sparse, true), null);
  assert.equal(gridSlot(6), null);
  assert.equal(gridSlot(2, FULL, false), null);
  assert.deepEqual(gridSlot(2, FULL, true), { network: "wynq", zoneId: "w1" });
});

test("no ads when showAds is false", () => {
  assert.equal(ads(planGrid(30, false, FULL, true)).length, 0);
});
