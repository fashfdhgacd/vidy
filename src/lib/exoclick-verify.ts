/**
 * ExoClick site-ownership check. VITE_SITE_ID is inlined per worker build, so
 * videyy and videqsss each keep only their own token in the page and the file.
 */
export const EXOCLICK_META_NAME = "6a97888e-site-verification";

const VIDEYY_TOKEN = "a8ec81b6595c5272e9680694f27e0957";
const VIDEQSSS_TOKEN = "9a4a6b4a01242ca91030dab7939bb859";

export function exoclickTokenFor(siteId: string | undefined): string {
  return siteId === "videqsss" ? VIDEQSSS_TOKEN : VIDEYY_TOKEN;
}

/** Token for this build. Not called at import time, so Node tests can load the module. */
export function exoclickToken(): string {
  return exoclickTokenFor(import.meta.env.VITE_SITE_ID);
}

/** 200 with the token as the body, or null when this host should not serve the path. */
export function exoclickVerifyResponse(
  pathname: string,
  method: string,
  token: string,
): Response | null {
  if (pathname !== `/${token}.html`) return null;
  const m = (method || "GET").toUpperCase();
  if (m !== "GET" && m !== "HEAD") return null;
  return new Response(m === "HEAD" ? null : token, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}
