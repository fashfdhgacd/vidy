/**
 * public/robots.txt names videyy.icu. On the videqsss build the host is
 * videqsss.icu, so the sitemap line has to match the site that served it.
 *
 * Static assets can skip Nitro middleware, so scripts/cf-patch-wrangler.mjs
 * also rewrites .output/public/robots.txt at build time. This middleware is
 * the runtime safety net when the worker does handle /robots.txt.
 */
import { robotsTxtForOrigin } from "../../src/lib/robots-txt";
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
  const text = robotsTxtForOrigin(await result.text(), SITE_ORIGIN);
  const headers = new Headers(result.headers);
  headers.delete("content-length");
  return new Response(text, { status: result.status, headers });
}
