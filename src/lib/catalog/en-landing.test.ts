import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasBannedWord } from "./landing.ts";
import {
  EN_LANDINGS,
  enDocumentTitle,
  enSlugForId,
  englishTargetForIdLanding,
  findEnLanding,
  hreflangLinks,
  idSlugForEn,
  langSwitchForPath,
  sentenceCount,
} from "./en-landing.ts";
import { enHref, landingPath, legacyPageRedirect } from "./halaman.ts";
import { findLanding } from "./landing.ts";

describe("english videqsss landings", () => {
  it("has a focused set of unique slugs, H1s and titles", () => {
    assert.ok(EN_LANDINGS.length >= 15 && EN_LANDINGS.length <= 35, String(EN_LANDINGS.length));
    for (const key of ["slug", "h1", "title"] as const) {
      const vals = EN_LANDINGS.map((l) => l[key].toLowerCase());
      assert.equal(new Set(vals).size, vals.length, `duplicate ${key}`);
    }
  });

  it("uses url-safe slugs and hand-written 2-3 sentence intros", () => {
    for (const l of EN_LANDINGS) {
      assert.match(l.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.equal(findEnLanding(l.slug), l);
      const n = sentenceCount(l.intro);
      assert.ok(n >= 2 && n <= 3, `${l.slug}: ${n} sentences — ${l.intro}`);
      assert.ok(l.intro.length >= 80, `${l.slug}: intro too short`);
      assert.doesNotMatch(l.intro, /Halaman ini|paling banyak ditonton|tanpa login/);
    }
  });

  it("never contains banned minor / non-consent words", () => {
    for (const l of EN_LANDINGS) {
      for (const text of [l.slug.replace(/-/g, " "), l.h1, l.title, l.description, l.intro]) {
        assert.equal(hasBannedWord(text), false, `${l.slug}: ${text}`);
      }
    }
  });

  it("maps only to real Indonesian genre landings, and those maps are reciprocal", () => {
    for (const l of EN_LANDINGS) {
      if (!l.idSlug) continue;
      const id = findLanding(l.idSlug);
      assert.ok(id, `${l.slug} points at missing ${l.idSlug}`);
      assert.notEqual(id.category, "videy", `${l.slug} must not map to a Videy-only page`);
      assert.equal(enSlugForId(l.idSlug), l.slug);
      assert.equal(idSlugForEn(l.slug), l.idSlug);
    }
    const mapped = EN_LANDINGS.filter((l) => l.idSlug).map((l) => l.idSlug as string);
    assert.equal(new Set(mapped).size, mapped.length, "two English pages share one Indonesian page");
  });

  it("builds English pagination paths and rewrites legacy ?page=", () => {
    assert.equal(enHref("indo-hijab", 1), "/en/indo-hijab");
    assert.equal(enHref("indo-hijab", 2), "/en/indo-hijab/halaman/2");
    assert.equal(landingPath("en", "indo-hijab", 1), "/en/indo-hijab");
    assert.equal(legacyPageRedirect("/en/indo-hijab", "?page=2"), "/en/indo-hijab/halaman/2");
    assert.equal(legacyPageRedirect("/en/indo-hijab/halaman/1", ""), "/en/indo-hijab");
  });

  it("points the language switcher at matching pages, never auto-redirects", () => {
    assert.deepEqual(langSwitchForPath("/en", "genre"), { lang: "en", idHref: "/genre", enHref: "/en" });
    assert.deepEqual(langSwitchForPath("/en/indonesian-amateur", "genre"), {
      lang: "en",
      idHref: "/genre/bokep-indo-amatir",
      enHref: "/en/indonesian-amateur",
    });
    assert.deepEqual(langSwitchForPath("/en/indo-viral/halaman/2", "genre"), {
      lang: "en",
      idHref: "/genre",
      enHref: "/en/indo-viral",
    });
    assert.deepEqual(langSwitchForPath("/genre/bokep-jilbab-indo"), {
      lang: "id",
      idHref: "/genre/bokep-jilbab-indo",
      enHref: "/en/indo-hijab",
    });
    assert.deepEqual(langSwitchForPath("/watch/abc"), { lang: "id", idHref: "/watch/abc", enHref: "/en" });
    assert.deepEqual(langSwitchForPath("/en", "cari"), { lang: "en", idHref: "/cari", enHref: "/en" });
    assert.deepEqual(langSwitchForPath("/en/indo-hijab", "cari"), {
      lang: "en",
      idHref: "/cari/bokep-jilbab-indo",
      enHref: "/en/indo-hijab",
    });
    assert.deepEqual(langSwitchForPath("/cari/bokep-jilbab-indo"), {
      lang: "id",
      idHref: "/cari/bokep-jilbab-indo",
      enHref: "/en/indo-hijab",
    });
  });

  it("emits reciprocal hreflang with x-default on the Indonesian URL", () => {
    const links = hreflangLinks("/genre/bokep-indo-amatir", "/en/indonesian-amateur", "https://videqsss.icu");
    assert.deepEqual(links, [
      { rel: "alternate", hrefLang: "id", href: "https://videqsss.icu/genre/bokep-indo-amatir" },
      { rel: "alternate", hrefLang: "en", href: "https://videqsss.icu/en/indonesian-amateur" },
      { rel: "alternate", hrefLang: "x-default", href: "https://videqsss.icu/genre/bokep-indo-amatir" },
    ]);
  });

  it("formats English document titles", () => {
    assert.equal(enDocumentTitle("Indonesian Amateur Videos", 1, "videqsss.icu"), "Indonesian Amateur Videos | videqsss.icu");
    assert.equal(
      enDocumentTitle("Indonesian Amateur Videos", 2, "videqsss.icu"),
      "Indonesian Amateur Videos – Page 2 | videqsss.icu",
    );
  });
});

describe("videqsss english-only redirects", () => {
  it("sends an Indonesian keyword page to its English page, same page number", () => {
    assert.equal(englishTargetForIdLanding("bokep-indo-amatir"), "/en/indonesian-amateur");
    assert.equal(englishTargetForIdLanding("bokep-jilbab-indo", 3), "/en/indo-hijab/halaman/3");
  });
  it("falls back to the /en hub when no English page corresponds", () => {
    assert.equal(englishTargetForIdLanding("bokep-open-bo"), "/en");
    assert.equal(englishTargetForIdLanding("does-not-exist", 2), "/en");
  });
  it("keeps Andini Permata titles off keyword pages", () => {
    assert.equal(hasBannedWord("Video Andini Permata viral"), true);
    assert.equal(hasBannedWord("andinipermata full"), true);
    assert.equal(hasBannedWord("Bokep jilbab indo"), false);
  });
});
