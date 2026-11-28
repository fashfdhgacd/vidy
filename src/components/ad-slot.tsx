import { tr } from "@/lib/ui-lang";
// Display slots. Zone ids live in src/lib/ads/spots.ts. A disabled slot (empty script)
// renders nothing and does not load a network script. The popunder is not a box.
// Ads (banner, push) are not hidden on IndoAV pages any more: same rule as the main site.
import { useEffect, useRef, useState } from "react";
import { ADS, type AdSpot } from "@/lib/ads/spots";

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
  return <div ref={ref} data-kdp-ad="exoclick" className={className} aria-label={tr("Iklan", "Advertisement")} />;
}

/** Catalog card. Off while banner300x250 is disabled. */
export function GridMasterspot({ className = "" }: { className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const resize = () => setScale(Math.min(1, el.clientWidth / 300, el.clientHeight / 250));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const spot = ADS.banner300x250;
  if (!spot.enabled || !spot.script || !spot.zoneId) return null;
  return (
    <div ref={frame} className={`flex aspect-[16/10] items-center justify-center overflow-hidden rounded-none bg-transparent ${className}`}>
      <div className="h-[250px] w-[300px] shrink-0" style={{ transform: `scale(${scale})` }}>
        <DisplaySlot spot={spot} />
      </div>
    </div>
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

/** In-page push. Off while the slot is disabled. */
export function InPagePush() {
  return <DisplaySlot spot={ADS.inPagePush} />;
}

/** Video slider. Off while the slot is disabled. */
export function VideoSlider() {
  return <DisplaySlot spot={ADS.videoSlider} />;
}
