import { createFileRoute } from "@tanstack/react-router";
import { resolvePostersBucket } from "@/lib/poster-r2";
import { fixDmmCover, javCoverFromTitle } from "@/lib/catalog/local-shared";
import { checkImage, isPlaceholderMd5 } from "@/lib/image-guard";
import { resolvePuterinImage } from "@/lib/puterin-poster";

/** Putarin item for an id (putarin-latest feed), loaded lazily only on a full miss. */
async function putarinItem(id: string): Promise<{ id?: string; title?: string; category?: string } | null> {
  if (!/^[A-Za-z0-9]{6,20}$/.test(id)) return null;
  const feed = (await import("../../data/putarin-latest.json").then((m) => m.default).catch(() => [])) as unknown;
  const list = (Array.isArray(feed) ? feed : ((feed as { items?: unknown[] })?.items ?? [])) as Array<{ id?: string; title?: string; category?: string }>;
  return list.find((it) => it?.id === id) || null;
}

// Poster maps are large: load them lazily (only on an edge-cache + R2 miss) instead of parsing
// them in every isolate at boot.
async function sourceFor(id: string): Promise<string> {
  const [posters, javPosters, latestPosters, folderBatch20261007, drpBokepBatch, itemOverrides] = await Promise.all([
    import("@/lib/catalog/posters.json").then((m) => m.default),
    import("@/lib/catalog/jav-posters.json").then((m) => m.default),
    import("../../data/latest-posters.json").then((m) => m.default),
    import("@/lib/catalog/folder-batch-20261007.json").then((m) => m.default),
    import("../../data/drp-bokep.json").then((m) => m.default),
    import("@/lib/catalog/overrides.json").then((m) => m.default),
  ]);
  const maps = [posters, javPosters, latestPosters] as Array<Record<string, string>>;
  for (const map of maps) {
    const url = map?.[id];
    if (typeof url === "string" && url.startsWith("http")) return fixDmmCover(url);
  }
  const ov = (itemOverrides as Record<string, { poster?: string }>)[id];
  if (ov && typeof ov.poster === "string" && ov.poster.startsWith("http")) return ov.poster;
  // Folder-ingest batches (and the /kategori/bokep import) carry their poster on the item itself.
  for (const it of [
    ...(folderBatch20261007 as Array<{ id?: string; poster?: string }>),
    ...(drpBokepBatch as Array<{ id?: string; poster?: string }>),
  ]) {
    if (it?.id === id && typeof it.poster === "string" && it.poster.startsWith("http")) return it.poster;
  }
  return "";
}

