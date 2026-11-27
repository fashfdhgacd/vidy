/**
 * ExoClick popunder gate. The embed script is loaded only when our cap says a
 * page pop is still allowed. ExoClick's own frequency is set higher than that
 * cap (see EXO_FREQUENCY_COUNT) so it does not stop a pop our counter still allows.
 * IndoAV watch pages never arm it.
 */
import { EXOCLICK_POPUNDER_SCRIPT } from "./exoclick-popunder-script.ts";

/** Above the 6-per-day page cap, so our localStorage counter is the one that binds. */
export const EXO_FREQUENCY_COUNT = 99;
/** Minutes. Long enough that ExoClick's window does not reset under our calendar day. */
export const EXO_FREQUENCY_PERIOD = 1440;

export const NO_POP_CLASS = "kdp-no-pop";

export type PageAdMark = "off" | "on" | "wait" | null;

export function popunderScriptBody(zoneId: string): string {
  if (!/^\d{6,8}$/.test(zoneId)) return "";
  if (!EXOCLICK_POPUNDER_SCRIPT.includes(`"frequency_count": ${EXO_FREQUENCY_COUNT}`)) return "";
  if (!EXOCLICK_POPUNDER_SCRIPT.includes(`"frequency_period": ${EXO_FREQUENCY_PERIOD}`)) return "";
  return EXOCLICK_POPUNDER_SCRIPT.replaceAll("__EXO_ZONE__", zoneId);
}

export function zoneCookieName(zoneId: string): string {
  return `zone-cap-${zoneId}`;
}

/** Cookie value ExoClick's popMagic reads: count, then a unix timestamp. */
export function zoneCookieValue(count: number, nowMs: number): string {
  return `${Math.max(0, Math.floor(count))};${Math.floor(nowMs / 1000)}`;
}

export function isIndoAvCreator(creator: string | null | undefined): boolean {
  return /^indoav$/i.test(String(creator || "").trim());
}

/** True when this watch page is an IndoAV video (its creator, or the URL actually playing). */
export function isIndoAvPlayback(creator: string | null | undefined, playUrl: string | null | undefined): boolean {
  if (isIndoAvCreator(creator)) return true;
  return /indoav/i.test(playUrl || "");
}

/**
 * arm: inject the popunder script. hold: do not inject (cap full, IndoAV, or the
 * watch page has not said which host it is yet).
 */
export function pagePopDecision(input: { pageAd: PageAdMark; allowed: boolean; enabled: boolean }): "arm" | "hold" {
  if (!input.enabled || !input.allowed) return "hold";
  if (input.pageAd === "off" || input.pageAd === "wait") return "hold";
  return "arm";
}

/**
 * Banner and in-page push may load only when this page is not an IndoAV watch
 * page. Catalog pages have no marker (null) and are allowed. "wait" means the
 * watch page has not yet said which host it is.
 */
export function displayAdsAllowed(pageAd: PageAdMark): boolean {
  return pageAd !== "off" && pageAd !== "wait";
}
