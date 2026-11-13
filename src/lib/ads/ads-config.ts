/**
 * Per-host ExoClick zones. The client bundle imports only one of these objects
 * (spots.ts), so a videyy build does not contain videqsss zone ids.
 */
import { popunderScriptBody } from "./exo-popunder.ts";

export type AdNetwork = "exoclick";

export type AdSpot = {
  zoneId: string;
  /** Inline embed or script URL. Empty: this slot loads nothing. */
  script: string;
  /** VAST tag. The player requests it only when the spot is enabled. */
  vastUrl: string;
  enabled: boolean;
};

export type AdsConfig = {
  network: AdNetwork;
  popunder: AdSpot;
  /** 300x250 banner. No 300x100 zone exists. */
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
  return { zoneId, script: "", vastUrl, enabled: false };
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
    },
    banner300x250: off(zone.banner300x250),
    videoSlider: off(zone.videoSlider),
    inPagePush: off(zone.inPagePush),
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
