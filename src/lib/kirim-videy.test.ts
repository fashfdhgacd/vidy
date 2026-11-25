import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { KIRIM_MSG, kirimMessage, normalizeVideyLink, showKirimNav } from "./kirim-videy.ts";

test("accepts videy.co/v and cdn.videy.co links that carry an id", () => {
  assert.equal(normalizeVideyLink("https://videy.co/v?id=AbCdEf123"), "https://videy.co/v?id=AbCdEf123");
  assert.equal(normalizeVideyLink("https://videy.co/v/?id=AbCdEf123"), "https://videy.co/v/?id=AbCdEf123");
  assert.equal(normalizeVideyLink("http://www.videy.co/v?id=abc&ref=1"), "http://www.videy.co/v?id=abc&ref=1");
  assert.equal(normalizeVideyLink("videy.co/v?id=abc"), "https://videy.co/v?id=abc");
  assert.equal(normalizeVideyLink("https://cdn.videy.co/AbCdEf123.mp4"), "https://cdn.videy.co/AbCdEf123.mp4");
  assert.equal(normalizeVideyLink("https://cdn.videy.co/AbCdEf123.mov"), "https://cdn.videy.co/AbCdEf123.mov");
  assert.equal(normalizeVideyLink("https://cdn2.videy.co/AbCdEf123.mp4"), "https://cdn2.videy.co/AbCdEf123.mp4");
  assert.equal(normalizeVideyLink("https://cdn.videy.co/v?id=AbCdEf123"), "https://cdn.videy.co/v?id=AbCdEf123");
});

test("rejects links that are not a Videy id link", () => {
  for (const raw of [
    "",
    "   ",
    "bukan url",
    "https://example.com/v?id=abc",
    "https://videy.co/v",
    "https://videy.co/v?id=",
    "https://videy.co/?id=abc",
    "https://videy.co.evil.com/v?id=abc",
    "https://notvidey.co/v?id=abc",
    "javascript:alert(1)",
    "ftp://videy.co/v?id=abc",
    "https://user:pass@videy.co/v?id=abc",
    "https://cdn.videy.co/",
    "https://cdn.videy.co/v",
    "https://cdn.videy.co/favicon.ico",
  ]) {
    assert.equal(normalizeVideyLink(raw), null, raw);
  }
});

test("maps the kiriman-videy response contract", () => {
  assert.equal(kirimMessage(200, { ok: true, status: "pending" }), KIRIM_MSG.pending);
  assert.equal(kirimMessage(200, { ok: true, status: "duplicate" }), KIRIM_MSG.duplicate);
  assert.equal(kirimMessage(400, { error: "invalid_url" }), KIRIM_MSG.invalid);
  assert.equal(kirimMessage(400, null), KIRIM_MSG.invalid);
  assert.equal(kirimMessage(429, { error: "rate" }), KIRIM_MSG.rate);
  assert.equal(kirimMessage(500, { ok: false }), KIRIM_MSG.retry);
  assert.equal(kirimMessage(404, null), KIRIM_MSG.retry);
  assert.equal(kirimMessage(200, { ok: true, status: "other" }), KIRIM_MSG.retry);
});

test("kirim nav is videyy only and stays off English pages", () => {
  assert.equal(showKirimNav("/", false), true);
  assert.equal(showKirimNav("/kirim", false), true);
  assert.equal(showKirimNav("/", true), false);
  assert.equal(showKirimNav("/en", false), false);
  assert.equal(showKirimNav("/en/indonesian-amateur", false), false);
  assert.equal(showKirimNav("/en/", false), false);
});

test("the page, header, and home gate kirim to videyy and skip English routes", () => {
  const route = readFileSync(new URL("../routes/kirim.tsx", import.meta.url), "utf8");
  assert.match(route, /if \(IS_VIDEQSSS\) throw notFound\(\)/);
  assert.match(route, /KIRIM_ENDPOINT/);
  assert.equal(existsSync(new URL("../routes/en.kirim.tsx", import.meta.url)), false);
  const header = readFileSync(new URL("../components/layout/header.tsx", import.meta.url), "utf8");
  assert.match(header, /showKirimNav/);
  assert.match(header, /Kirim Video/);
  const home = readFileSync(new URL("../routes/index.tsx", import.meta.url), "utf8");
  assert.match(home, /!IS_VIDEQSSS && !q && page === 1/);
  const sitemap = readFileSync(new URL("../../server/middleware/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /!IS_VIDEQSSS/);
  assert.match(sitemap, /\/kirim/);
});
