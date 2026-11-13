/**
 * Ad slots for this build. videyy.icu and videqsss.icu each get their own zones.
 * network is exoclick. Only the popunder is enabled. Banner, slider, push, and VAST
 * keep their zone id (and the VAST URL) but script stays empty and enabled is false,
 * so nothing else loads. There is no 300x100 zone.
 */
import { activeScript, activeVast, buildAds, popunderLink, videqsssZones, videyyZones } from "./ads-config.ts";

export type { AdNetwork, AdSpot, AdsConfig } from "./ads-config.ts";

const zones = import.meta.env.VITE_SITE_ID === "videqsss" ? videqsssZones : videyyZones;

export const ADS = buildAds(zones);

/** Direct popunder link for a click we open ourselves (Videy skip). Empty when the slot is off. */
export function popunderUrl(): string {
  return popunderLink(ADS.popunder);
}

/** Pre-roll VAST tag, or "" while that slot is disabled. */
export function prerollUrl(): string {
  return activeVast(ADS.preroll);
}

/** Display-slot script. Empty while the slot is disabled, so the page loads nothing. */
export function slotScript(slot: "banner300x250" | "videoSlider" | "inPagePush"): string {
  return activeScript(ADS[slot]);
}

export function gridAdsOn(): boolean {
  return Boolean(ADS.banner300x250.enabled && ADS.banner300x250.script);
}
