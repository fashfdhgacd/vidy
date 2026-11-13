/**
 * https://<host>/<token>.html for ExoClick. The token is the one baked into
 * this worker, so the other host's file is left to the normal 404.
 */
import { exoclickToken, exoclickVerifyResponse } from "../../src/lib/exoclick-verify";

interface VerifyEvent {
  url: URL;
  req: { method?: string };
}

export default function exoclickVerifyMiddleware(
  event: VerifyEvent,
  next: () => unknown | Promise<unknown>,
): unknown | Promise<unknown> {
  const res = exoclickVerifyResponse(
    event.url.pathname,
    event.req.method || "GET",
    exoclickToken(),
  );
  if (!res) return next();
  return res;
}
