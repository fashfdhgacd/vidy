import assert from "node:assert/strict";
import test from "node:test";
import {
  folderPageUrl,
  markedForSite,
  parseFolderCatalog,
  parseFolderUrl,
  planVideqsssCatalog,
} from "./lib/videqsss-catalog.mjs";

const FOLDER = "https://tv1.example.indoav.app/f/AbC123";
const folder = parseFolderUrl(FOLDER);

const CARD = `
<article class="video-card group">
  <a href="https://tv1.example.indoav.app/d/AbCvid01"><img alt="Judul Satu" src="https://img.example/a.webp"></a>
  <h3><a href="/d/AbCvid01">Judul Satu</a></h3>
  <span data-icon="eye"><span class="text-xs">1.2k</span></span>
  <span data-icon="clock"><span class="text-xs">7m 51s</span></span>
  <span data-icon="heart"><span class="text-xs">4</span></span>
</article>
<article class="video-card">
  <a href="/d/AbCvid01">dup</a>
  <a href="/d/Second02"><img data-src="https://img.example/b.webp" alt="Judul Dua"></a>
</article>
`;

test("folder link stays unset until the owner gives an IndoAV or UserBokep /f/ url", () => {
  assert.equal(parseFolderUrl(""), null);
  assert.equal(parseFolderUrl("https://drive.google.com/drive/folders/abc"), null);
  assert.equal(parseFolderUrl("http://tv1.indoav.app/f/abc"), null);
  assert.equal(parseFolderUrl("https://panel.putarin.com/f/abc"), null);
  assert.equal(folder?.id, "AbC123");
  assert.equal(folder?.source, "IndoAV");
  assert.equal(parseFolderUrl("https://tv1.userbokep.com/f/Zed99/page/2")?.source, "UserBokep");
  assert.equal(folderPageUrl(folder, 1), "https://tv1.example.indoav.app/f/AbC123");
  assert.equal(folderPageUrl(folder, 3), "https://tv1.example.indoav.app/f/AbC123/page/3");
});

test("one folder page becomes catalog rows", () => {
  const items = parseFolderCatalog(CARD, folder, "2026-11-10");
  assert.deepEqual(items.map((it) => it.id), ["AbCvid01", "Second02"]);
  assert.equal(items[0].title, "Judul Satu");
  assert.equal(items[0].embed, "https://tv1.example.indoav.app/e/AbCvid01");
  assert.equal(items[0].source, "IndoAV");
  assert.equal(items[0].poster, "https://img.example/a.webp");
  assert.equal(items[0].views, 1200);
  assert.equal(items[0].duration, 7 * 60 + 51);
  assert.equal(items[0].via, "folder");
  assert.equal(items[1].poster, "https://img.example/b.webp");
});

test("first run stores the folder and ignores older panel uploads", () => {
  const plan = planVideqsssCatalog({
    previous: { folderUrl: "", importedAt: null, items: [] },
    folderItems: parseFolderCatalog(CARD, folder, "2026-11-10"),
    panelItems: [
      { id: "old", title: "Lama", source: "IndoAV", embed: "https://tv1.indoav.app/e/old", date: "2026-01-01" },
      { id: "marked", title: "Panel", source: "UserBokep", embed: "https://tv1.userbokep.com/e/marked", sites: ["videqsss"], date: "2026-01-01" },
      { id: "videy", title: "Bukan", source: "Videy", embed: "https://cdn.videy.co/v.mp4", sites: ["videqsss"] },
    ],
    blockIds: ["Second02"],
    config: { sites: { videqsss: { folderUrl: FOLDER, sources: ["indoav", "userbokep"], panelMarker: "videqsss" } } },
    now: "2026-11-10T00:00:00.000Z",
  });
  assert.equal(plan.crawled, true);
  assert.equal(plan.importedAt, "2026-11-10T00:00:00.000Z");
  assert.deepEqual(plan.items.map((it) => it.id), ["AbCvid01", "marked"]);
  assert.equal(plan.items[0].via, "folder");
  assert.equal(plan.items[1].via, "panel");
});

test("later runs keep the folder and add pemilik uploads from that day on", () => {
  const previous = {
    folderUrl: FOLDER,
    importedAt: "2026-11-10T00:00:00.000Z",
    items: [
      { id: "AbCvid01", title: "Judul Satu", source: "IndoAV", embed: "https://tv1.example.indoav.app/e/AbCvid01", via: "folder" },
      { id: "marked", title: "Panel", source: "UserBokep", embed: "https://tv1.userbokep.com/e/marked", via: "panel" },
    ],
  };
  const plan = planVideqsssCatalog({
    previous,
    folderItems: null,
    panelItems: [
      { id: "AbCvid01", title: "Judul Satu", source: "IndoAV", embed: "https://tv1.example.indoav.app/e/AbCvid01", date: "2026-11-10" },
      { id: "baru", title: "Baru", source: "IndoAV", embed: "https://tv1.indoav.app/e/baru", updated_at: "2026-11-10T03:00:00.000Z" },
      { id: "kemarin", title: "Kemarin", source: "IndoAV", embed: "https://tv1.indoav.app/e/kemarin", date: "2026-11-09" },
    ],
    blockIds: [],
    config: { sites: { videqsss: { folderUrl: FOLDER, sources: ["indoav", "userbokep"] } } },
    now: "2026-11-11T00:00:00.000Z",
  });
  assert.equal(plan.crawled, false);
  assert.equal(plan.importedAt, previous.importedAt);
  assert.deepEqual(plan.items.map((it) => it.id), ["AbCvid01", "marked", "baru"]);
});

test("a failed crawl does not replace a finished import", () => {
  const previous = {
    folderUrl: FOLDER,
    importedAt: "2026-11-10T00:00:00.000Z",
    items: [{ id: "keep", title: "Tetap", source: "IndoAV", embed: "https://tv1.indoav.app/e/keep", via: "folder" }],
  };
  const plan = planVideqsssCatalog({
    previous,
    folderItems: null,
    panelItems: [],
    blockIds: [],
    config: { sites: { videqsss: { folderUrl: "https://tv1.userbokep.com/f/NewFolder1", sources: ["indoav", "userbokep"] } } },
    now: "2026-11-12T00:00:00.000Z",
  });
  assert.equal(plan.crawled, false);
  assert.equal(plan.folderUrl, FOLDER);
  assert.deepEqual(plan.items.map((it) => it.id), ["keep"]);
});

test("empty folder link imports nothing", () => {
  const plan = planVideqsssCatalog({
    previous: { folderUrl: "", importedAt: null, items: [] },
    folderItems: [{ id: "x", source: "IndoAV", embed: "https://tv1.indoav.app/e/x" }],
    panelItems: [{ id: "y", source: "IndoAV", embed: "https://tv1.indoav.app/e/y", date: "2026-11-10" }],
    blockIds: [],
    config: { sites: { videqsss: { folderUrl: "", sources: ["indoav", "userbokep"] } } },
    now: "2026-11-10T00:00:00.000Z",
  });
  assert.equal(plan.crawled, false);
  assert.equal(plan.importedAt, null);
  assert.deepEqual(plan.items, []);
  assert.equal(markedForSite({ tags: ["videqsss"] }), true);
  assert.equal(markedForSite({ site: "videyy" }), false);
});
