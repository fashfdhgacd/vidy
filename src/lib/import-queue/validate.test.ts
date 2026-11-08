import assert from "node:assert/strict";
import test from "node:test";
import { validateImportUrl, splitUrlLines } from "./validate.ts";

test("accepts normal https video URLs", () => {
  for (const u of [
    "https://videy.co/v/?id=AbCdEf123",
    "https://streamtape.com/e/AbCdEf123",
    "https://panel.putarin.com/e/xyz789",
    "https://luluvdo.com/e/abc123",
    "https://bysejikuar.com/d/AbCdEf12/title-slug",
  ]) {
    const r = validateImportUrl(u);
    assert.equal(r.ok, true, u);
  }
});

test("rejects non-http protocols and malformed URLs", () => {
  for (const u of ["", "bukan url", "ftp://videy.co/v/?id=x", "javascript:alert(1)", "file:///etc/passwd"]) {
    const r = validateImportUrl(u);
    assert.equal(r.ok, false, u);
  }
});

test("SSRF guard: credentials, ports, IP literals, internal hosts", () => {
  const bad = [
    "https://user:pass@videy.co/v/?id=x",
    "https://videy.co:8080/v/?id=x",
    "https://127.0.0.1/v/",
    "https://10.0.0.5/e/abc",
    "https://192.168.1.1/e/abc",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/e/abc",
    "https://localhost/e/abc",
    "https://printer.local/e/abc",
    "https://nas.internal/e/abc",
  ];
  for (const u of bad) {
    const r = validateImportUrl(u);
    assert.equal(r.ok, false, u);
  }
});

test("splitUrlLines handles one-per-line plus comma/semicolon separators", () => {
  const text = "https://a.co/1\nhttps://b.co/2, https://c.co/3;\n\n  https://d.co/4  ";
  assert.deepEqual(splitUrlLines(text), [
    "https://a.co/1",
    "https://b.co/2",
    "https://c.co/3",
    "https://d.co/4",
  ]);
});
