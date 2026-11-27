// Grid: 2 / 3 / 4 kolom (mobile / tablet / desktop) for the watch page; catalog grids 1 / 3 / 4.
// Catalog grids (`ads` prop): 1 / 3 / 4 columns, 16:10 thumbs, and up to 6 grid
// ad slots (src/lib/grid-ads.ts: same positions as the main site). Empty slots collapse.
// The watch page ("Tonton juga") keeps the default grid unless ads is on.
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
  "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3 sm:gap-y-7 lg:grid-cols-4";

/**
 * Rows full: hide trailing videos so the cell count (videos + ads) is a multiple of the column
 * count, 3 on tablet (sm..lg) and 4 on laptop (lg+). Ads are divs, videos are links, so
 * nth-last-of-type only counts videos. Static strings so Tailwind generates them.
 */
const TRIM_SM = [
  "",
  " sm:max-lg:[&>a:nth-last-of-type(-n+1)]:hidden",
  " sm:max-lg:[&>a:nth-last-of-type(-n+2)]:hidden",
];
const TRIM_LG = [
  "",
  " lg:[&>a:nth-last-of-type(-n+1)]:hidden",
  " lg:[&>a:nth-last-of-type(-n+2)]:hidden",
  " lg:[&>a:nth-last-of-type(-n+3)]:hidden",
];
function trimClass(count: number): string {
  if (count <= 12) return "";
  return TRIM_SM[count % 3] + TRIM_LG[count % 4];
}

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
  const cells = planGrid(shown.length, ads);
  const cellCount = cells.length;
  return (
    <div
      className={catalog ? CATALOG_GRID + (ads ? "" : trimClass(cellCount)) : DEFAULT_GRID}
    >
      {cells.map((cell) => {
        if (cell.kind === "ad") {
          return (
            <GridAd
              key={cell.key}
              slot={cell.slot}
              className={cell.breakpoint === "mobile" ? "lg:hidden" : "hidden lg:block"}
            />
          );
        }
        const video = shown[cell.index];
        return <VideoCard key={video.id} catalog={catalog} video={video} eager={cell.index < eagerCount} />;
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
