import assert from "node:assert/strict";
import test from "node:test";
import {
  activeScript,
  activeVast,
  buildAds,
  popunderLink,
  videqsssZones,
  videyyZones,
} from "./ads-config.ts";
import { EXO_FREQUENCY_COUNT, isIndoAvPlayback, pagePopDecision } from "./exo-popunder.ts";
import { PAGE_POP_MAX_PER_DAY } from "../page-pop-cap.ts";

test("each host uses only its own ExoClick popunder", () => {
  for (const [zone, other] of [
    [videyyZones, videqsssZones],
    [videqsssZones, videyyZones],
  ] as const) {
    const ads = buildAds(zone);
    assert.equal(ads.network, "exoclick");
    assert.equal(ads.popunder.enabled, true);
    assert.equal(ads.popunder.zoneId, zone.popunder);
    assert.match(ads.popunder.script, new RegExp(`"idzone": ${zone.popunder}`));
    assert.equal(ads.popunder.script.includes(other.popunder), false);
    assert.equal(ads.popunder.script.includes(other.banner300x250), false);
    assert.match(ads.popunder.script, new RegExp(`"frequency_count": ${EXO_FREQUENCY_COUNT}`));
    assert.ok(EXO_FREQUENCY_COUNT > PAGE_POP_MAX_PER_DAY);
    assert.match(ads.popunder.script, /"trigger_class": "kdp-no-pop"/);
    assert.equal(ads.popunder.vastUrl, "");
    assert.match(popunderLink(ads.popunder), new RegExp(`idzone=${zone.popunder}`));
    assert.equal(popunderLink(ads.popunder).includes(other.popunder), false);
  }
});

test("banner, slider, push, and VAST stay wired but do not load", () => {
  const ads = buildAds(videyyZones);
  assert.equal(ads.banner300x250.zoneId, videyyZones.banner300x250);
  assert.equal(ads.videoSlider.zoneId, videyyZones.videoSlider);
  assert.equal(ads.inPagePush.zoneId, videyyZones.inPagePush);
  assert.equal(ads.preroll.zoneId, videyyZones.preroll);
  assert.equal(ads.preroll.vastUrl, videyyZones.vastUrl);
  for (const spot of [ads.banner300x250, ads.videoSlider, ads.inPagePush, ads.preroll]) {
    assert.equal(spot.enabled, false);
    assert.equal(spot.script, "");
    assert.equal(activeScript(spot), "");
  }
  assert.equal(activeVast(ads.preroll), "");
  assert.equal(ads.banner300x250.enabled && ads.banner300x250.script, false);
});

test("page popunder stays off on IndoAV and when the daily cap is full", () => {
  assert.equal(isIndoAvPlayback("IndoAV", "https://example.com/e/1"), true);
  assert.equal(isIndoAvPlayback("Videy", "https://tv1.indoav.app/e/1"), true);
  assert.equal(isIndoAvPlayback("UserBokep", "https://tv1.userbokep.com/e/1"), false);
  assert.equal(pagePopDecision({ pageAd: null, allowed: true, enabled: true }), "arm");
  assert.equal(pagePopDecision({ pageAd: "on", allowed: true, enabled: true }), "arm");
  assert.equal(pagePopDecision({ pageAd: "off", allowed: true, enabled: true }), "hold");
  assert.equal(pagePopDecision({ pageAd: "wait", allowed: true, enabled: true }), "hold");
  assert.equal(pagePopDecision({ pageAd: null, allowed: false, enabled: true }), "hold");
  assert.equal(pagePopDecision({ pageAd: null, allowed: true, enabled: false }), "hold");
});
