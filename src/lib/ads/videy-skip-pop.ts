/**
 * Videy player skip popunder count. Separate from the shared page/card daily cap.
 * Six successful opens per visitor per video id (first tap + resume-after-pause).
 * IndoAV never uses this.
 */

export const VIDEY_SKIP_POP_MAX = 6;
/** Minimum time between two Videy skip pops on the same video. */
export const VIDEY_SKIP_POP_GAP_MS = 20_000;

export function readSkipCounts(raw: string | null): Record<string, number> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, number> = {};
    for (const [id, n] of Object.entries(value)) {
      if (!id || typeof n !== "number" || n < 0) continue;
      out[id] = Math.floor(n);
    }
    return out;
  } catch {
    return {};
  }
}

export function skipPopCount(counts: Record<string, number>, videoId: string): number {
  return counts[videoId] || 0;
}

/** True while this video can still open a skip popunder. */
export function skipPopOpen(counts: Record<string, number>, videoId: string, max = VIDEY_SKIP_POP_MAX): boolean {
  return Boolean(videoId) && skipPopCount(counts, videoId) < max;
}

export function noteSkipPop(counts: Record<string, number>, videoId: string): Record<string, number> {
  return { ...counts, [videoId]: skipPopCount(counts, videoId) + 1 };
}
