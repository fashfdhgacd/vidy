import assert from "node:assert/strict";
import test from "node:test";
import { allowsSource } from "./site-sources.ts";

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

test("videqsss: every host except Videy", () => {
  const cfg = { sites: { videqsss: { enabled: true, sources: "all" as const, exclude: ["videy"] } } };
  for (const it of [
    { source: "IndoAV", embed: "https://tv1.indoav.app/e/x" },
    { source: "Byse", embed: "https://byse.sx/e/x" },
    { source: "Vidara", embed: "https://vidara.so/e/x" },
    { source: "LuluStream", embed: "https://lulustream.com/e/x" },
    { source: "Streamtape", embed: "https://streamtape.com/e/x" },
  ])
    assert.equal(allowsSource(it, "videqsss", cfg), true, it.source);
  assert.equal(allowsSource({ source: "Videy", direct: "https://cdn.videy.co/x.mp4" }, "videqsss", cfg), false);
  assert.equal(allowsSource({ source: "", direct: "https://cdn2.aceimg.com/abc.mp4" }, "videqsss", cfg), false);
  assert.equal(allowsSource({ source: "Videy" }, "videyy", { sites: { videyy: { sources: "all" as const } } }), true);
});
