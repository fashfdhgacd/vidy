/**
 * Crawlable pagination paths (/halaman/2), the same shape as a genre-site pager.
 * Page 1 is the bare URL. Search results keep ?page= because those URLs are noindex.
 */

export function homeHref(page: number): string {
  return page > 1 ? `/halaman/${page}` : "/";
}

export function categoryHref(slug: string, page: number, periode?: string | null): string {
  const base = page > 1 ? `/kategori/${encodeURIComponent(slug)}/halaman/${page}` : `/kategori/${encodeURIComponent(slug)}`;
  return periode ? `${base}?periode=${encodeURIComponent(periode)}` : base;
}

export function cariHref(slug: string, page: number): string {
  return page > 1 ? `/cari/${encodeURIComponent(slug)}/halaman/${page}` : `/cari/${encodeURIComponent(slug)}`;
}

/** Path segment for /halaman/N. Page 1 is not a halaman URL. */
export function parseHalamanParam(raw: string | undefined | null): number | null {
  if (!/^[1-9]\d{0,4}$/.test(String(raw || ""))) return null;
  const n = Number(raw);
  return n >= 2 ? n : null;
}

/**
 * 301 target for legacy ?page= and for /halaman/1. Null means leave the request alone.
 * `q` (site search) is not rewritten.
 */
const CATEGORY_PLACEHOLDER = /^\/kategori\/(\$slug|%24slug|:slug|\{slug\}|%7bslug%7d)$/i;

export function legacyPageRedirect(pathname: string, search = ""): string | null {
  const url = new URL(pathname + (search || ""), "https://videyy.icu");
  const path = url.pathname.replace(/\/+$/, "") || "/";

  // Old category URLs (including paged and ?periode=) fold into the home feed.
  // The leaked /$slug template stays for the 410 in watch-placeholder.
  if (!CATEGORY_PLACEHOLDER.test(path) && (path === "/kategori" || path.startsWith("/kategori/"))) return "/";

  const homeHal = /^\/halaman\/([1-9]\d*)$/.exec(path);
  if (homeHal && Number(homeHal[1]) < 2) return "/";

  const nested = /^\/cari\/([^/]+)\/halaman\/([1-9]\d*)$/.exec(path);
  if (nested && Number(nested[2]) < 2) {
    url.searchParams.delete("page");
    const qs = url.searchParams.toString();
    return `/cari/${nested[1]}${qs ? `?${qs}` : ""}`;
  }

  const pageRaw = url.searchParams.get("page");
  if (!pageRaw || url.searchParams.get("q")) return null;
  if (!/^[1-9]\d{0,4}$/.test(pageRaw)) return null;
  // Hanya path halaman katalog yang boleh di-rewrite — /api/* dan route lain dengan
  // ?page= (mis. /api/data?type=home&page=1) jangan disentuh.
  const isCatalogPage = path === "/" || /^\/cari\/[^/]+$/.test(path);
  if (!isCatalogPage) return null;
  const n = Number(pageRaw);
  url.searchParams.delete("page");
  const qs = url.searchParams.toString();
  const tail = qs ? `?${qs}` : "";
  if (n === 1) return `${path}${tail}`;
  if (path === "/") return `/halaman/${n}${tail}`;
  const cari = /^\/cari\/([^/]+)$/.exec(path);
  if (cari) return `/cari/${cari[1]}/halaman/${n}${tail}`;
  return null;
}