function keyFor(id: string): string {
  return `posters/typed/${id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
}

function sniffType(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf.slice(0, 16));
  if (b[0] === 0xff && b[1] === 0xd8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return "image/webp";
  return "";
}

function imageResponse(body: BodyInit, type: string): Response {
  return new Response(body, {
    headers: {
      "content-type": type,
      // Saved in R2 once, never changes for an id: keep it for 30 days in browser and edge cache.
      "cache-control": "public, max-age=2592000, stale-while-revalidate=604800",
    },
  });
}

/**
 * No stored/remote poster (or the host is dead): redirect to the site's own brand poster
 * (public/brand-poster-6x5.jpg, a static asset served without the Worker) instead of a 404, so
 * Google's video indexing never sees an unreachable thumbnail. The card (thumb.tsx) sees the
 * redirected URL and draws the logo centered (object-contain) instead of cropping it as a photo.
 * Short cache + not saved to R2, so a real poster added later still takes over.
 */
async function fallback(request: Request): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: {
      location: new URL("/brand-poster-6x5.jpg", request.url).toString(),
      "cache-control": "public, max-age=300",
      "x-thumb-fallback": "1",
    },
  });
}

/** Fallback redirect kept in the edge cache (5 min) so repeated misses skip R2 and the poster lookup. */
async function cachedFallback(request: Request): Promise<Response> {
  const res = await fallback(request);
  try {
    await caches.default.put(request, res.clone());
  } catch {
    /* cache optional */
  }
  return res;
}

/**
 * Videy videos have no remote poster: their frame is a static file grabbed by the videy-thumbs
 * workflow (public/videy-thumbs/<id>.jpg). /thumb/<id> (e.g. /pemilik "Upload terbaru") serves
 * that file through the static assets binding instead of the brand placeholder.
 */
async function videyStatic(id: string, request: Request): Promise<{ buf: ArrayBuffer; type: string } | null> {
  if (!/^[A-Za-z0-9]{4,40}$/.test(id)) return null;
  try {
    const mod = (await import("cloudflare:workers")) as { env?: { ASSETS?: { fetch: (r: Request | string) => Promise<Response> } } };
    const assets = mod.env?.ASSETS;
    if (!assets) return null;
    const res = await assets.fetch(new Request(new URL(`/videy-thumbs/${id}.jpg`, request.url).toString()));
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 800 || sniffType(buf) !== "image/jpeg") return null;
    return { buf, type: "image/jpeg" };
  } catch {
    return null;
  }
}


export function cleanPosterId(id: string): string {
  return String(id || "").replace(/\.(jpg|jpeg|webp|png)$/i, "");
}

/** R2 object for the JPEG share-card copy (separate from the on-site /thumb poster). */
export function ogJpegKey(id: string): string {
  const clean = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return clean ? `posters/og-jpeg/${clean}` : "";
}

export async function loadPosterBuffer(id: string, request: Request): Promise<{ buf: ArrayBuffer; type: string } | null> {
  const key = keyFor(id);
  if (!key || key === "posters/typed/") return null;
  const bucket = await resolvePostersBucket().catch(() => null);
  if (bucket) {
    const saved = await bucket.get(key).catch(() => null);
    if (saved && isPlaceholderMd5((saved as { etag?: string }).etag)) {
      await (bucket as { delete?: (k: string) => Promise<unknown> }).delete?.(key).catch(() => undefined);
    } else if (saved) {
      const buf = await saved.arrayBuffer();
      const type = sniffType(buf);
      if (buf.byteLength >= 800 && type) return { buf, type };
    }
  }

  let source = await sourceFor(id);
  if (!source) {
    source = await import("@/lib/catalog/local-cache")
      .then((m) => m.mergedPosterOf(id))
      .catch(() => "");
  }
  const pItem = source ? null : await putarinItem(id);
  if (pItem) {
    const dmm = javCoverFromTitle(String(pItem.title || ""));
    if (dmm) source = dmm;
    else {
      const pt = await resolvePuterinImage(id);
      if (pt) {
        if (bucket) await bucket.put(key, pt.buf, { httpMetadata: { contentType: pt.type } }).catch(() => undefined);
        return { buf: pt.buf, type: pt.type };
      }
    }
  }
  if (!source) return await videyStatic(id, request);
  const remote = await fetch(source, {
    headers: { "user-agent": "kdp-poster/1" },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!remote?.ok) return null;
  const buf = await remote.arrayBuffer().catch(() => null);
  const verdict = await checkImage(buf, remote.url || source);
  if (!buf || !verdict.ok) return null;
  if (bucket) {
    await bucket.put(key, buf, { httpMetadata: { contentType: verdict.type } }).catch(() => undefined);
  }
  return { buf, type: verdict.type };
}

export const Route = createFileRoute("/thumb/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const id = cleanPosterId(params.id || "");
          if (!id) return new Response(null, { status: 404 });
          let hit: Response | null = null;
          try {
            hit = (await caches.default.match(request)) || null;
          } catch {
            hit = null;
          }
          if (hit) return hit;

          const loaded = await loadPosterBuffer(id, request);
          if (!loaded) return await cachedFallback(request);
          const res = imageResponse(loaded.buf, loaded.type);
          try {
            await caches.default.put(request, res.clone());
          } catch {
            /* cache optional */
          }
          return res;
        } catch {
          return fallback(request);
        }
      },
    },
  },
});
