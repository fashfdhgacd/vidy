// TrafficStars display slots. Spot ids live in src/lib/ads/spots.ts.
// An empty id renders nothing and does not load a script.
import { useEffect, useRef } from "react";
import { slotScript, spotValue, type TrafficStarSlot } from "@/lib/ads/spots";

type SlotProps = {
  slot: TrafficStarSlot;
  kind: "p" | "s" | "ms" | "b";
  width?: number;
  height?: number;
  className?: string;
};

function TsSlot({ slot, kind, width, height, className = "" }: SlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const id = spotValue(slot);
  const src = slotScript(slot, kind);
  useEffect(() => {
    const host = ref.current;
    if (!host || !id || !src) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.dataset.tsSpot = id;
    if (width) script.dataset.tsWidth = String(width);
    if (height) script.dataset.tsHeight = String(height);
    host.appendChild(script);
    return () => {
      script.remove();
    };
  }, [id, src, width, height]);
  if (!id) return null;
  return (
    <div ref={ref} data-kdp-ad="trafficstars" data-ts-slot={slot} className={className} aria-label="Iklan" />
  );
}

/** Catalog card: 300x250 / native master spot. */
export function GridMasterspot({ className = "" }: { className?: string }) {
  return (
    <TsSlot
      slot="gridMasterspot"
      kind="ms"
      width={300}
      height={250}
      className={`block aspect-[300/250] overflow-hidden rounded-xl bg-surface-2 ${className}`}
    />
  );
}

/** 300x100 banner. */
export function Banner300x100({ className = "" }: { className?: string }) {
  return <TsSlot slot="banner300x100" kind="b" width={300} height={100} className={className} />;
}

/** In-page push. No box; the script places it. */
export function InPagePush() {
  return <TsSlot slot="inPagePush" kind="p" />;
}

/** Video slider. No box; the script places it. */
export function VideoSlider() {
  return <TsSlot slot="videoSlider" kind="s" />;
}
