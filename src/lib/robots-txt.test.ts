import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { robotsTxtForOrigin } from "./robots-txt.ts";

const template = readFileSync(new URL("../../public/robots.txt", import.meta.url), "utf8");

test("videyy robots keep the videyy sitemap", () => {
  const out = robotsTxtForOrigin(template, "https://videyy.icu");
  assert.equal(out, template);
  assert.match(out, /^Sitemap: https:\/\/videyy\.icu\/sitemap\.xml$/m);
});

test("videqsss robots point the sitemap at videqsss.icu only", () => {
  const out = robotsTxtForOrigin(template, "https://videqsss.icu");
  assert.match(out, /^Sitemap: https:\/\/videqsss\.icu\/sitemap\.xml$/m);
  assert.equal(out.includes("videyy.icu"), false);
  assert.equal(out.includes("koleksidrpinguin.com"), false);
});
