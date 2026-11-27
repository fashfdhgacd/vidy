// Catalog grid ad plan (pure, no DOM) so it can be tested with node --test.
// Same layout as koleksidrpinguin.com: at most MAX_GRID_ADS (6) slots per breakpoint,
// slotIndex 0..5, positions phone after every 4th video and laptop (lg) after 2, 7, 12, ...
// Every slot has its own zone; a slot without a zone ID renders nothing and never borrows
// another slot's or another network's zone. No refresh / rotation.
//
// These domains only have one ExoClick 300x250 zone each today. TrafficStars sites were
// rejected (Nov 13 2026) and no Wynq site/zones exist, so those slots stay empty (collapse)
// until new zones are registered for that domain. Main-site zone IDs are not reused here.

export type AdNetwork = "exoclick" | "trafficstars" | "wynq";
export type GridSlot = { network: AdNetwork; zoneId: string };
export type Breakpoint = "mobile" | "desktop";

/** Existing ExoClick 300x250 zones (one per satellite site). A second banner zone does not exist yet. */
export const EXO_ZONE_VIDEYY = "6088478";
export const EXO_ZONE_VIDEQSSS = "6088488";

/** Placeholders: fill only when a zone/spot exists for that domain. */
export const TS_SPOT_1 = "";
export const TS_SPOT_2 = "";
export const WYNQ_ZONE_1 = "";
export const WYNQ_ZONE_2 = "";
/** Wynq site tag stays off until a satellite Wynq site id exists. */
export const WYNQ_ENABLED = false;
export const WYNQ_SITE_SCRIPT_SRC = "https://rapidfire.cc/s.js";
export const WYNQ_SITE_ID = "";

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

/** Slot config for one satellite host: Exo / TS / Wynq / Exo / TS / Wynq, like the main site. */
export function slotsForHost(siteId: SiteId = currentSiteId()): readonly GridSlot[] {
  const exo1 = siteId === "videqsss" ? EXO_ZONE_VIDEQSSS : EXO_ZONE_VIDEYY;
  return [
    { network: "exoclick", zoneId: exo1 },
    { network: "trafficstars", zoneId: TS_SPOT_1 },
    { network: "wynq", zoneId: WYNQ_ZONE_1 },
    { network: "exoclick", zoneId: "" },
    { network: "trafficstars", zoneId: TS_SPOT_2 },
    { network: "wynq", zoneId: WYNQ_ZONE_2 },
  ];
}

export const GRID_SLOTS: readonly GridSlot[] = slotsForHost();

export const EXO_ZONES: readonly string[] = GRID_SLOTS.filter((s) => s.network === "exoclick" && s.zoneId).map(
  (s) => s.zoneId,
);

export function gridSlot(slotIndex: number, slots: readonly GridSlot[] = GRID_SLOTS, wynqEnabled = WYNQ_ENABLED): GridSlot | null {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= MAX_GRID_ADS) return null;
  const slot = slots[slotIndex];
  if (!slot || !slot.zoneId) return null;
  if (slot.network === "wynq" && !wynqEnabled) return null;
  return slot;
}

export type GridCell =
  | { kind: "video"; index: number }
  | { kind: "ad"; key: string; breakpoint: Breakpoint; slotIndex: number; slot: GridSlot };

export function planGrid(
  videoCount: number,
  showAds: boolean,
  slots: readonly GridSlot[] = GRID_SLOTS,
  wynqEnabled = WYNQ_ENABLED,
): GridCell[] {
  const cells: GridCell[] = [];
  let mobileIdx = 0;
  let desktopIdx = 0;
  for (let index = 0; index < videoCount; index++) {
    cells.push({ kind: "video", index });
    if (!showAds) continue;
    const count = index + 1;
    if (count % 4 === 0 && mobileIdx < MAX_GRID_ADS) {
      const slotIndex = mobileIdx++;
      const slot = gridSlot(slotIndex, slots, wynqEnabled);
      if (slot) cells.push({ kind: "ad", key: `ad-mobile-${slotIndex}`, breakpoint: "mobile", slotIndex, slot });
    }
    if (count % 5 === 2 && desktopIdx < MAX_GRID_ADS) {
      const slotIndex = desktopIdx++;
      const slot = gridSlot(slotIndex, slots, wynqEnabled);
      if (slot) cells.push({ kind: "ad", key: `ad-desktop-${slotIndex}`, breakpoint: "desktop", slotIndex, slot });
    }
  }
  return cells;
}

export function gridAdsOn(slots: readonly GridSlot[] = GRID_SLOTS, wynqEnabled = WYNQ_ENABLED): boolean {
  return slots.some((_, i) => gridSlot(i, slots, wynqEnabled));
}
