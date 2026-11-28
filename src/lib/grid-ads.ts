// Catalog grid ad plan (pure, no DOM) so it can be tested with node --test.
// Same layout as koleksidrpinguin.com: at most MAX_GRID_ADS (6) slots per breakpoint,
// slotIndex 0..5, positions phone after every 4th video and laptop (lg) after 2, 7, 12, ...
// Every paginated / landing page with at least one video gets exactly 6 banners when all
// six slots have a zone; shorter pages spread the leftover slots evenly. Every slot has
// its own zone; a slot without a zone ID renders nothing and never borrows another slot's
// or another network's zone. No refresh / rotation.
//
// Layout is the main site's (koleksidrpinguin.com src/lib/grid-ads.ts): laptop grid is 3 columns, every
// page gets exactly 6 banners per breakpoint, and trailing videos are hidden per breakpoint so every row
// is full (no holes). TrafficStars sites were rejected for the satellites (Nov 13 2026) and Wynq is gone,
// so all six slots are distinct ExoClick 300x250 No Refresh zones registered for that domain. Main-site
// zone IDs are not reused here. TS spots stay empty until a TrafficStars site exists for the satellites.

export type AdNetwork = "exoclick" | "trafficstars";
export type GridSlot = { network: AdNetwork; zoneId: string };
export type Breakpoint = "mobile" | "desktop";

/** Distinct ExoClick 300x250 No Refresh zones, one per grid slot, videyy.icu. */
export const EXO_ZONES_VIDEYY = [
  "6088478",
  "6111326",
  "6111330",
  "6111332",
  "6111334",
  "6111336",
] as const;

/** Distinct ExoClick 300x250 No Refresh zones, one per grid slot, videqsss.icu. */
export const EXO_ZONES_VIDEQSSS = [
  "6088488",
  "6111338",
  "6111340",
  "6111342",
  "6111344",
  "6111346",
] as const;

/** First-slot aliases (legacy leftover banner config still points at these). */
export const EXO_ZONE_VIDEYY = EXO_ZONES_VIDEYY[0];
export const EXO_ZONE_VIDEQSSS = EXO_ZONES_VIDEQSSS[0];

/** Placeholders: fill only when a TrafficStars spot exists for that domain. */
export const TS_SPOT_1 = "";
export const TS_SPOT_2 = "";

export const MAX_GRID_ADS = 6;

export type SiteId = "videyy" | "videqsss";

function currentSiteId(): SiteId {
  try {
    const id = (import.meta as { env?: { VITE_SITE_ID?: string } }).env?.VITE_SITE_ID;
    return id === "videqsss" ? "videqsss" : "videyy";
  } catch {
    return "videyy";
  }
}

/** Six distinct ExoClick zones for this satellite. TS stays unused until registered. */
export function slotsForHost(siteId: SiteId = currentSiteId()): readonly GridSlot[] {
  const zones = siteId === "videqsss" ? EXO_ZONES_VIDEQSSS : EXO_ZONES_VIDEYY;
  return zones.map((zoneId) => ({ network: "exoclick" as const, zoneId }));
}

export const GRID_SLOTS: readonly GridSlot[] = slotsForHost();

export const EXO_ZONES: readonly string[] = GRID_SLOTS.filter((s) => s.network === "exoclick" && s.zoneId).map(
  (s) => s.zoneId,
);

export function gridSlot(slotIndex: number, slots: readonly GridSlot[] = GRID_SLOTS): GridSlot | null {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_GRID_ADS) return null;
  const slot = slots[slotIndex];
  if (!slot || !slot.zoneId) return null;
  return slot;
}

const RULES: Readonly<Record<Breakpoint, (count: number) => boolean>> = {
  mobile: (count) => count % 4 === 0,
  desktop: (count) => count % 5 === 2,
};

/** "Ad after video #p" positions (1-based) for one breakpoint: always exactly `max` of them
 * when there is at least one video. The usual rule is kept whenever it yields `max` slots
 * (full catalog pages of 36); shorter pages (last page, landing pages of 24) spread evenly. */
export function adPositions(videoCount: number, bp: Breakpoint, max = MAX_GRID_ADS): number[] {
  if (videoCount <= 0 || max <= 0) return [];
  const rule: number[] = [];
  for (let count = 1; count <= videoCount && rule.length < max; count++) if (RULES[bp](count)) rule.push(count);
  if (rule.length === max) return rule;
  return Array.from({ length: max }, (_, i) => Math.min(videoCount, Math.max(1, Math.round(((i + 0.5) * videoCount) / max))));
}

export type GridCell =
  | { kind: "video"; index: number; hidden: Readonly<Record<Breakpoint, boolean>> }
  | { kind: "ad"; key: string; breakpoint: Breakpoint; slotIndex: number; slot: GridSlot };

/** Columns of the catalog grid per breakpoint (CATALOG_GRID: grid-cols-1, lg:grid-cols-3), same as the main site. */
export const GRID_COLS: Readonly<Record<Breakpoint, number>> = { mobile: 1, desktop: 3 };

/** Cell order for a catalog grid. Every page gets exactly MAX_GRID_ADS ad cells per breakpoint (slotIndex
 * 0..5), ad cells carry stable keys (`ad-mobile-N` / `ad-desktop-N`, no re-request on re-render), and
 * trailing videos are hidden per breakpoint so the visible cell count is a multiple of the columns: every
 * row is full, no holes (except a last page of only 1-2 videos, which keeps them). */
export function planGrid(
  videoCount: number,
  showAds: boolean,
  slots: readonly GridSlot[] = GRID_SLOTS,
  cols: Readonly<Record<Breakpoint, number>> = GRID_COLS,
): GridCell[] {
  const after: Record<Breakpoint, Map<number, GridCell[]>> = { mobile: new Map(), desktop: new Map() };
  const hidden: Record<Breakpoint, Set<number>> = { mobile: new Set(), desktop: new Set() };
  for (const bp of ["mobile", "desktop"] as const) {
    if (!showAds) continue;
    let ads = 0;
    adPositions(videoCount, bp).forEach((pos, slotIndex) => {
      const slot = gridSlot(slotIndex, slots);
      if (!slot) return;
      ads++;
      const list = after[bp].get(pos) || [];
      list.push({ kind: "ad", key: `ad-${bp}-${slotIndex}`, breakpoint: bp, slotIndex, slot });
      after[bp].set(pos, list);
    });
    const k = Math.max(1, cols[bp]);
    const trim = (videoCount + ads) % k;
    // Never trim a tiny last page down to no / almost no videos (1-2 videos: keep them, last row short).
    if (videoCount - trim >= k) for (let i = 0; i < trim; i++) hidden[bp].add(videoCount - 1 - i);
  }
  const cells: GridCell[] = [];
  for (let index = 0; index < videoCount; index++) {
    cells.push({ kind: "video", index, hidden: { mobile: hidden.mobile.has(index), desktop: hidden.desktop.has(index) } });
    for (const bp of ["mobile", "desktop"] as const) cells.push(...(after[bp].get(index + 1) || []));
  }
  return cells;
}

/** Cells visible on one breakpoint, in order. */
export function visibleCells(cells: GridCell[], bp: Breakpoint): GridCell[] {
  return cells.filter((c) => (c.kind === "video" ? !c.hidden[bp] : c.breakpoint === bp));
}

export function gridAdsOn(slots: readonly GridSlot[] = GRID_SLOTS): boolean {
  return slots.some((_, i) => gridSlot(i, slots));
}
