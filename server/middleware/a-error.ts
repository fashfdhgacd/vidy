/** Temporary: surface the real SSR exception. Remove after videqsss is healthy. */
interface ErrEvent {
  url: URL;
}

export default async function errorMiddleware(
  event: ErrEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  if (event.url.pathname === "/__mw") {
    return new Response("mw-live", { status: 200, headers: { "content-type": "text/plain", "cache-control": "no-store" } });
  }
  const orig = console.error;
  let captured = "";
  console.error = (...args: unknown[]) => {
    captured = args
      .map((a) => {
        if (a instanceof Error) return `${a.name}: ${a.message}\n${a.stack || ""}\n${JSON.stringify(a, Object.getOwnPropertyNames(a))}`;
        if (typeof a === "object" && a) return JSON.stringify(a, Object.getOwnPropertyNames(a));
        return String(a);
      })
      .join("\n")
      .slice(0, 8000);
    orig.apply(console, args);
  };
  try {
    const res = await next();
    if (res instanceof Response && res.status >= 500 && captured) {
      return new Response(captured, {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return res;
  } finally {
    console.error = orig;
  }
}
