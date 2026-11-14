import { isIndoAvCreator, NO_POP_CLASS } from "@/lib/ads/exo-popunder";
import { cleanDisplayTitle } from "@/lib/seo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoCard as VideoCardType } from "@/lib/catalog/types";
import { isRealMinor } from "@/lib/minor-terms";
import { CardThumb } from "./card-thumb";
import { posterProbeOk } from "@/lib/catalog/poster-known";
import { videyFrameReady } from "@/lib/catalog/poster-status";

const ROTATE_MS = 60 * 60 * 1000;

type HeroProps = {
  video?: VideoCardType;
  videos?: VideoCardType[];
  intervalMs?: number;
};

function isSpamDescription(text: unknown): boolean {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) return true;
  return /nonton .+ bokep indo|streaming amatir, jilbab|konten 18\+/i.test(t);
}

function cleanHeroTitle(raw: string): string {
  return cleanDisplayTitle(raw);
}

function hasRealPoster(id: string): boolean {
  return posterProbeOk(id) || videyFrameReady(id);
}

export function Hero({ video, videos, intervalMs = ROTATE_MS }: HeroProps) {
  const usable = useMemo(() => {
    const incoming = videos && videos.length > 0 ? videos : video ? [video] : [];
    return incoming.filter((v) => hasRealPoster(v.id) && !isRealMinor({ title: v.title, tags: v.category }));
  }, [videos, video]);
  const usableKey = usable.map((v) => v.id).join("|");
  const [index, setIndex] = useState(0);

  const goTo = useCallback(
    (nextIdx: number) => {
      const len = usable.length;
      if (len <= 0) return;
      const next = ((nextIdx % len) + len) % len;
      setIndex((prev) => (prev === next ? prev : next));
    },
    [usable.length],
  );

  useEffect(() => {
    if (usable.length <= 1) {
      setIndex(0);
      return;
    }
    const tick = () => {
      const next = Math.floor(Date.now() / intervalMs) % usable.length;
      goTo(next);
    };
    tick();
    const wait = Math.max(1000, intervalMs - (Date.now() % intervalMs) + 40);
    let timeoutId = window.setTimeout(function arm() {
      tick();
      timeoutId = window.setTimeout(arm, intervalMs);
    }, wait);
    return () => window.clearTimeout(timeoutId);
  }, [usableKey, usable.length, intervalMs, goTo]);

  useEffect(() => {
    if (!usable.length) return;
    if (index >= usable.length) setIndex(0);
  }, [usable.length, index]);

  const current = usable[Math.min(index, Math.max(0, usable.length - 1))];

  if (!current) return null;

  const showDuration = Boolean(current.durationLabel && current.durationLabel !== "\u2014");
  const showDescription = !isSpamDescription(current.description);
  const displayIndex = Math.min(index, Math.max(0, usable.length - 1));
  const heroTitle = cleanHeroTitle(current.title);

  return (
    // isolate + z-0: keep the hero's internal layering from competing with page content below
    <section
      className="relative z-0 isolate overflow-hidden rounded-2xl bg-surface sm:rounded-[28px]"
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-[21/9]">
        {/* Decorative media — never steal taps meant for the CTA or page below */}
        <div className="pointer-events-none absolute inset-0">
          <CardThumb
            key={current.id}
            id={current.id}
            src={current.thumbnail}
            alt={heroTitle}
            eager
            className="size-full object-cover object-center transition-opacity duration-300"
          />
        </div>

        {/* Text-legibility gradient: desktop only. Mobile is image + play, no overlay copy. */}
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-background via-background/50 to-background/10 md:block" />

        {/* Mobile (< md): whole hero tappable, centered modest play (48px). Title kept as sr-only for SEO/a11y. */}
        <Link
          to="/watch/$id"
          params={{ id: current.id }}
          className={`absolute inset-0 z-10 flex items-center justify-center touch-manipulation md:hidden${isIndoAvCreator(current.creator) ? ` ${NO_POP_CLASS}` : ""}`}
          aria-label={`Putar ${heroTitle}`}
        >
          <span
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_1px_color-mix(in_oklab,#f2f0fa_12%,transparent)]"
            aria-hidden="true"
          >
            <Play className="size-4 fill-current" style={{ marginLeft: 2 }} />
          </span>
        </Link>
        {/* h2, not h1: the page H1 is the brand heading below the hero (one H1 per page). */}
        <h2 className="sr-only md:hidden">{heroTitle}</h2>

        {/* Desktop (md+): same copy stack as before (label, title, meta, Putar sekarang). */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden flex-col gap-4 p-8 pb-12 md:flex lg:max-w-2xl lg:p-10 lg:pb-14">
          <p className="w-fit rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
            Pilihan koleksi
            {usable.length > 1 ? (
              <span className="ml-2 tabular-nums text-white/70">
                {displayIndex + 1}/{usable.length}
              </span>
            ) : null}
          </p>
          <h2 className="font-display text-2xl leading-tight text-foreground line-clamp-3 break-words lg:text-3xl">
            {heroTitle}
          </h2>
          {showDescription ? (
            <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-muted">
              {current.description}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            {current.year ? <span>{current.year}</span> : null}
            {showDuration ? <span>{current.durationLabel}</span> : null}
            {current.category ? <span>{current.category}</span> : null}
          </div>
          <div className="pointer-events-auto pt-0.5">
            <Button asChild size="default" className="h-11 rounded-lg px-5 text-base">
              <Link to="/watch/$id" params={{ id: current.id }} className={isIndoAvCreator(current.creator) ? NO_POP_CLASS : ""}>
                <Play className="size-4 fill-current" style={{ marginLeft: 2 }} />
                Putar sekarang
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
