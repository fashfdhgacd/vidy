/**
 * Loads the ExoClick popunder embed only when pagePopDecision says arm.
 * A full cap or an IndoAV watch page removes the script node and writes ExoClick's
 * zone cookie up to its frequency count so a script already on the page cannot fire.
 * No request to our server.
 */
import { readPagePopState, writePagePopState } from "@/components/card-popunder";
import { jakartaDay, nextPagePop, pagePopAllowed, PAGE_POP_MAX_PER_DAY } from "@/lib/page-pop-cap";
import { ADS } from "./spots.ts";
import {
  EXO_FREQUENCY_COUNT,
  EXO_FREQUENCY_PERIOD,
  NO_POP_CLASS,
  pagePopDecision,
  zoneCookieName,
  zoneCookieValue,
  type PageAdMark,
} from "./exo-popunder.ts";

const SCRIPT_ID = "kdp-exo-pop";
const EXCLUDE = "[data-kdp-page-ad='off'], [data-kdp-noad], [data-kdp-ad], [data-videy-skip], .kdp-no-pop, input, textarea, select";

let scriptEl: HTMLScriptElement | null = null;
let hooked = false;
let lastShown = 0;

function pageAdMark(): PageAdMark {
  const el = document.querySelector("[data-kdp-page-ad]");
  const value = el?.getAttribute("data-kdp-page-ad");
  if (value === "off" || value === "on" || value === "wait") return value;
  return null;
}

function writeZoneCookie(zoneId: string, count: number, now: number): void {
  const exp = new Date(now + EXO_FREQUENCY_PERIOD * 60 * 1000);
  const value = encodeURIComponent(zoneCookieValue(count, now));
  document.cookie = `${zoneCookieName(zoneId)}=${value}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
}

function storedCount(now: number): number {
  const state = readPagePopState();
  if (!state || state.day !== jakartaDay(now)) return 0;
  return state.n;
}

function dropHostedLoader(): void {
  document.getElementById("popmagicldr")?.remove();
}

function ensureScript(script: string, zoneId: string): void {
  if (!scriptEl) {
    const el = document.createElement("script");
    el.id = SCRIPT_ID;
    el.type = "application/javascript";
    el.dataset.idzone = zoneId;
    el.text = script;
    scriptEl = el;
    document.body.appendChild(el);
    return;
  }
  if (!scriptEl.isConnected) document.body.appendChild(scriptEl);
}

export function syncExoPagePopunder(): void {
  if (typeof document === "undefined") return;
  const spot = ADS.popunder;
  const now = Date.now();
  const mark = pageAdMark();
  const allowed = pagePopAllowed(readPagePopState(), now);
  const decision = pagePopDecision({ pageAd: mark, allowed, enabled: Boolean(spot.enabled && spot.script && spot.zoneId) });
  if (!spot.zoneId) return;
  if (decision !== "arm") {
    writeZoneCookie(spot.zoneId, EXO_FREQUENCY_COUNT, now);
    scriptEl?.remove();
    dropHostedLoader();
    return;
  }
  writeZoneCookie(spot.zoneId, storedCount(now), now);
  ensureScript(spot.script, spot.zoneId);
}

function onPointerDown(event: Event): void {
  const el = event.target instanceof Element ? event.target : null;
  if (el?.closest(EXCLUDE)) el.classList.add(NO_POP_CLASS);
  syncExoPagePopunder();
}

function onShown(): void {
  if (typeof document === "undefined") return;
  const now = Date.now();
  if (now - lastShown < 800) return;
  if (document.querySelector("[data-kdp-page-ad='off']")) return;
  const state = readPagePopState();
  if (!pagePopAllowed(state, now)) return;
  const next = nextPagePop(state, now);
  lastShown = now;
  writePagePopState(next);
  const zoneId = ADS.popunder.zoneId;
  if (zoneId && next.n >= PAGE_POP_MAX_PER_DAY) writeZoneCookie(zoneId, EXO_FREQUENCY_COUNT, now);
}

/** Idempotent. Call after navigation so an IndoAV page drops the script. */
export function installExoPagePopunder(): void {
  if (typeof document === "undefined") return;
  if (!hooked) {
    hooked = true;
    document.addEventListener("pointerdown", onPointerDown, true);
    const zoneId = ADS.popunder.zoneId;
    if (zoneId) document.addEventListener(`creativeDisplayed-${zoneId}`, onShown);
  }
  syncExoPagePopunder();
}
