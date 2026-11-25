import { isIndoAvCreator, NO_POP_CLASS } from "@/lib/ads/exo-popunder";
import { useTr } from "@/lib/ui-lang";
import { IS_VIDEQSSS, cleanDisplayTitle } from "@/lib/seo";
import { Link } from "@tanstack/react-router";
import { Clock, Eye, Heart, Play } from "lucide-react";
import type { VideoCard as VideoCardType } from "@/lib/catalog/types";
import { rememberCatalog } from "@/lib/catalog/last-catalog";
import { useSiteLikes } from "@/lib/live-likes";
import { CardThumb } from "./card-thumb";

function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}

type VideoCardPreload = false | "intent" | "viewport";

export function VideoCard({
  video,
  catalog = false,
  eager = false,
  preload = false,
}: {
  video: VideoCardType;
  catalog?: boolean;
  eager?: boolean;
  preload?: VideoCardPreload;
}) {
  const tr = useTr();
  const en = tr("id", "en") === "en";
  // 0 is shown too (own-pageview sources start at 0); null = no count known.
  const views = typeof video.views === "number" && video.views >= 0 ? video.views : null;
  // Likes = source likes (folder stats) + our own D1 likes, 0 when none. Our likes start from the
  // 12-hour snapshot and switch to the live count (/api/likes-live, ~60 s) once the page has loaded.
  // Always shown, so every card has the same plain stats row (never a bare category label).
  const ours = useSiteLikes(video.id, video.siteLikes);
  const likes = Math.max(0, typeof video.likes === "number" ? video.likes : 0) + ours;
  const showDuration = Boolean(video.durationLabel && video.durationLabel !== "\u2014");

  return (
    <Link
      to="/watch/$id"
      params={{ id: video.id }}
      preload={preload}
      onClick={() => rememberCatalog()}
      className={
        (isIndoAvCreator(video.creator) ? `${NO_POP_CLASS} ` : "") +
        (catalog ? "rounded-none " : IS_VIDEQSSS ? "rounded-lg " : "rounded-xl ") +
        (IS_VIDEQSSS
          ? "group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b942]"
          : "group block p-1 transition-colors duration-150 ease-out hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-1.5")
      }
    >
      <div className={catalog ? "relative aspect-[16/10] overflow-hidden rounded-none bg-surface-2" : IS_VIDEQSSS ? "relative aspect-video overflow-hidden rounded-lg bg-surface-2" : "relative aspect-video overflow-hidden rounded-xl bg-surface-2"}>
        <CardThumb
          id={video.id}
          src={typeof video.thumbnail === "string" ? video.thumbnail : ""}
          alt={cleanDisplayTitle(video.title)}
          eager={eager}
        />
        {IS_VIDEQSSS ? null : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-80" />
        )}
        {video.isNew ? (
          <span className="pointer-events-none absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground sm:text-[11px]">
            {tr("Baru", "New")}
          </span>
        ) : null}
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:flex">
          <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Play className="size-4 fill-current" style={{ marginLeft: 2 }} />
          </span>
        </div>
      </div>
      <div className="px-1 pb-1 pt-2.5 sm:px-1.5 sm:pt-3">
        <h3 className="line-clamp-2 min-h-[2.5em] text-[13px] font-medium leading-snug text-foreground sm:text-[15px]">
          {cleanDisplayTitle(video.title)}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted sm:text-xs">
          {typeof video.periodViews === "number" && video.periodLabel ? (
            <span
              className="inline-flex items-center gap-1"
              aria-label={tr(`${video.periodViews} kali ditonton ${video.periodLabel}`, `${video.periodViews} views ${video.periodLabel}`)}
            >
              <Eye className="size-3.5" aria-hidden="true" />
              {video.periodViews.toLocaleString(en ? "en-US" : "id-ID")} {tr("tayangan", "views")} {video.periodLabel}
            </span>
          ) : views != null ? (
            <span className="inline-flex items-center gap-1" aria-label={tr(`${views} kali ditonton`, `${views} views`)}>
              <Eye className="size-3.5" aria-hidden="true" />
              {compactNumber(views)}
            </span>
          ) : null}
          {showDuration ? (
            <span className="inline-flex items-center gap-1" aria-label={tr("Durasi", "Duration")}>
              <Clock className="size-3.5" aria-hidden="true" />
              {en ? video.durationLabel?.replace(/(\d+)j\b/, "$1h") : video.durationLabel}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1" aria-label={tr(`${likes} suka`, `${likes} likes`)}>
            <Heart className="size-3.5" aria-hidden="true" />
            {compactNumber(likes)}
          </span>
        </div>
      </div>
    </Link>
  );
}
