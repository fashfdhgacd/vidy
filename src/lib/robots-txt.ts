/**
 * public/robots.txt is written for videyy.icu. On a videqsss build the Sitemap
 * line (and any other host mention) must use videqsss.icu.
 */
export function robotsTxtForOrigin(source: string, origin: string): string {
  let host = "";
  try {
    host = new URL(origin).host;
  } catch {
    return source;
  }
  if (!host || host === "videyy.icu") return source;
  return source.replaceAll("videyy.icu", host);
}
