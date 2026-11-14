import assert from "node:assert/strict";
import test from "node:test";
import { cardThumbHtml, chooseCardThumb, realPosterFirst } from "./poster-status.ts";

test("a confirmed poster is the R2 url, with the stored source as the one retry", () => {
  const choice = chooseCardThumb("ab-1", "https://cdn.example/thumb.jpg", true);
  assert.equal(choice.src, "https://img.koleksidrpinguin.com/posters/typed/ab-1");
  assert.equal(choice.alt, "https://cdn.example/thumb.jpg");
});

test("a missing poster uses the stored source, then the brand file when there is none", () => {
  assert.deepEqual(chooseCardThumb("ab-1", "https://cdn.example/thumb.jpg", false), {
    src: "https://cdn.example/thumb.jpg",
    alt: "",
  });
  assert.equal(chooseCardThumb("ab-1", "", false).src, "/brand-poster-6x5.jpg");
  assert.equal(chooseCardThumb("ab-1", "/api/puterin-thumb?id=ab-1", false).src, "/brand-poster-6x5.jpg");
});

test("a local frame is used as stored", () => {
  assert.equal(chooseCardThumb("vy1", "/videy-thumbs/vy1.jpg", false).src, "/videy-thumbs/vy1.jpg");
});

test("the card img carries an inline onerror that does not wait for hydration", () => {
  const html = cardThumbHtml({
    id: "ab-1",
    stored: "https://cdn.example/a.jpg",
    alt: 'Judul "satu"',
    ok: true,
    eager: true,
  });
  assert.match(html, /onerror="/);
  assert.match(html, /src="https:\/\/img\.koleksidrpinguin\.com\/posters\/typed\/ab-1"/);
  assert.match(html, /data-alt="https:\/\/cdn\.example\/a\.jpg"/);
  assert.match(html, /brand-poster-6x5\.jpg/);
  assert.match(html, /alt="Judul &quot;satu&quot;"/);
  assert.match(html, /fetchpriority="high"/);
});

test("poster-first ordering keeps both groups and drops nobody", () => {
  const items = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
  ];
  const has = (it: { id: string }) => it.id === "b" || it.id === "d";
  const ordered = realPosterFirst(items, has);
  assert.deepEqual(
    ordered.map((it) => it.id),
    ["b", "d", "a", "c"],
  );
  assert.equal(realPosterFirst(items, () => false), items);
  assert.equal(ordered.length, items.length);
});
