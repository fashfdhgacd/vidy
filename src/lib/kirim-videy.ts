/**
 * Client-side Videy link check and submit-response copy for /kirim (videyy.icu only).
 * Pure: no fetch, no DOM. The page posts only when the visitor submits.
 */

export const KIRIM_ENDPOINT = "https://koleksidrpinguin.com/api/kiriman-videy";
export const KIRIM_SITE = "videyy.icu";
export const KIRIM_TITLE_MAX = 120;

export const KIRIM_MSG = {
  pending: "Makasih! Video kamu masuk antrean, tayang setelah dicek admin.",
  duplicate: "Video ini udah ada / udah dikirim.",
  invalid: "Link-nya bukan link Videy yang valid.",
  rate: "Kebanyakan kiriman, coba lagi besok.",
  retry: "Gagal kirim. Coba lagi.",
} as const;

const ID_RE = /^[A-Za-z0-9]{1,80}$/;

function queryId(url: URL): string {
  const id = (url.searchParams.get("id") || "").trim();
  return ID_RE.test(id) ? id : "";
}

function pathId(url: URL): string {
  const parts = url.pathname.split("/").filter(Boolean);
  const last = (parts[parts.length - 1] || "").replace(/\.(mp4|mov)$/i, "");
  if (!ID_RE.test(last)) return "";
  if (/^(v|e|d|embed|watch|mp4|mov)$/i.test(last)) return "";
  return last;
}

/**
 * videy.co/v?id=…, videy.co/v/?id=…, or cdn.videy.co (cdn2, cdn3, …) with an id
 * in the query or the file path. Returns a normalized http(s) URL, or null.
 */
export function normalizeVideyLink(raw: string): string | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed || trimmed.length > 2048 || /\s/.test(trimmed)) return null;
  let url: URL;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;

  const host = url.hostname.replace(/\.$/, "").toLowerCase();
  const qid = queryId(url);

  if (host === "videy.co" || host === "www.videy.co") {
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/v" || !qid) return null;
    return url.toString();
  }

  if (/^cdn\d*\.videy\.co$/.test(host)) {
    if (qid || pathId(url)) return url.toString();
    return null;
  }

  return null;
}

export function kirimMessage(status: number, body: unknown): string {
  if (status === 429) return KIRIM_MSG.rate;
  if (status === 400 && isInvalidUrl(body)) return KIRIM_MSG.invalid;
  if (status === 200 && body && typeof body === "object") {
    const row = body as { ok?: unknown; status?: unknown };
    if (row.ok === true && row.status === "pending") return KIRIM_MSG.pending;
    if (row.ok === true && row.status === "duplicate") return KIRIM_MSG.duplicate;
  }
  return KIRIM_MSG.retry;
}

function isInvalidUrl(body: unknown): boolean {
  if (!body || typeof body !== "object") return true;
  const rec = body as Record<string, unknown>;
  const code = rec.error ?? rec.code;
  if (code == null || code === "") return true;
  return code === "invalid_url";
}

/** Header/footer link. Off on videqsss and on English pages. */
export function showKirimNav(pathname: string, isVideqsss: boolean): boolean {
  if (isVideqsss) return false;
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/en" || path.startsWith("/en/")) return false;
  return true;
}
