/**
 * Ad slots for this build. videyy.icu and videqsss.icu each get their own zones.
 * network is exoclick. Popunder stays on. Banner, in-page push, slider and VAST
 * keep their zone ids but stay disabled here: catalog banners come from src/lib/grid-ads.ts
 * (max one ExoClick zone per page until a second zone exists). There is no 300x100 zone.
 */
import { gridAdsOn as gridSlotsOn } from "../grid-ads.ts";
import { activeScript, activeVast, buildAds, popunderLink, videqsssZones, videyyZones } from "./ads-config.ts";

export type { AdNetwork, AdSpot, AdsConfig } from "./ads-config.ts";

// import.meta.env is undefined under plain node (tests): default to the videyy zones there.
const siteId = (import.meta as { env?: { VITE_SITE_ID?: string } }).env?.VITE_SITE_ID;
const zones = siteId === "videqsss" ? videqsssZones : videyyZones;

export const ADS = buildAds(zones);

/** Direct popunder link for a click we open ourselves (Videy skip). Empty when the slot is off. */
export function popunderUrl(): string {
  return popunderLink(ADS.popunder);
}

/** Pre-roll VAST tag, or "" while that slot is disabled. */
export function prerollUrl(): string {
  return activeVast(ADS.preroll);
}

/** Display-slot script URL. Empty while the slot is disabled, so the page loads nothing. */
export function slotScript(slot: "banner300x250" | "videoSlider" | "inPagePush"): string {
  return activeScript(ADS[slot]);
}

export function gridAdsOn(): boolean {
  return gridSlotsOn();
}
