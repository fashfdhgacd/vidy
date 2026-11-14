/**
 * Which image a catalog card should request, and the inline error handler that swaps a dead
 * one for the local brand poster before React hydrates. Pure: the ok/miss cache is applied by
 * the caller (poster-known.ts on the site, tests pass a predicate).
 */

declare const __VIDEY_THUMB_IDS__: string[] | undefined;
let videyThumbSet: Set<string> | null | undefined;

/** True only when this build listed public/videy-thumbs/<id>.jpg. Unknown list = false. */
export function videyFrameReady(id: string): boolean {
  if (videyThumbSet === undefined) {
    videyThumbSet =
      typeof __VIDEY_THUMB_IDS__ !== "undefined" && Array.isArray(__VIDEY_THUMB_IDS__) ? new Set(__VIDEY_THUMB_IDS__) : null;
  }
  if (!videyThumbSet) return false;
  const key = posterKeyOf(id);
  return Boolean(key) && videyThumbSet.has(key);
}

export const CARD_FALLBACK_POSTER = "/brand-poster-6x5.jpg";
export const R2_POSTER_BASE = "https://img.koleksidrpinguin.com/posters/typed/";

const BAD_THUMB = /placeholder|brand-poster|1x1|now_printing|noimage|no[-_]image|\/api\/(?:img-proxy|tape-thumb|embed-thumb|puterin-thumb)/i;

/** Same key the cards and /thumb use (`posters/typed/<id>`). */
export function posterKeyOf(id: string): string {
  return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

export function r2PosterUrl(id: string): string {
  const key = posterKeyOf(id);
  return key ? `${R2_POSTER_BASE}${key}` : "";
}

function remoteThumb(url: string): string {
  const u = String(url || "").trim();
  if (!/^https?:\/\//i.test(u)) return "";
  if (BAD_THUMB.test(u)) return "";
  if (/\.(mp4|mov|webm)(\?|$)/i.test(u) || /cdn\.videy\.co\//i.test(u)) return "";
  return u;
}

function localThumb(url: string): string {
  const u = String(url || "").trim();
  if (!u.startsWith("/") || u.startsWith("//") || u.startsWith("/api/")) return "";
  if (/brand-poster/i.test(u)) return "";
  return u;
}

/**
 * Confirmed R2 poster, else a source thumbnail already stored on the item, else the brand poster.
 * `alt` is tried once by the inline onerror before the brand poster.
 */
export function chooseCardThumb(id: string, stored: string, ok: boolean): { src: string; alt: string } {
  const local = localThumb(stored);
  if (local) return { src: local, alt: "" };
  const remote = remoteThumb(stored);
  const r2 = r2PosterUrl(id);
  const source = remote && remote !== r2 ? remote : "";
  if (ok && r2) return { src: r2, alt: source };
  if (source) return { src: source, alt: "" };
  return { src: CARD_FALLBACK_POSTER, alt: "" };
}

/** Stable: confirmed posters keep their relative order, then everything else. Nothing is dropped. */
export function realPosterFirst<T extends { id: string }>(list: T[], hasPoster: (item: T) => boolean): T[] {
  let seenWithout = false;
  for (const it of list) {
    if (!hasPoster(it)) seenWithout = true;
    else if (seenWithout) {
      const withPoster: T[] = [];
      const without: T[] = [];
      for (const item of list) (hasPoster(item) ? withPoster : without).push(item);
      return [...withPoster, ...without];
    }
  }
  return list;
}

function escAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Inline handler (no React). A stored source thumb is tried once, then the local brand poster.
 * `this.onerror = null` stops a missing brand file from looping.
 */
const ONERROR =
  "var a=this.getAttribute('data-alt');if(a){this.removeAttribute('data-alt');this.src=a}else{this.onerror=null;this.style.objectFit='contain';if((this.getAttribute('src')||'').indexOf('brand-poster-6x5.jpg')<0)this.src='/brand-poster-6x5.jpg'}";

export function cardThumbHtml(opts: {
  id: string;
  stored: string;
  alt: string;
  ok: boolean;
  eager?: boolean;
  className?: string;
}): string {
  const choice = chooseCardThumb(opts.id, opts.stored, opts.ok);
  const fit = choice.src === CARD_FALLBACK_POSTER ? "object-contain" : "object-cover";
  const cls = ["media-thumb", "size-full", fit, opts.className || ""].filter(Boolean).join(" ");
  const loading = opts.eager ? "eager" : "lazy";
  const priority = opts.eager ? " fetchpriority=\"high\"" : "";
  const altAttr = choice.alt ? ` data-alt="${escAttr(choice.alt)}"` : "";
  return (
    `<img src="${escAttr(choice.src)}" alt="${escAttr(opts.alt)}" width="320" height="180"` +
    ` loading="${loading}" decoding="async"${priority} class="${escAttr(cls)}"${altAttr}` +
    ` style="background-color:#0e0d12;background-image:url(${CARD_FALLBACK_POSTER});background-position:center;background-repeat:no-repeat;background-size:contain"` +
    ` onerror="${ONERROR}">`
  );
}
