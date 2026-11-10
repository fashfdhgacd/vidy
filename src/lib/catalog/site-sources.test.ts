import assert from "node:assert/strict";
import test from "node:test";
import { allowsSource, videqsssUsesOwnCatalog } from "./site-sources.ts";

const config = {
  sites: {
    videyy: { enabled: true, sources: "all" as const },
    videqsss: { enabled: true, sources: ["indoav", "userbokep"] },
  },
};

test("videqsss keeps only IndoAV and UserBokep", () => {
  assert.equal(allowsSource({ embed: "https://tv1.indoav.app/e/a" }, "videqsss", config), true);
  assert.equal(allowsSource({ source: "UserBokep", embed: "https://tv1.userbokep.com/e/b" }, "videqsss", config), true);
  assert.equal(allowsSource({ embed: "https://cdn.videy.co/v.mp4", source: "Videy" }, "videqsss", config), false);
  assert.equal(allowsSource({ embed: "https://putarin.com/e/c" }, "videqsss", config), false);
});

test("videyy keeps every source, including ones videqsss drops", () => {
  assert.equal(allowsSource({ embed: "https://cdn.videy.co/v.mp4" }, "videyy", config), true);
  assert.equal(allowsSource({ embed: "https://tv1.indoav.app/e/a" }, "videyy", config), true);
});

test("a disabled site config drops the catalog", () => {
  assert.equal(allowsSource({ embed: "https://tv1.indoav.app/e/a" }, "videqsss", { sites: { videqsss: { enabled: false, sources: ["indoav"] } } }), false);
});

test("videqsss keeps the shared catalog until the folder import is recorded", () => {
  assert.equal(videqsssUsesOwnCatalog({ importedAt: null, items: [] }, "videqsss"), false);
  assert.equal(videqsssUsesOwnCatalog({ importedAt: "2026-11-10T00:00:00.000Z", items: [] }, "videqsss"), true);
  assert.equal(videqsssUsesOwnCatalog({ importedAt: "2026-11-10T00:00:00.000Z" }, "videyy"), false);
});
