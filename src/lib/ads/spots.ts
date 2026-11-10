/**
 * TrafficStars spot IDs for videyy.icu and videqsss.icu.
 * Leave every value empty until the new IDs arrive. An empty value loads nothing
 * and opens nothing. A full https URL is used as-is; otherwise the value is the
 * spot id and the slot builds the TrafficStars URL.
 */
export const TRAFFICSTARS = {
  /** Direct-link popunder. Page and card clicks: 3 per visitor per day. Videy player/skip: 3 per video id. */
  popunder: "",
  /** VAST tag for the video pre-roll. */
  preroll: "",
  /** In-page push spot. */
  inPagePush: "",
  /** Video slider spot. */
  videoSlider: "",
  /** Catalog grid master spot: 300x250 and native. */
  gridMasterspot: "",
  /** 300x100 banner spot. */
  banner300x100: "",
} as const;

export type TrafficStarSlot = keyof typeof TRAFFICSTARS;

export function spotValue(slot: TrafficStarSlot): string {
  return String(TRAFFICSTARS[slot] || "").trim();
}

/** Direct popunder URL, or "" when the slot is off. */
export function popunderUrl(): string {
  const raw = spotValue("popunder");
  if (!raw) return "";
  if (/^https:\/\//i.test(raw)) return raw;
  return `https://tsyndicate.com/api/v1/direct/${encodeURIComponent(raw)}`;
}

/** Pre-roll VAST tag, or "" when the slot is off. */
export function prerollUrl(): string {
  const raw = spotValue("preroll");
  if (!raw) return "";
  if (/^https:\/\//i.test(raw)) return raw;
  return `https://tsyndicate.com/api/v1/direct/${encodeURIComponent(raw)}/vast`;
}

/**
 * Script URL for a display slot. `kind` is the TrafficStars SDK file
 * (p = in-page push, s = video slider, ms = 300x250/native master spot, b = 300x100).
 */
export function slotScript(slot: TrafficStarSlot, kind: "p" | "s" | "ms" | "b"): string {
  const raw = spotValue(slot);
  if (!raw) return "";
  if (/^https:\/\//i.test(raw)) return raw;
  return `https://cdn.tsyndicate.com/sdk/v1/${kind}.js`;
}

export function gridAdsOn(): boolean {
  return Boolean(spotValue("gridMasterspot"));
}
