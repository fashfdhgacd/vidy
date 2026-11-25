import assert from "node:assert/strict";
import test from "node:test";
import { applyProbe, emptyProbe, planChecks, probeHeads, verdictFromHead } from "./lib/poster-probe.mjs";

function headers(map) {
  const h = new Map(Object.entries(map));
  return { get: (k) => h.get(k.toLowerCase()) ?? h.get(k) ?? null };
}

test("planChecks skips confirmed posters and keeps failed and unknown ids", () => {
  const probe = emptyProbe();
  applyProbe(probe, "ok-1", "ok", "2026-11-01");
  applyProbe(probe, "miss-1", "miss", "2026-11-01");
  const todo = planChecks(["ok-1", "miss-1", "new-1", "ok-1", "bad id!"], probe);
  assert.deepEqual(todo, ["miss-1", "new-1", "badid"]);
});

test("a later ok removes a miss, and skip does not write", () => {
  const probe = emptyProbe();
  applyProbe(probe, "a", "miss", "2026-11-01");
  applyProbe(probe, "a", "skip", "2026-11-14");
  assert.equal(probe.miss.a, "2026-11-01");
  assert.equal(probe.ok.a, undefined);
  applyProbe(probe, "a", "ok", "2026-11-14");
  assert.equal(probe.ok.a, 1);
  assert.equal(probe.miss.a, undefined);
});

test("HEAD 200 is ok, 404 is miss, a challenge is not a miss", () => {
  assert.equal(verdictFromHead({ status: 200, headers: headers({ "content-type": "image/jpeg", "content-length": "8000" }) }), "ok");
  assert.equal(verdictFromHead({ status: 404, headers: headers({}) }), "miss");
  assert.equal(verdictFromHead({ status: 200, headers: headers({ "content-type": "image/gif", "content-length": "40" }) }), "miss");
  assert.equal(
    verdictFromHead({ status: 403, headers: headers({ "cf-mitigated": "challenge", "content-type": "text/html" }) }),
    "challenge",
  );
  assert.equal(verdictFromHead({ status: 503, headers: headers({}) }), "skip");
});

test("probeHeads stops on a challenge and does not mark the rest missing", async () => {
  const probe = emptyProbe();
  const seen = [];
  const result = await probeHeads(["a", "b", "c"], {
    probe,
    day: "2026-11-14",
    concurrency: 1,
    fetchImpl: async (url) => {
      seen.push(url);
      if (url.endsWith("/b")) {
        return { status: 403, headers: headers({ "cf-mitigated": "challenge" }) };
      }
      return { status: 404, headers: headers({}) };
    },
  });
  assert.equal(result.challenged, true);
  assert.equal(probe.miss.a, "2026-11-14");
  assert.equal(probe.miss.b, undefined);
  assert.equal(probe.miss.c, undefined);
  assert.equal(probe.ok.a, undefined);
  assert.deepEqual(seen, ["https://img.koleksidrpinguin.com/posters/typed/a", "https://img.koleksidrpinguin.com/posters/typed/b"]);
});
