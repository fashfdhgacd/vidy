import { cardThumbHtml } from "@/lib/catalog/poster-status";
import { posterProbeOk } from "@/lib/catalog/poster-known";

/**
 * Catalog card image. The src is chosen from the sync-time poster cache (R2 when that URL
 * exists, otherwise a source thumbnail already in the data, otherwise the brand poster).
 * The onerror attribute is in the HTML, so a 404 swaps to the brand poster before hydration.
 */
export function CardThumb({
  id,
  src,
  alt,
  eager = false,
  className,
}: {
  id: string;
  src: string;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  const html = cardThumbHtml({
    id,
    stored: src,
    alt,
    ok: posterProbeOk(id),
    eager,
    className,
  });
  return <div className="contents" dangerouslySetInnerHTML={{ __html: html }} />;
}
