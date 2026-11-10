/** Temporary: surface the real SSR exception. Remove after videqsss is healthy. */
interface ErrEvent {
  url: URL;
}

export default async function errorMiddleware(
  _event: ErrEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  try {
    return await next();
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack || ""}` : String(err);
    return new Response(message.slice(0, 5000), {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
