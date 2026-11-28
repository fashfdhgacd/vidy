import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXO_ZONE_VIDEQSSS,
  EXO_ZONE_VIDEYY,
  EXO_ZONES_VIDEQSSS,
  EXO_ZONES_VIDEYY,
  GRID_COLS,
  GRID_SLOTS,
  MAX_GRID_ADS,
  adPositions,
  gridAdsOn,
  gridSlot,
  planGrid,
  slotsForHost,
  visibleCells,
  type GridCell,
  type GridSlot,
} from "./grid-ads.ts";

type AdCell = Extract<GridCell, { kind: "ad" }>;
const BPS = ["mobile", "desktop"] as const;
const ads = (cells: GridCell[], bp?: "mobile" | "desktop") =>
  cells.filter((c): c is AdCell => c.kind === "ad" && (!bp || c.breakpoint === bp));

const FULL: GridSlot[] = [
  { network: "exoclick", zoneId: "e1" },
  { network: "trafficstars", zoneId: "t1" },
  { network: "trafficstars", zoneId: "t2" },
  { network: "exoclick", zoneId: "e2" },
  { network: "trafficstars", zoneId: "t2" },
  { network: "trafficstars", zoneId: "t1" },
];
const SATELLITES = [slotsForHost("videyy"), slotsForHost("videqsss")] as const;

// Page sizes in use: catalog 30-36, landing / en 24, home = a page minus hero cards, last pages 1 up.
const COUNTS = Array.from({ length: 48 }, (_, i) => i + 1);

test("laptop grid is 3 columns and phone 1 column, same as the main site", () => {
  assert.deepEqual(GRID_COLS, { mobile: 1, desktop: 3 });
});

test("every page shows exactly 6 ad cells per breakpoint, slotIndex 0..5 in order", () => {
  for (const slots of SATELLITES) {
    for (const n of COUNTS) {
      const cells = planGrid(n, true, slots);
      for (const bp of BPS) {
        const list = ads(cells, bp);
        assert.equal(list.length, MAX_GRID_ADS, `${bp} n=${n}`);
        assert.deepEqual(list.map((c) => c.slotIndex), [0, 1, 2, 3, 4, 5]);
      }
    }
  }
});

test("rows are full (laptop cells % 3 == 0 for 3+ videos), tiny last pages keep their videos", () => {
  for (const n of COUNTS) {
    const cells = planGrid(n, true);
    if (n >= 3) assert.equal(visibleCells(cells, "desktop").length % 3, 0, `desktop n=${n}`);
    assert.ok(visibleCells(cells, "desktop").filter((c) => c.kind === "video").length >= Math.min(n, 3), `videos n=${n}`);
    // never trims more than 2 videos, and only from the end
    const hiddenDesk = cells.filter((c) => c.kind === "video" && c.hidden.desktop).map((c) => (c as { index: number }).index);
    assert.ok(hiddenDesk.length <= 2);
    assert.deepEqual(hiddenDesk, hiddenDesk.length ? Array.from({ length: hiddenDesk.length }, (_, i) => n - hiddenDesk.length + i) : []);
    assert.equal(cells.filter((c) => c.kind === "video" && c.hidden.mobile).length, 0);
    assert.equal(cells.filter((c) => c.kind === "video").length, n, "every video is in the DOM once");
  }
  // 30 videos + 6 ads = 12 full rows, nothing trimmed; landing page 24 + 6 = 30
  assert.equal(visibleCells(planGrid(30, true), "desktop").length, 36);
  assert.equal(visibleCells(planGrid(24, true), "desktop").length, 30);
});

test("full pages keep the usual positions (phone after every 4th video, laptop after 2, 7, 12 ...)", () => {
  assert.deepEqual(adPositions(30, "mobile"), [4, 8, 12, 16, 20, 24]);
  assert.deepEqual(adPositions(30, "desktop"), [2, 7, 12, 17, 22, 27]);
  assert.deepEqual(adPositions(36, "desktop"), [2, 7, 12, 17, 22, 27]);
  assert.deepEqual(adPositions(24, "mobile"), [4, 8, 12, 16, 20, 24]);
  assert.deepEqual(adPositions(24, "desktop"), [2, 6, 10, 14, 18, 22]);
  assert.deepEqual(adPositions(0, "mobile"), []);
  for (const n of COUNTS) for (const bp of BPS) {
    const p = adPositions(n, bp);
    assert.equal(p.length, 6);
    assert.ok(p.every((x, i) => x >= 1 && x <= n && (i === 0 || x >= p[i - 1])), `${bp} n=${n}: ${p}`);
  }
});

