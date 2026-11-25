/**
 * public/robots.txt names videyy.icu. On the videqsss build the host is
 * videqsss.icu, so the sitemap line has to match the site that served it.
 */
import { SITE_ORIGIN } from "../../src/lib/seo";

interface RobotsEvent {
  url: URL;
  req: { method: string };
}

export default async function robotsHostMiddleware(
  event: RobotsEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  if (event.url.pathname !== "/robots.txt") return next();
  const result = await next();
  if (!(result instanceof Response) || !result.ok) return result;
  const host = new URL(SITE_ORIGIN).host;
  if (host === "videyy.icu") return result;
  const text = (await result.text()).replaceAll("videyy.icu", host);
  const headers = new Headers(result.headers);
  headers.delete("content-length");
  return new Response(text, { status: result.status, headers });
}
