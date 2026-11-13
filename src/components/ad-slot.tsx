// Display slots. Zone ids live in src/lib/ads/spots.ts. A disabled slot (empty script)
// renders nothing and does not load a network script. The popunder is not a box.
import { useEffect, useRef } from "react";
import { ADS, type AdSpot } from "@/lib/ads/spots";

function DisplaySlot({ spot, className = "" }: { spot: AdSpot; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !spot.enabled || !spot.script) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = spot.script;
    script.dataset.exoZone = spot.zoneId;
    host.appendChild(script);
    return () => {
      script.remove();
    };
  }, [spot.enabled, spot.script, spot.zoneId]);
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

/** Banner. Off while the slot is disabled. There is no 300x100 zone. */
export function Banner300x100({ className = "" }: { className?: string }) {
  return <DisplaySlot spot={ADS.banner300x250} className={className} />;
}

/** In-page push. Off while the slot is disabled. */
export function InPagePush() {
  return <DisplaySlot spot={ADS.inPagePush} />;
}

/** Video slider. Off while the slot is disabled. */
export function VideoSlider() {
  return <DisplaySlot spot={ADS.videoSlider} />;
}
