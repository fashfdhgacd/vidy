// Catalog grids (`ads` / `catalog` props) are laid out like the main site (koleksidrpinguin.com):
// phone 1 full-width column, laptop 3 columns in a wide container, rows of equal height, 16:10 thumbs,
// exactly 6 grid ad cards per breakpoint (src/lib/grid-ads.ts: phone after every 4th video, laptop after
// videos 2, 7, 12 ... so the banner sits in column 3 of rows 1, 3, 5) and trailing videos hidden per
// breakpoint so no row has a hole. The watch page ("Tonton juga") keeps the default 2 / 3 / 4 grid.
import type { VideoCard as VideoCardType } from "@/lib/catalog/types";
import { isRealMinor } from "@/lib/minor-terms";
import { Skeleton } from "@/components/ui/skeleton";
import { GridAd } from "@/components/grid-ad";
import { planGrid } from "@/lib/grid-ads";
import { VideoCard } from "./video-card";
import { useEffect } from "react";
import { restoreCatalogScroll } from "@/lib/catalog/last-catalog";

const DEFAULT_GRID =
  "grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-7 lg:grid-cols-4";
const CATALOG_GRID =
  "relative left-1/2 grid w-full max-w-screen-2xl -translate-x-1/2 auto-rows-fr grid-cols-1 gap-3 lg:w-[calc(100%+2rem)] lg:grid-cols-3 lg:gap-4";

/** Show a cell on one breakpoint only (lg = laptop). */
const BP_ONLY = { mobile: "lg:hidden", desktop: "hidden lg:block" } as const;
/** Hide classes for a video cell by [hidden on mobile][hidden on desktop]. */
const HIDE: Record<string, string> = { "00": "", "10": "hidden lg:block", "01": "lg:hidden", "11": "hidden" };

function visibleCards(items: VideoCardType[]): VideoCardType[] {
  return items.filter((video) => !isRealMinor({ title: video.title, tags: video.category }));
}

export function VideoGrid({
  items,
  eagerCount = 4,
  catalog = false,
  ads = false,
}: {
  items: VideoCardType[];
  eagerCount?: number;
  catalog?: boolean;
  ads?: boolean;
}) {
  const shown = visibleCards(items);
  // "Kembali ke katalog" with a full load: scroll back to where the card was clicked.
  const hasItems = shown.length > 0;
  useEffect(() => {
    if (ads && hasItems) restoreCatalogScroll();
  }, [ads, hasItems]);
  return (
    <div className={catalog || ads ? CATALOG_GRID : DEFAULT_GRID}>
      {/* Exactly 6 ads per breakpoint on every page, each its own zone (src/lib/grid-ads.ts); trailing videos
          hidden per breakpoint so rows stay full. Flat list with stable keys: a re-render keeps every mounted
          ad slot (no second request). */}
      {planGrid(shown.length, ads).map((cell) => {
        if (cell.kind === "ad") {
          return <GridAd key={cell.key} slot={cell.slot} className={BP_ONLY[cell.breakpoint]} />;
        }
        const video = shown[cell.index];
        const hide = HIDE[`${cell.hidden.mobile ? 1 : 0}${cell.hidden.desktop ? 1 : 0}`];
        return hide ? (
          <div key={video.id} className={hide}>
            <VideoCard catalog={catalog} video={video} eager={cell.index < eagerCount} />
          </div>
        ) : (
          <VideoCard key={video.id} catalog={catalog} video={video} eager={cell.index < eagerCount} />
        );
      })}
    </div>
  );
}

export function VideoGridSkeleton({ count = 12, catalog = false }: { count?: number; catalog?: boolean }) {
  return (
    <div className={catalog ? CATALOG_GRID : DEFAULT_GRID}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-1 sm:p-1.5">
          <Skeleton className={catalog ? "aspect-[16/10] rounded-none" : "aspect-video rounded-xl"} />
          <Skeleton className="mt-3 h-4 w-4/5 rounded-sm" />
          <Skeleton className="mt-2 h-3 w-1/3 rounded-sm" />
        </div>
      ))}
    </div>
  );
}
