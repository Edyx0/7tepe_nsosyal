import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  removeItem,
  repliesForThread,
  runExclusive,
  toggleItem,
  togglePinned,
} from "../app/demo-state.mjs";

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

test("server-renders the NSosyal social shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="tr">/i);
  assert.match(html, /NSosyal/);
  assert.match(html, /Ne düşünüyorsun\?/);
  assert.match(html, /Şu an konuşulanlar/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/i);
});

test("keeps the context-summary and device-local demo behavior in product source", async () => {
  const [page, layout, packageJson, css, notices, license, logoDark, logoLight, favicon] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8"),
    readFile(
      new URL("../licenses/ccrsxx-twitter-clone-MIT.txt", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../public/brand/nsosyal-logo-dark.svg", import.meta.url)),
    readFile(new URL("../public/brand/nsosyal-logo-light.svg", import.meta.url)),
    readFile(new URL("../public/brand/nsosyal-favicon.svg", import.meta.url)),
  ]);

  assert.match(page, /Bağlam Özeti/);
  assert.match(page, /NSosyal yapay zekâ özeti.*Hata içerebilir/);
  assert.match(page, /nsosyal-actions/);
  assert.match(page, /nsosyal-drafts/);
  assert.match(page, /Yer İmleri/);
  assert.match(page, /Mesajlar/);
  assert.match(page, /useState<View>\("feed"\)/);
  assert.doesNotMatch(page, /sign[ -]?in|log[ -]?in|login/i);
  assert.match(page, /Ne düşünüyorsun\?/);
  assert.match(page, /Sana Özel/);
  assert.match(page, /Takip Ettiklerin/);
  assert.match(page, /Takip Ediliyor/);
  assert.match(page, /Daha Fazla/);
  assert.match(page, /Gönderinin ayrıntılarını aç/);
  assert.doesNotMatch(page, /Gönderinın|Takip Ettiklerinsin/);
  assert.match(page, /nsosyal-logo-dark\.svg/);
  assert.match(page, /nsosyal-favicon\.svg/);
  assert.match(page, /headerCompact/);
  assert.match(page, /lastScrollY/);
  assert.match(page, /ActionIcon/);
  assert.match(layout, /NSosyal - Sosyal Ağ Platformu/);
  assert.match(layout, /nsosyal-favicon\.svg/);
  assert.doesNotMatch(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /nsosyal-social-prototype/);
  assert.match(css, /#1B1E26/);
  assert.match(css, /#1890FF/);
  assert.match(css, /\.topbar\.is-compact/);
  assert.match(css, /\.post\.has-thread::before/);
  assert.match(css, /aspect-ratio: 16 \/ 8\.7/);
  assert.equal(logoDark.length > 0, true);
  assert.equal(logoLight.length > 0, true);
  assert.equal(favicon.length > 0, true);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(page, /function deleteOwnPost/);
  assert.match(page, /function resetDemo/);
  assert.match(page, /function ProfileEditor/);
  assert.match(page, /restoredLocalState/);
  assert.doesNotMatch(page, /useState<Theme>\(\(\) => readStored/);
  assert.match(page, /aria-pressed=\{following\.includes\(post\.handle\)\}/);
  assert.match(page, /repliesForThread\(seedReplies, props\.post\)/);
  assert.match(page, /runExclusive\(event, \(\) => onProfile\(post\)\)/);
  assert.match(notices, /62a9588577ec6f5ce6d28b50d30bf46d2229453d/);
  assert.match(license, /Copyright \(c\) 2022 ccrsxx/);
  await assert.rejects(access(new URL("../app/chatgpt-auth.ts", import.meta.url)));
});

test("local interaction reducers keep post actions deterministic", () => {
  assert.deepEqual(toggleItem([], "post-1"), ["post-1"]);
  assert.deepEqual(toggleItem(["post-1"], "post-1"), []);
  assert.deepEqual(removeItem(["post-1"], "post-1"), ["post-1"]);
  assert.deepEqual(removeItem([], "post-1"), ["post-1"]);
  assert.equal(togglePinned(null, "post-1"), "post-1");
  assert.equal(togglePinned("post-1", "post-1"), null);
});

test("thread replies never repeat the root post", () => {
  const root = { id: "root", name: "İdil Aras" };
  const candidates = [
    root,
    { id: "reply-1", name: "Selin Uçak", replyTo: "İdil Aras" },
    { id: "reply-2", name: "Bora Ekin", replyTo: "İdil Aras" },
    { id: "other", name: "Mert Soylu", replyTo: "Başka Biri" },
  ];
  assert.deepEqual(
    repliesForThread(candidates, root).map((post) => post.id),
    ["reply-1", "reply-2"],
  );
});

test("nested post interactions stop propagation before their own action", () => {
  let stopped = 0;
  let actions = 0;
  runExclusive({ stopPropagation: () => { stopped += 1; } }, () => {
    actions += 1;
  });
  assert.equal(stopped, 1);
  assert.equal(actions, 1);
});
