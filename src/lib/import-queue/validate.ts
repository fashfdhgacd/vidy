/**
 * URL validation + SSRF guard for the auto import queue.
 *
 * Pure module (no project imports) so it stays unit-testable under
 * `node --experimental-strip-types`. Provider detection lives in
 * src/lib/bot/parse.js (parseVideoLink) and is applied by the store/pipeline.
 */

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string };

const MAX_URL_LENGTH = 2048;

/** Hostnames that must never be fetched server-side (SSRF). */
const BLOCKED_HOST_RE =
  /^(?:localhost|.*\.localhost|.*\.local|.*\.internal|.*\.lan|.*\.home|.*\.corp)$/i;

function isIpLiteral(host: string): boolean {
  // IPv4 dotted quad or any IPv6 literal ([::1] is already unwrapped by URL).
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

/** True for private/loopback/link-local/reserved IPv4 literals. */
function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark
  if (a >= 224) return true; // multicast/reserved
  return false;
}

/**
 * Validate one pasted URL line. Only https/http, no credentials, default ports,
 * no IP literals or internal hostnames — anything else is rejected before it can
 * reach a fetch (SSRF guard; the provider fetchers only ever talk to the embed
 * hosts the parser recognises).
 */
export function validateImportUrl(raw: string): UrlCheck {
  const s = String(raw || "").trim().replace(/[),.;\]}>'"]+$/g, "");
  if (!s) return { ok: false, error: "kosong" };
  if (s.length > MAX_URL_LENGTH) return { ok: false, error: "url terlalu panjang" };

  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, error: "bukan URL valid" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, error: `protokol ${u.protocol.replace(":", "")} tidak diizinkan` };
  }
  if (u.username || u.password) return { ok: false, error: "URL dengan kredensial tidak diizinkan" };
  if (u.port && u.port !== "80" && u.port !== "443") {
    return { ok: false, error: "port non-standar tidak diizinkan" };
  }

  const host = u.hostname.toLowerCase();
  if (!host) return { ok: false, error: "host kosong" };
  if (BLOCKED_HOST_RE.test(host)) return { ok: false, error: "host internal tidak diizinkan" };
  if (isIpLiteral(host)) {
    // Only public IPv4 literals could ever be legitimate; providers are domains,
    // so reject every literal outright (also kills IPv6 SSRF tricks).
    return { ok: false, error: "host berupa alamat IP tidak diizinkan" };
  }
  if (isPrivateIpv4(host)) return { ok: false, error: "alamat IP privat tidak diizinkan" };

  return { ok: true, url: u.toString() };
}

/** Split pasted text into candidate URL lines (one URL per line, commas/semicolons tolerated). */
export function splitUrlLines(text: string): string[] {
  return String(text || "")
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[;,]/))
    .map((l) => l.trim())
    .filter(Boolean);
}
