// Videy player skip popunder. Clicks on the player overlay and the pre-roll Skip
// button open TRAFFICSTARS.popunder, up to 3 times per visitor per video id.
// This count is not the page/card cap. An empty spot opens nothing.
// IndoAV iframes never call this.
import { sendPlayerLog } from "@/lib/player-log-client";
import { popunderUrl } from "@/lib/ads/spots";
import { noteSkipPop, readSkipCounts, skipPopOpen } from "@/lib/ads/videy-skip-pop";

const KEY = "kdp_videy_skip_pop";
const MAX_BLOCKS = 2;
const blocks = new Map<string, number>();

function load(): Record<string, number> {
  try {
    return readSkipCounts(localStorage.getItem(KEY));
  } catch {
    return {};
  }
}

function save(counts: Record<string, number>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(counts));
  } catch {
    /* in-memory only for this hit */
  }
}

/** True when another skip click on this Videy id should open the popunder. */
export function videySkipArmed(videoId: string): boolean {
  if (!popunderUrl() || !videoId) return false;
  if ((blocks.get(videoId) || 0) >= MAX_BLOCKS) return false;
  return skipPopOpen(load(), videoId);
}

/**
 * Open the popunder from a Videy player or Skip click.
 * Returns true when the click was used for the ad (do not also start playback).
 * Returns false when playback should continue (no spot, cap full, or the browser blocked twice).
 */
export function takeVideySkipPop(videoId: string): boolean {
  if (!videySkipArmed(videoId)) return false;
  const url = popunderUrl();
  let opened: Window | null = null;
  try {
    opened = window.open(url, "_blank");
    if (opened) opened.opener = null;
  } catch {
    opened = null;
  }
  if (!opened) {
    const n = (blocks.get(videoId) || 0) + 1;
    blocks.set(videoId, n);
    sendPlayerLog(videoId, "Videy", "pop_block");
    return n < MAX_BLOCKS;
  }
  const counts = load();
  const next = noteSkipPop(counts, videoId);
  save(next);
  const n = next[videoId] || 1;
  if (n >= 1 && n <= 3) sendPlayerLog(videoId, "Videy", `pop_n${n}` as "pop_n1" | "pop_n2" | "pop_n3");
  return true;
}
