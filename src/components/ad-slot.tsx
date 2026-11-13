// Display slots. Zone ids live in src/lib/ads/spots.ts. A disabled slot (empty script)
// renders nothing and does not load a network script. The popunder is not a box.
// Banner and in-page push stay off on IndoAV watch pages (data-kdp-page-ad=off|wait).
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { displayAdsAllowed, type PageAdMark } from "@/lib/ads/exo-popunder";
import { ADS, type AdSpot } from "@/lib/ads/spots";

function pageAdMark(): PageAdMark {
  const el = document.querySelector("[data-kdp-page-ad]");
  const value = el?.getAttribute("data-kdp-page-ad");
  if (value === "off" || value === "on" || value === "wait") return value;
  return null;
}

/** False on IndoAV watch pages (and while the watch page is still resolving the host). */
function useDisplayAdsAllowed(): boolean {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const href = useRouterState({ select: (s) => s.location.href });
  const watch = pathname === "/watch" || pathname.startsWith("/watch/");
  const [allowed, setAllowed] = useState(!watch);
  const [seenHref, setSeenHref] = useState(href);
  if (href !== seenHref) {
    setSeenHref(href);
    setAllowed(!watch);
  }
  useEffect(() => {
    const sync = () => setAllowed(displayAdsAllowed(pageAdMark()));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-kdp-page-ad"],
    });
    return () => mo.disconnect();
  }, [href, watch]);
  return allowed;
}

function ensureExoProvider(src: string): void {
  if (document.querySelector("script[data-kdp-exo-provider]")) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  script.dataset.kdpExoProvider = "1";
  document.head.appendChild(script);
}

function DisplaySlot({ spot, className = "" }: { spot: AdSpot; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !spot.enabled || !spot.script || !spot.zoneId) return;
    host.replaceChildren();
    const ins = document.createElement("ins");
    if (spot.insClass) ins.className = spot.insClass;
    ins.setAttribute("data-zoneid", spot.zoneId);
    host.appendChild(ins);
    ensureExoProvider(spot.script);
    const w = window as Window & { AdProvider?: Array<{ serve: Record<string, never> }> };
    w.AdProvider = w.AdProvider || [];
    w.AdProvider.push({ serve: {} });
    return () => {
      host.replaceChildren();
    };
  }, [spot.enabled, spot.script, spot.zoneId, spot.insClass]);
  if (!spot.enabled || !spot.script || !spot.zoneId) return null;
  return <div ref={ref} data-kdp-ad="exoclick" className={className} aria-label="Iklan" />;
}

/** Catalog card. Off while banner300x250 is disabled. */
export function GridMasterspot({ className = "" }: { className?: string }) {
  return (
    <DisplaySlot
      spot={ADS.banner300x250}
      className={`block aspect-[300/250] overflow-hidden rounded-xl bg-surface-2 ${className}`}
    />
  );
}

/** 300x250 banner. There is no 300x100 zone. */
export function Banner300x250({ className = "" }: { className?: string }) {
  return <DisplaySlot spot={ADS.banner300x250} className={className} />;
}

/** @deprecated Alias of Banner300x250 (the only display banner size). */
export function Banner300x100({ className = "" }: { className?: string }) {
  return <Banner300x250 className={className} />;
}

/** In-page push. Off while the slot is disabled, and never on IndoAV watch pages. */
export function InPagePush() {
  const allowed = useDisplayAdsAllowed();
  if (!allowed) return null;
  return <DisplaySlot spot={ADS.inPagePush} />;
}

/** Video slider. Off while the slot is disabled. */
export function VideoSlider() {
  return <DisplaySlot spot={ADS.videoSlider} />;
}
