// Grid: 2 / 3 / 4 kolom (mobile / tablet / desktop) for the watch page; catalog grids 1 / 3 / 4.
// Catalog grids (`ads` prop): 1 / 3 / 4 columns, 16:10 thumbs, and a 300x250
// banner spot as every 8th card when that spot is enabled.
// The watch page ("Tonton juga") keeps the default grid unless ads is on.
import type { VideoCard as VideoCardType } from "@/lib/catalog/types";
import { isRealMinor } from "@/lib/minor-terms";
import { Skeleton } from "@/components/ui/skeleton";
import { GridMasterspot } from "@/components/ad-slot";
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
  // Up to 4 slots, every 8th card; each lazy-loads (an unfilled slot keeps its footprint, showing the penguin card).
  const slots = ads
    ? AD_POSITIONS.map((at, slot) => ({ at, slot })).filter((x) => x.at < shown.length)
    : [];
  const cells = shown.length + slots.length;
  // "Kembali ke katalog" with a full load: scroll back to where the card was clicked.
  const hasItems = shown.length > 0;
  useEffect(() => {
    if (ads && hasItems) restoreCatalogScroll();
  }, [ads, hasItems]);
  return (
    <div
      className={catalog ? CATALOG_GRID + trimClass(cells) : DEFAULT_GRID}
    >
      {shown.map((video, index) => {
        const s = slots.find((x) => x.at === index);
        return (
          <Cell
            key={video.id}
            ad={s ? <GridMasterspot key={`ts-grid-${s.slot}`} /> : null}
          >
            <VideoCard catalog={catalog} video={video} eager={index < eagerCount} />
          </Cell>
        );
      })}
    </div>
  );
}

const AD_POSITIONS = [7, 14, 21, 28]; // every 8th card (cells 8, 16, 24, 32)

function Cell({ ad, children }: { ad: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      {ad}
      {children}
    </>
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