test("on a full page every laptop banner sits in column 3 (rows 1, 3, 5, ...)", () => {
  const cells = visibleCells(planGrid(30, true), "desktop");
  const cols = cells.flatMap((c, i) => (c.kind === "ad" ? [(i % 3) + 1] : []));
  assert.deepEqual(cols, [3, 3, 3, 3, 3, 3]);
});

test("no zone ID appears twice in one view (per breakpoint)", () => {
  for (const slots of [...SATELLITES, GRID_SLOTS]) {
    for (const n of [1, 8, 12, 24, 30, 36, 100]) {
      const cells = planGrid(n, true, slots);
      for (const bp of BPS) {
        const ids = ads(cells, bp).map((c) => c.slot.zoneId);
        assert.equal(new Set(ids).size, ids.length, `${bp} ${n}: ${ids.join(",")}`);
      }
      const keys = ads(cells).map((c) => c.key);
      assert.equal(new Set(keys).size, keys.length);
    }
  }
});

test("each satellite fills all 6 slots with distinct ExoClick 300x250 zones (no TrafficStars, no Wynq)", () => {
  const [videyy, videq] = SATELLITES;
  assert.deepEqual(videyy.map((s) => [s.network, s.zoneId]), EXO_ZONES_VIDEYY.map((z) => ["exoclick", z]));
  assert.deepEqual(videq.map((s) => [s.network, s.zoneId]), EXO_ZONES_VIDEQSSS.map((z) => ["exoclick", z]));
  assert.equal(EXO_ZONE_VIDEYY, "6088478");
  assert.equal(EXO_ZONE_VIDEQSSS, "6088488");
  assert.deepEqual([...EXO_ZONES_VIDEYY], ["6088478", "6111326", "6111330", "6111332", "6111334", "6111336"]);
  assert.deepEqual([...EXO_ZONES_VIDEQSSS], ["6088488", "6111338", "6111340", "6111342", "6111344", "6111346"]);
  assert.equal(new Set(EXO_ZONES_VIDEYY).size, 6);
  assert.equal(new Set(EXO_ZONES_VIDEQSSS).size, 6);
  // Zones are not shared across the two satellites or with the main site.
  const MAIN = ["6053864", "6111252", "6111370", "6111372", "6111374", "6111376"];
  const all: string[] = [...EXO_ZONES_VIDEYY, ...EXO_ZONES_VIDEQSSS];
  assert.equal(new Set(all).size, 12);
  for (const z of MAIN) assert.ok(!all.includes(z));
  for (const slots of SATELLITES) {
    for (const bp of BPS) {
      assert.deepEqual(
        ads(planGrid(30, true, slots), bp).map((c) => [c.slotIndex, c.slot.network, c.slot.zoneId]),
        slots.map((s, i) => [i, "exoclick", s.zoneId]),
      );
    }
    assert.equal(gridAdsOn(slots), true);
    assert.ok(gridSlot(5, slots));
  }
});

test("a slot without a zone ID renders nothing and never borrows another zone", () => {
  const sparse: GridSlot[] = FULL.map((s, i) => (i === 2 ? { ...s, zoneId: "" } : s));
  const cells = planGrid(30, true, sparse);
  assert.deepEqual(ads(cells, "desktop").map((c) => [c.slotIndex, c.slot.zoneId]), [[0, "e1"], [1, "t1"], [3, "e2"], [4, "t2"], [5, "t1"]]);
  assert.equal(visibleCells(cells, "desktop").length % 3, 0, "rows still full");
  assert.equal(gridSlot(2, sparse), null);
  assert.equal(gridSlot(6), null);
  assert.deepEqual(gridSlot(2, FULL), { network: "trafficstars", zoneId: "t2" });
});

test("no ads when showAds is false", () => {
  assert.equal(ads(planGrid(30, false)).length, 0);
  assert.equal(visibleCells(planGrid(30, false), "desktop").length, 30);
});
