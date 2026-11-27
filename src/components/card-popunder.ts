// ExoClick popunder link (spots.ts popunderUrl). Page and card clicks do not open a window here:
// exo-popunder-dom.ts loads the embed only while the Jakarta-day cap still allows it.
// firePop is the per-video opener (iframe tap layer). IndoAV never opens. A blocked window.open
// is not counted. Counters: pop_n1..pop_n6 in player-log.
import { sendPlayerLog, type PlayerLogHost } from "@/lib/player-log-client";
import { popunderUrl } from "@/lib/ads/spots";
import { nextPagePop, pagePopAllowed, type PagePopDay } from "@/lib/page-pop-cap";
const HOSTS = new Set(["IndoAV", "UserBokep", "Streamtape", "Putarin", "Videy", "Arsip"]);

/** Max popunders per video id for catalog-style openers. Easy to change. */
export const POP_MAX_PER_VIDEO = 3;
/** Non-Videy player tap layer: one popunder on the first tap, then the video loads. */
export const POP_MAX_OTHER = 1;
/** Minimum time between two popunders on the SAME video (a newly opened video may pop at once). */
export const POP_MIN_GAP_MS = 20_000;
/** Videy popunder cap per video (independent of the shared daily cap). */
export const POP_MAX_VIDEY = 6;
/** Per-video cap for the player tap layer. */
export function popMaxFor(host: string): number {
  return host === "Videy" ? POP_MAX_VIDEY : POP_MAX_OTHER;
}

const KEY = "kdp_pop_v1";
type PopState = { id: string; n: number; at: number };
let mem: PopState = { id: "", n: 0, at: 0 };

function readState(): PopState {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as PopState;
      if (v && typeof v.id === "string" && typeof v.n === "number" && typeof v.at === "number") return v;
    }
  } catch {
    /* fall back to memory */
  }
  return mem;
}

function writeState(v: PopState): void {
  mem = v;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* in-memory only */
  }
}

/** True when a popunder for this video is allowed right now (per-video count + global gap). */
export function canPop(videoId: string, max: number = POP_MAX_PER_VIDEO, daily = true): boolean {
  if (typeof window === "undefined" || !videoId) return false;
  if (daily && !pagePopAllowed(readPagePopState(), Date.now())) return false;
  const st = readState();
  if (st.id !== videoId) return true; // another video: fresh count, no gap
  return st.n < max && Date.now() - st.at >= POP_MIN_GAP_MS;
}

/** True when this video can still get a popunder later (count not used up), ignoring the gap. */
export function popsLeft(videoId: string, max: number = POP_MAX_PER_VIDEO): boolean {
  if (typeof window === "undefined" || !videoId) return false;
  const st = readState();
  return (st.id === videoId ? st.n : 0) < max;
}

/**
 * Opens the direct link synchronously (call inside the click handler). Returns "ok" when a tab
 * opened (counted), "block" when the browser blocked it (not counted), "skip" when the cap says no.
 */
export function firePop(
  videoId: string,
  max: number = POP_MAX_PER_VIDEO,
  host?: PlayerLogHost,
  daily = true,
): "ok" | "block" | "skip" {
  if (host === "IndoAV") return "skip";
  const url = popunderUrl();
  if (!url || !canPop(videoId, max, daily)) return "skip";
  let w: Window | null = null;
  try {
    w = window.open(url, "_blank");
    if (w) w.opener = null; // the ad tab cannot reach back into this page
  } catch {
    w = null;
  }
  if (!w) return "block";
  const st = readState();
  const n = (st.id === videoId ? st.n : 0) + 1;
  writeState({ id: videoId, n, at: Date.now() });
  if (daily) writePagePopState(nextPagePop(readPagePopState(), Date.now()));
  if (host && n >= 1 && n <= 6) {
    sendPlayerLog(videoId, host, `pop_n${n}` as "pop_n1" | "pop_n2" | "pop_n3" | "pop_n4" | "pop_n5" | "pop_n6");
  }
  return "ok";
}

export function popHost(h: string): PlayerLogHost {
  return (HOSTS.has(h) ? h : "Lainnya") as PlayerLogHost;
}

const PAGE_POP_KEY = "kdp_page_pop_day";

function parsePagePop(raw: string | null): PagePopDay | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as PagePopDay;
    if (v && typeof v.day === "string" && typeof v.n === "number" && v.n >= 0) return { day: v.day, n: v.n };
  } catch {
    /* cookie uses day.n */
  }
  const m = /^(\d{4}-\d{2}-\d{2})\.(\d+)$/.exec(raw);
  return m ? { day: m[1], n: Number(m[2]) } : null;
}

/** localStorage, with a cookie copy so the same browser still counts if storage throws. */
export function readPagePopState(): PagePopDay | null {
  let stored: PagePopDay | null = null;
  let cookie: PagePopDay | null = null;
  try {
    stored = parsePagePop(localStorage.getItem(PAGE_POP_KEY));
  } catch {
    /* private mode */
  }
  try {
    const row = document.cookie.split("; ").find((part) => part.startsWith(`${PAGE_POP_KEY}=`));
    if (row) cookie = parsePagePop(decodeURIComponent(row.slice(PAGE_POP_KEY.length + 1)));
  } catch {
    /* ignore */
  }
  if (stored && cookie && stored.day === cookie.day) return stored.n >= cookie.n ? stored : cookie;
  return stored || cookie;
}

export function writePagePopState(state: PagePopDay): void {
  try {
    localStorage.setItem(PAGE_POP_KEY, JSON.stringify(state));
  } catch {
    /* cookie still records it */
  }
  try {
    document.cookie = `${PAGE_POP_KEY}=${encodeURIComponent(`${state.day}.${state.n}`)}; Max-Age=172800; Path=/; SameSite=Lax`;
  } catch {
    /* in-memory only for this hit; the next successful write catches up */
  }
}

