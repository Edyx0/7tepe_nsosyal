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
  assert.doesNotMatch(html, /Ne düşünüyorsun\?/);
  assert.match(html, /Şu an konuşulanlar/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Building your site/i);
});

test("keeps the context-summary and device-local demo behavior in product source", async () => {
  const [page, layout, packageJson, css, notices, license, logoDark, logoLight, favicon, sourceEraDark, sourceEraLight, sourceEraLicense] = await Promise.all([
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
    readFile(new URL("../public/brand/nsosyal-source-era-logo-dark.svg", import.meta.url)),
    readFile(new URL("../public/brand/nsosyal-source-era-logo-light.svg", import.meta.url)),
    readFile(new URL("../licenses/Next_Sosyal_Beta_AGPL-3.0.txt", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Bağlam Özeti/);
  assert.match(page, /NSosyal yapay zekâ özeti.*Hata içerebilir/);
  assert.match(page, /nsosyal-actions/);
  assert.match(page, /nsosyal-gamification/);
  assert.match(page, /dailyTasks/);
  assert.match(page, /pointsBadge/);
  assert.match(page, /points-badge/);
  assert.match(page, /nsosyal-drafts/);
  assert.match(page, /Yer İmleri/);
  assert.match(page, /Mesajlar/);
  assert.match(page, /useState<View>\("feed"\)/);
  assert.doesNotMatch(page, /sign[ -]?in|log[ -]?in|login/i);
  assert.match(page, /Ne paylaşmak istersin\?/);
  assert.match(page, /Sana Özel/);
  assert.match(page, /Takip Ettiklerin/);
  assert.match(page, /Takip Ediliyor/);
  assert.match(page, /Daha Fazla/);
  assert.match(page, /Gönderinin ayrıntılarını aç/);
  assert.equal(page.includes(`Gönder${"inın"}`), false);
  assert.equal(page.includes(`Takip Ettikler${"insin"}`), false);
  assert.match(page, /nsosyal-source-era-logo-dark\.svg/);
  assert.match(page, /nsosyal-source-era-logo-light\.svg/);
  assert.match(page, /nsosyal-favicon\.svg/);
  assert.match(page, /headerCompact/);
  assert.match(page, /lastScrollY/);
  assert.match(page, /function UiIcon/);
  assert.match(page, /strokeWidth: 2\.05/);
  assert.doesNotMatch(page, /className="quote-mini"/);
  assert.match(page, /thread-reply-input/);
  assert.match(page, /replyToId/);
  assert.match(page, /MobileMoreMenu/);
  assert.match(page, /useDialogFocus/);
  assert.match(page, /nsosyal-messages/);
  assert.match(page, /ActionIcon/);
  assert.match(page, /className=\{"action-wrap " \+ icon/);
  assert.match(css, /@keyframes social-action-pop/);
  assert.match(css, /\.action-wrap\.repost\.active/);
  assert.match(css, /@keyframes social-action-glow/);
  assert.match(css, /will-change: transform/);
  assert.match(css, /\.bottom-nav\.is-compact \{[\s\S]*transform: translateY\(9px\) scaleY\(\.84\)/);
  assert.match(page, /name === "menu"/);
  assert.match(page, /name === "plus"/);
  assert.match(page, /name === "check"/);
  assert.match(page, /CompactDesktopMenu/);
  assert.match(page, /ComposeModal/);
  assert.match(page, /mobile-profile-button/);
  assert.match(page, /mobile-profile-button" onClick=\{openOwnProfile\}/);
  assert.match(page, /profile-settings/);
  assert.match(page, /tab === "bookmarks"/);
  assert.match(page, /bottom-compose/);
  assert.match(page, /desktop-compose-fab/);
  assert.match(page, /MobileNav\(\{ view, setView, unread, onCompose, composeHidden \}/);
  assert.match(page, /setComposeHidden/);
  assert.match(page, /composeHidden \? "is-compact"/);
  assert.match(page, /top-action-search/);
  assert.match(page, /repostedByMe/);
  assert.match(page, /icon-only/);
  assert.match(page, /following\.includes\(post\.handle\) \? "check" : "plus"/);
  assert.match(page, /requestAnimationFrame/);
  assert.match(page, /directionTravel/);
  assert.match(page, /setComposeHidden\(nextCompact\)/);
  assert.match(page, /atBottom/);
  assert.match(css, /post:not\(\.has-thread\) \.post-actions/);
  assert.match(css, /\.feed-tabs::before/);
  assert.match(css, /\.topbar::before/);
  assert.match(page, /Yeniden paylaştın/);
  assert.match(page, /actions\.reposts\.includes\(post\.id\)/);
  assert.doesNotMatch(page, />Repostlar</);
  assert.match(page, /props\.actions\.reposts\.includes\(post\.id\)/);
  assert.match(page, /repostedByMe: true/);
  assert.match(page, /rootPosts = useMemo\(\(\) => posts\.filter\(\(post\) => !post\.replyToId\)/);
  assert.match(page, /rootPosts\.filter\(\(post\) => post\.own \|\| following\.includes\(post\.handle\)\)/);
  assert.match(page, /item\.id === "profile" \? onOwnProfile\(\) : setView\(item\.id\)/);
  assert.match(page, /function Messages\(\{ messages, setMessages, profile, target \}/);
  assert.match(page, /profile-message/);
assert.match(page, /if \(replyTarget\) \{ awardTask\("reply", 15\); setNotice\("Yanıtın konuşmaya eklendi\."\); setView\("detail"\); \}/);
  assert.match(page, /const belongsToProfile = \(post: Post\) => props\.isOwn \? post\.own === true : post\.handle === props\.profile\.handle/);
  assert.doesNotMatch(page, /className="notice"/);
  assert.match(page, /const setNotice: \(message: string\) => void = \(\) => undefined/);
  assert.match(layout, /NSosyal - Sosyal Ağ Platformu/);
  assert.match(layout, /nsosyal-favicon\.svg/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.doesNotMatch(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(packageJson, /nsosyal-social-prototype/);
  assert.match(css, /#1B1E26/);
  assert.match(css, /#6364FF/);
  assert.match(css, /#324BFF/);
  assert.match(css, /#07D0E0/);
  assert.match(css, /grid-template-columns: 285px minmax\(0, 600px\) 350px/);
  assert.match(css, /@media \(max-width: 1175px\)/);
  assert.match(css, /@media \(max-width: 630px\)/);
  assert.match(css, /\.topbar\.is-compact/);
  assert.match(css, /\.post\.has-thread::before/);
  assert.match(css, /\.post\.has-thread::after/);
  assert.match(css, /border-bottom-left-radius: 16px/);
  assert.match(css, /--thread-rail-x: 36px/);
  assert.match(css, /\.post\.has-thread \.post-actions/);
  assert.match(css, /justify-content: flex-start/);
  assert.match(css, /\.post\.has-thread \.action-wrap:last-child \{ margin-left: auto; \}/);
  assert.match(css, /backdrop-filter: blur\(18px\) saturate\(1\.25\)/);
  assert.match(css, /aspect-ratio: 16 \/ 8\.7/);
  assert.equal(logoDark.length > 0, true);
  assert.equal(logoLight.length > 0, true);
  assert.equal(favicon.length > 0, true);
  assert.equal(sourceEraDark.length > 0, true);
  assert.equal(sourceEraLight.length > 0, true);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 680px\)/);
  assert.match(css, /grid-template-columns: repeat\(5, 1fr\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /border-radius: 22px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /--apple-radius-nav: 40px/);
  assert.match(css, /--apple-radius-card: 20px/);
  assert.match(css, /--apple-radius-modal: 24px/);
  assert.match(css, /flex-grow: 1\.28/);
  assert.match(css, /--apple-status: #ff375f/);
  assert.match(css, /@media \(min-width: 681px\) and \(max-width: 1000px\)/);
  assert.match(css, /\.bottom-nav \{ display: none !important; \}/);
  assert.match(css, /\.sidebar \{[\s\S]*backdrop-filter: blur\(24px\) saturate\(1\.35\)/);
  assert.match(css, /@media \(min-width: 1001px\), \(min-width: 631px\) and \(max-width: 680px\)/);
  assert.match(css, /\.topbar \{ display: none !important; \}/);
  assert.match(css, /height: calc\(100vh - 28px\)/);
  assert.match(css, /margin: 14px 0 14px 12px/);
  assert.match(css, /border-radius: 0 28px 28px 0/);
  assert.match(css, /\.sidebar \{[\s\S]*border-radius: 40px/);
  assert.match(css, /backdrop-filter: blur\(30px\) saturate\(1\.5\)/);
  assert.match(css, /\.sidebar \.nav-item \.nav-icon,[\s\S]*place-items: center/);
  assert.match(css, /margin-left: 4px/);
  assert.match(css, /height: 44px; min-height: 44px; padding: 0; justify-content: center; border-radius: 50%/);
  assert.match(css, /\.topbar-center-brand/);
  assert.match(css, /\.compact-menu/);
  assert.match(css, /\.bottom-nav \.bottom-compose/);
  assert.match(css, /\.desktop-compose-fab/);
  assert.match(css, /\.bottom-nav\.is-compact/);
  assert.match(css, /\.bottom-compose\.is-hidden \{ display: none; \}/);
  assert.match(css, /flex-basis \.34s cubic-bezier\(\.22, 1, \.36, 1\)/);
  assert.match(css, /--thread-elbow-bottom: 33px/);
  assert.match(css, /cubic-bezier\(\.22, 1, \.36, 1\)/);
  assert.match(css, /backdrop-filter: blur\(20px\) saturate\(1\.25\)/);
  assert.match(css, /mobile-profile-button \{ width: 46px; height: 46px; \}/);
  assert.match(css, /brand-mark\.small \{ width: 31px; height: 31px; \}/);
  assert.match(css, /\.post-actions \{ flex-wrap: nowrap !important/);
  assert.match(page, /detail-backbar/);
  assert.match(page, /is-detail/);
  assert.match(css, /\.detail-backbar \{[\s\S]*position: sticky/);
  assert.match(css, /\.post-actions \.action-wrap:last-child \{[\s\S]*flex: 0 0 46px/);
  assert.match(css, /\.post-actions \.action-wrap:last-child \.action \{[\s\S]*place-items: center/);
  assert.match(css, /\.thread-view > \.post \{[\s\S]*border-radius: 24px/);
  assert.match(css, /\.topbar\.is-detail \{/);
  assert.match(css, /\.profile-head \{ position: relative; z-index: 2/);
  assert.match(css, /\.profile-head \.avatar \{ position: relative; z-index: 3/);
  assert.match(css, /\.post-meta \{[\s\S]*height: 46px/);
  assert.match(css, /\.post > \.avatar \{ align-self: center; \}/);
  assert.match(css, /@media \(max-width: 680px\) \{[\s\S]*\.post > \.avatar \{ margin-top: 2px; \}/);
  assert.match(css, /\.post-meta \.post-follow \{[\s\S]*width: 44px/);
  assert.match(css, /\.post-meta \.more \{[\s\S]*place-items: center/);
  assert.match(css, /@media \(max-width: 430px\)/);
  assert.match(css, /@media \(min-width: 631px\) and \(max-width: 680px\)/);
  assert.match(css, /\.bottom-nav \{ display: none !important; \}/);
  assert.match(css, /grid-template-columns: repeat\(4, 1fr\)/);
  assert.match(css, /\.top-action-theme, \.top-action-search/);
  assert.match(css, /prefers-reduced-transparency/);
  assert.match(page, /Profilini aç/);
  assert.match(page, /onBookmarks/);
  assert.match(css, /--brand-fill: #324BFF/);
  assert.match(css, /--brand-text: #AEB8FF/);
  assert.match(css, /\.post-follow \{ position: static/);
  assert.match(css, /\.ui-icon/);
  assert.match(page, /function deleteOwnPost/);
  assert.match(page, /function resetDemo/);
  assert.match(page, /function ProfileEditor/);
  assert.match(page, /restoredLocalState/);
  assert.doesNotMatch(page, /useState<Theme>\(\(\) => readStored/);
  assert.match(page, /aria-pressed=\{following\.includes\(post\.handle\)\}/);
  assert.match(page, /repliesForThread\(merged, props\.post\)/);
  assert.match(page, /<PostCard key=\{post\.id\} \{\.\.\.props\} post=\{post\} \/>/);
  assert.match(page, /runExclusive\(event, \(\) => onProfile\(post\)\)/);
  assert.match(notices, /62a9588577ec6f5ce6d28b50d30bf46d2229453d/);
  assert.match(notices, /Next Sosyal Beta source-era brand assets/);
  assert.match(license, /Copyright \(c\) 2022 ccrsxx/);
  assert.match(sourceEraLicense, /GNU AFFERO GENERAL PUBLIC LICENSE/);
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
    { id: "reply-1", name: "Selin Uçak", replyTo: "İdil Aras", replyToId: "root" },
    { id: "reply-2", name: "Bora Ekin", replyTo: "İdil Aras", replyToId: "root" },
    { id: "other", name: "Mert Soylu", replyTo: "Başka Biri" },
    { id: "same-name-root", name: "İdil Aras", replyTo: "Başka Biri", replyToId: "other-root" },
  ];
  assert.deepEqual(
    repliesForThread(candidates, root).map((post) => post.id),
    ["reply-1", "reply-2"],
  );
});

test("stable reply ids keep a published detail reply in its thread", () => {
  const root = { id: "root", name: "İdil Aras" };
  const published = { id: "local-reply", name: "Deniz Naz", replyTo: "İdil Aras", replyToId: "root" };
  const reopened = repliesForThread([root, published, published], root);
  assert.deepEqual(reopened.map((post) => post.id), ["local-reply"]);
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
