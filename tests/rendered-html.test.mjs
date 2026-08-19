import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Yankı social shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /Yankı/);
  assert.match(html, /Neler yankılanıyor\?/);
  assert.match(html, /Şu an konuşulanlar/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/i);
});

test("keeps the context-summary and device-local demo behavior in product source", async () => {
  const [page, layout, packageJson, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Bağlam Özeti/);
  assert.match(page, /AI özeti.*hata içerebilir/);
  assert.match(page, /yanki-actions/);
  assert.match(page, /yanki-drafts/);
  assert.match(page, /Yer İmleri/);
  assert.match(page, /Mesajlar/);
  assert.match(page, /useState<View>\("feed"\)/);
  assert.doesNotMatch(page, /sign[ -]?in|log[ -]?in|login/i);
  assert.match(layout, /Yankı — Gündemi birlikte duy/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 680px\)/);
  await assert.rejects(access(new URL("../app/chatgpt-auth.ts", import.meta.url)));
});
