/**
 * Per-host ExoClick zones. The client bundle imports only one of these objects
 * (spots.ts), so a videyy build does not contain videqsss zone ids.
 */
import { popunderScriptBody } from "./exo-popunder.ts";

export type AdNetwork = "exoclick";

/** Official ExoClick ad-provider script (banner, in-page push, slider). */
export const EXO_AD_PROVIDER = "https://a.magsrv.com/ad-provider.js";

/** `ins` class names from the official ExoClick embeds. */
export const EXO_INS_CLASS = {
  banner300x250: "eas6a97888e2",
  inPagePush: "eas6a97888e42",
  videoSlider: "eas6a97888e31",
} as const;

export type AdSpot = {
  zoneId: string;
  /** Script URL or inline popunder body. Empty: this slot loads nothing. */
  script: string;
  /** VAST tag. The player requests it only when the spot is enabled. */
  vastUrl: string;
  enabled: boolean;
  /** ExoClick <ins> class for display slots. Empty for popunder/VAST. */
  insClass: string;
};

export type AdsConfig = {
  network: AdNetwork;
  popunder: AdSpot;
  /** 300x250 banner leftover (grid uses src/lib/grid-ads.ts). Kept wired, disabled. */
  banner300x250: AdSpot;
  videoSlider: AdSpot;
  inPagePush: AdSpot;
  preroll: AdSpot;
};

export type ZoneSet = {
  popunder: string;
  banner300x250: string;
  videoSlider: string;
  inPagePush: string;
  preroll: string;
  vastUrl: string;
};

export const videyyZones: ZoneSet = {
  popunder: "6088480",
  banner300x250: "6088478",
  videoSlider: "6088482",
  inPagePush: "6088486",
  preroll: "6088484",
  vastUrl: "https://s.magsrv.com/v1/vast.php?idz=6088484",
};

export const videqsssZones: ZoneSet = {
  popunder: "6088490",
  banner300x250: "6088488",
  videoSlider: "6088492",
  inPagePush: "6088496",
  preroll: "6088494",
  vastUrl: "https://s.magsrv.com/v1/vast.php?idz=6088494",
};

function off(zoneId: string, vastUrl = ""): AdSpot {
  return { zoneId, script: "", vastUrl, enabled: false, insClass: "" };
}

function displaySpot(zoneId: string, insClass: string, enabled: boolean): AdSpot {
  return {
    zoneId,
    script: enabled && zoneId ? EXO_AD_PROVIDER : "",
    vastUrl: "",
    enabled: Boolean(enabled && zoneId),
    insClass,
  };
}

export function buildAds(zone: ZoneSet): AdsConfig {
  const script = popunderScriptBody(zone.popunder);
  const own = script.includes(`"idzone": ${zone.popunder}`);
  return {
    network: "exoclick",
    popunder: {
      zoneId: zone.popunder,
      script: own ? script : "",
      vastUrl: "",
      enabled: own,
      insClass: "",
    },
    banner300x250: displaySpot(zone.banner300x250, EXO_INS_CLASS.banner300x250, false),
    videoSlider: displaySpot(zone.videoSlider, EXO_INS_CLASS.videoSlider, false),
    inPagePush: displaySpot(zone.inPagePush, EXO_INS_CLASS.inPagePush, false),
    preroll: off(zone.preroll, zone.vastUrl),
  };
}

export function popunderLink(spot: AdSpot): string {
  if (!spot.enabled || !spot.zoneId) return "";
  return `https://s.pemsrv.com/v1/link.php?idzone=${encodeURIComponent(spot.zoneId)}&type=8`;
}

export function activeVast(spot: AdSpot): string {
  return spot.enabled ? spot.vastUrl : "";
}

export function activeScript(spot: AdSpot): string {
  return spot.enabled ? spot.script : "";
}
