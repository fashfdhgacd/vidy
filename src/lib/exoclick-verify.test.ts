import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { EXOCLICK_META_NAME, exoclickTokenFor, exoclickVerifyResponse } from "./exoclick-verify.ts";

const VIDEYY = exoclickTokenFor("videyy");
const VIDEQSSS = exoclickTokenFor("videqsss");

test("each site has its own ExoClick token", () => {
  assert.notEqual(VIDEYY, VIDEQSSS);
  assert.equal(exoclickTokenFor(undefined), VIDEYY);
  assert.equal(exoclickTokenFor("videqsss"), VIDEQSSS);
});

test("the verification file is 200 only for this site's token", async () => {
  const own = exoclickVerifyResponse(`/${VIDEYY}.html`, "GET", VIDEYY);
  assert.ok(own);
  assert.equal(own.status, 200);
  assert.equal(await own.text(), VIDEYY);
  assert.match(own.headers.get("content-type") || "", /text\/html/);

  assert.equal(exoclickVerifyResponse(`/${VIDEQSSS}.html`, "GET", VIDEYY), null);
  assert.equal(exoclickVerifyResponse(`/${VIDEYY}.html`, "GET", VIDEQSSS), null);

  const other = exoclickVerifyResponse(`/${VIDEQSSS}.html`, "GET", VIDEQSSS);
  assert.ok(other);
  assert.equal(await other.text(), VIDEQSSS);

  const head = exoclickVerifyResponse(`/${VIDEYY}.html`, "HEAD", VIDEYY);
  assert.ok(head);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal(exoclickVerifyResponse(`/${VIDEYY}.html`, "POST", VIDEYY), null);
});

test("every page head includes only the build's verification meta", () => {
  const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /name:\s*EXOCLICK_META_NAME/);
  assert.match(root, /content:\s*exoclickToken\(\)/);
  assert.equal(EXOCLICK_META_NAME, "6a97888e-site-verification");
  assert.doesNotMatch(root, new RegExp(VIDEYY));
  assert.doesNotMatch(root, new RegExp(VIDEQSSS));
});
