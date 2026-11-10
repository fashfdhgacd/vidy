import assert from "node:assert/strict";
import test from "node:test";
import { gridAdsOn, popunderUrl, prerollUrl, slotScript, spotValue } from "./spots.ts";

test("every TrafficStars slot is off until an id is set", () => {
  assert.equal(spotValue("popunder"), "");
  assert.equal(spotValue("preroll"), "");
  assert.equal(spotValue("inPagePush"), "");
  assert.equal(spotValue("videoSlider"), "");
  assert.equal(spotValue("gridMasterspot"), "");
  assert.equal(spotValue("banner300x100"), "");
  assert.equal(popunderUrl(), "");
  assert.equal(prerollUrl(), "");
  assert.equal(slotScript("inPagePush", "p"), "");
  assert.equal(slotScript("videoSlider", "s"), "");
  assert.equal(slotScript("gridMasterspot", "ms"), "");
  assert.equal(slotScript("banner300x100", "b"), "");
  assert.equal(gridAdsOn(), false);
});
