import assert from "node:assert/strict";
import test from "node:test";
import {
  EXO_AD_PROVIDER,
  EXO_INS_CLASS,
  activeScript,
  activeVast,
  buildAds,
  popunderLink,
  videqsssZones,
  videyyZones,
} from "./ads-config.ts";

test("each host uses only its own ExoClick zones", () => {
  for (const [zone, other] of [
    [videyyZones, videqsssZones],
    [videqsssZones, videyyZones],
  ] as const) {
    const ads = buildAds(zone);
    assert.equal(ads.network, "exoclick");
    assert.equal(ads.popunder.enabled, true);
    assert.equal(ads.popunder.zoneId, zone.popunder);
    // No popunder embed script: it would pop on browsing clicks. Only the direct link (player tap) exists.
    assert.equal(ads.popunder.script, "");
    assert.equal(ads.popunder.vastUrl, "");
    assert.match(popunderLink(ads.popunder), new RegExp(`idzone=${zone.popunder}`));
    assert.equal(popunderLink(ads.popunder).includes(other.popunder), false);

    assert.equal(ads.banner300x250.enabled, false);
    assert.equal(ads.banner300x250.zoneId, zone.banner300x250);
    assert.equal(ads.banner300x250.script, "");
    assert.equal(ads.banner300x250.insClass, EXO_INS_CLASS.banner300x250);
    assert.equal(ads.banner300x250.zoneId === other.banner300x250, false);
    // In-page push is on again (it was switched off on 27 Nov, which cut ExoClick revenue).
    assert.equal(ads.inPagePush.enabled, true);
    assert.equal(ads.inPagePush.zoneId, zone.inPagePush);
    assert.equal(ads.inPagePush.script, EXO_AD_PROVIDER);
    assert.equal(ads.inPagePush.insClass, EXO_INS_CLASS.inPagePush);
    assert.equal(ads.inPagePush.zoneId === other.inPagePush, false);
    assert.equal(activeScript(ads.banner300x250), "");
    assert.equal(activeScript(ads.inPagePush), EXO_AD_PROVIDER);
  }
});

test("slider and VAST stay wired but do not load", () => {
  const ads = buildAds(videyyZones);
  assert.equal(ads.videoSlider.zoneId, videyyZones.videoSlider);
  assert.equal(ads.videoSlider.insClass, EXO_INS_CLASS.videoSlider);
  assert.equal(ads.preroll.zoneId, videyyZones.preroll);
  assert.equal(ads.preroll.vastUrl, videyyZones.vastUrl);
  for (const spot of [ads.videoSlider, ads.preroll]) {
    assert.equal(spot.enabled, false);
    assert.equal(spot.script, "");
    assert.equal(activeScript(spot), "");
  }
  assert.equal(activeVast(ads.preroll), "");
});
