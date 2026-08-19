"use client";

/* eslint-disable @next/next/no-img-element -- Official SVG assets must be rendered byte-for-byte. */
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  removeItem,
  repliesForThread,
  runExclusive,
  toggleItem,
  togglePinned,
} from "./demo-state.mjs";

/**
 * Social shell, composer/action anatomy, and responsive navigation are adapted
 * from ccrsxx/twitter-clone at 62a9588577ec6f5ce6d28b50d30bf46d2229453d.
 * This is a local-only React 19 rewrite; see THIRD_PARTY_NOTICES.md.
 */
type View = "feed" | "explore" | "notifications" | "messages" | "bookmarks" | "profile" | "settings" | "detail";
type FeedMode = "for-you" | "following";
type Theme = "light" | "dark";
type Attachment = "signal" | "note";
type Post = {
  id: string; name: string; handle: string; time: string; body: string; initials: string;
  tone: string; replies: number; reposts: number; likes: number; audience: "all" | "following";
  replyTo?: string; context?: boolean; attachment?: Attachment; own?: boolean;
};
type Actions = { likes: string[]; reposts: string[]; bookmarks: string[] };
type Mods = { deleted: string[]; pinned: string | null };
type Profile = { name: string; handle: string; initials: string; bio: string; location: string };
type Message = { id: string; from: "me" | "them"; body: string };
type ActionIconName = "reply" | "repost" | "like" | "bookmark" | "share";

const demoProfile: Profile = { name: "Deniz Naz", handle: "@denizn", initials: "DN", bio: "Şehir, ekran ve insanlar hakkında küçük notlar.", location: "İstanbul" };
const seedPosts: Post[] = [
  { id: "iklim-kent", name: "İdil Aras", handle: "@idilaras", time: "18 dk", body: "Kentte serinlemek bir lüks değil, altyapı meselesi. Gölgeli duraklar, açık su noktaları ve gece geç saatlere kadar açık kütüphaneler hakkında konuşalım.", initials: "İA", tone: "coral", replies: 86, reposts: 142, likes: 982, audience: "all", context: true, attachment: "signal" },
  { id: "film-kulubu", name: "Mert Soylu", handle: "@mertsoylu", time: "31 dk", body: "Bu akşam filmlerden sonra 10 dakika sessizlik kuralı koyabilir miyiz? Her şey biter bitmez yorum yapmak zorunda değiliz.", initials: "MS", tone: "violet", replies: 24, reposts: 18, likes: 311, audience: "following" },
  { id: "acik-veri", name: "Açık Veri Günlüğü", handle: "@acikverigunlugu", time: "1 sa", body: "Yeni açık veri notumuz yayında: Belediyelerin erişilebilirlik haritaları tek bir standartta nasıl buluşabilir? Kısa bir okuma listesi bıraktık.", initials: "AV", tone: "teal", replies: 39, reposts: 204, likes: 746, audience: "all", attachment: "note" },
  { id: "sabah-kosu", name: "Cemre Yalın", handle: "@cemreyln", time: "2 sa", body: "Sabah yürüyüşünde duyduğum tek motor sesi vapurdu. Şehrin bazen kendine bıraktığı o dar aralık çok iyi geliyor.", initials: "CY", tone: "gold", replies: 11, reposts: 7, likes: 198, audience: "following" },
];
const seedReplies: Post[] = [
  { id: "yanit-1", name: "Selin Uçak", handle: "@selinucak", time: "12 dk", body: "Buna okul çıkış saatlerinde çalışan serin rota bilgisini de eklemek gerekir. İklim haritaları günlük kararları etkiliyor.", initials: "SU", tone: "teal", replies: 3, reposts: 4, likes: 76, audience: "all", replyTo: "İdil Aras" },
  { id: "yanit-2", name: "Bora Ekin", handle: "@boraekin", time: "7 dk", body: "Gece açık kamusal alan fikri önemli. Serinlik, güvenlik ve ulaşım birlikte düşünülünce gerçekten işe yarıyor.", initials: "BE", tone: "violet", replies: 1, reposts: 2, likes: 41, audience: "all", replyTo: "İdil Aras" },
];
const contextBullets = [
  "Konu, sıcak dalgalarında kamusal alanların erişilebilir kalması etrafında şekilleniyor.",
  "Konuşmada durak gölgesi, içme suyu ve gece açık güvenli alanlar öne çıkıyor.",
  "Yerel uygulama örnekleri isteniyor; öneriler henüz doğrulanmış bir plan değil.",
];
const navigation: { id: View; label: string; icon: string }[] = [
  { id: "feed", label: "Ana Sayfa", icon: "⌂" }, { id: "explore", label: "Keşfet", icon: "⌕" },
  { id: "notifications", label: "Bildirimler", icon: "♧" }, { id: "messages", label: "Mesajlar", icon: "✉" },
  { id: "bookmarks", label: "Yer İmleri", icon: "▱" }, { id: "profile", label: "Profil", icon: "◉" },
];

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const value = window.localStorage.getItem(key); return value ? (JSON.parse(value) as T) : fallback; } catch { return fallback; }
}
function formatNumber(value: number) { return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value); }

export default function Home() {
  const [view, setView] = useState<View>("feed");
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [theme, setTheme] = useState<Theme>("dark");
  const [actions, setActions] = useState<Actions>({ likes: [], reposts: [], bookmarks: [] });
  const [mods, setMods] = useState<Mods>({ deleted: [], pinned: null });
  const [draftPosts, setDraftPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [following, setFollowing] = useState<string[]>(["@bariskoral"]);
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", from: "them", body: "Bağlam özeti, konuşmaya yetişmene yardımcı olur. Her zaman kaynaklara göz atmayı unutma." }]);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [composerText, setComposerText] = useState("");
  const [composerMedia, setComposerMedia] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [profilePost, setProfilePost] = useState<Post | null>(null);
  const [morePost, setMorePost] = useState<Post | null>(null);
  const [mediaPost, setMediaPost] = useState<Post | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [shareFeedback, setShareFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [headerCompact, setHeaderCompact] = useState(false);
  const restoredLocalState = useRef(false);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      setTheme(readStored("nsosyal-theme", "dark"));
      setActions(readStored("nsosyal-actions", { likes: [], reposts: [], bookmarks: [] }));
      setMods(readStored("nsosyal-mods", { deleted: [], pinned: null }));
      setDraftPosts(readStored("nsosyal-drafts", []));
      setProfile(readStored("nsosyal-profile", demoProfile));
      setFollowing(readStored("nsosyal-following", ["@bariskoral"]));
      setMessages(readStored("nsosyal-messages", [{ id: "welcome", from: "them", body: "Bağlam özeti, konuşmaya yetişmene yardımcı olur. Her zaman kaynaklara göz atmayı unutma." }]));
      setReadNotifications(readStored("nsosyal-read-notifications", []));
      restoredLocalState.current = true;
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; if (restoredLocalState.current) window.localStorage.setItem("nsosyal-theme", JSON.stringify(theme)); }, [theme]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-actions", JSON.stringify(actions)); }, [actions]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-mods", JSON.stringify(mods)); }, [mods]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-drafts", JSON.stringify(draftPosts)); }, [draftPosts]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-profile", JSON.stringify(profile)); }, [profile]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-following", JSON.stringify(following)); }, [following]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-read-notifications", JSON.stringify(readNotifications)); }, [readNotifications]);
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const syncHeader = () => {
      const currentScrollY = window.scrollY;
      setHeaderCompact(currentScrollY > 20 && currentScrollY > lastScrollY);
      lastScrollY = currentScrollY;
    };
    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    return () => window.removeEventListener("scroll", syncHeader);
  }, []);

  const posts = useMemo(() => [...draftPosts, ...seedPosts].filter((post) => !mods.deleted.includes(post.id)).sort((a, b) => Number(b.id === mods.pinned) - Number(a.id === mods.pinned)), [draftPosts, mods]);
  const bookmarkPosts = posts.filter((post) => actions.bookmarks.includes(post.id));
  const displayedPosts = useMemo(() => view === "bookmarks" ? bookmarkPosts : feedMode === "following" ? posts.filter((post) => post.audience === "following" || post.own) : posts, [bookmarkPosts, feedMode, posts, view]);
  const startReply = (post: Post) => { setReplyingTo(post); setView("feed"); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 80); };
  const openDetail = (post: Post) => { setSelectedPost(post); setContextOpen(true); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openProfile = (post: Post) => { setProfilePost(post); setView("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const updateAction = (kind: keyof Actions, id: string) => setActions((current) => ({ ...current, [kind]: toggleItem(current[kind], id) }));
  const toggleFollow = (handle: string) => setFollowing((current) => toggleItem(current, handle));
  const quotePost = (post: Post) => { setReplyingTo(null); setComposerText("“" + post.body.slice(0, 92) + (post.body.length > 92 ? "…" : "") + "” için düşüncem: "); setView("feed"); setNotice("Alıntı için metin alanı hazır."); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 120); };
  async function sharePost(post: Post) {
    try { await navigator.clipboard.writeText(post.name + ": " + post.body); setShareFeedback("Gönderi metni panoya kopyalandı."); } catch { setShareFeedback("Paylaşmaya hazır: metni seçip kopyalayabilirsin."); }
    window.setTimeout(() => setShareFeedback(""), 2600);
  }
  function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = composerText.trim();
    if (!body) { setNotice("Önce aklından geçenleri yaz."); return; }
    const post: Post = { id: "yerel-" + Date.now(), name: profile.name, handle: profile.handle, time: "şimdi", body: replyingTo ? replyingTo.handle + " " + body : body, initials: profile.initials, tone: "ink", replies: 0, reposts: 0, likes: 0, audience: "following", replyTo: replyingTo?.name, attachment: composerMedia ? "signal" : undefined, own: true };
    setDraftPosts((current) => [post, ...current]); setComposerText(""); setComposerMedia(false); setReplyingTo(null); setNotice("Gönderin ana sayfaa eklendi."); setView("feed");
  }
  function useComposerTool(kind: "media" | "location" | "poll" | "mood") {
    if (kind === "media") { setComposerMedia((value) => !value); setNotice(composerMedia ? "Görsel taslağı kaldırıldı." : "Görsel taslağı eklendi."); }
    if (kind === "location") setComposerText((value) => value + (value ? " " : "") + "#" + profile.location.replaceAll(" ", ""));
    if (kind === "poll") setComposerText((value) => value || "Sence hangisi daha önce ele alınmalı?\n• Gölge\n• Su noktaları");
    if (kind === "mood") setComposerText((value) => value + " ✦");
  }
  function deleteOwnPost(post: Post) { setMods((current) => ({ ...current, deleted: removeItem(current.deleted, post.id), pinned: current.pinned === post.id ? null : current.pinned })); setMorePost(null); setSelectedPost(null); setNotice("Gönderin bu cihazdaki ana sayfadan kaldırıldı."); setView("feed"); }
  function togglePin(post: Post) { setMods((current) => ({ ...current, pinned: togglePinned(current.pinned, post.id) })); setMorePost(null); setNotice(mods.pinned === post.id ? "Gönderi sabitlemeden kaldırıldı." : "Gönderi profiline sabitlendi."); }
  function resetDemo() {
    ["nsosyal-actions", "nsosyal-mods", "nsosyal-drafts", "nsosyal-profile", "nsosyal-following", "nsosyal-messages", "nsosyal-read-notifications"].forEach((key) => window.localStorage.removeItem(key));
    setActions({ likes: [], reposts: [], bookmarks: [] }); setMods({ deleted: [], pinned: null }); setDraftPosts([]); setProfile(demoProfile); setFollowing(["@bariskoral"]); setMessages([{ id: "welcome", from: "them", body: "Bağlam özeti, konuşmaya yetişmene yardımcı olur. Her zaman kaynaklara göz atmayı unutma." }]); setReadNotifications([]); setTheme("dark"); setNotice("Demo başlangıç durumuna döndü."); setView("feed");
  }
  const title = view === "bookmarks" ? "Yer İmleri" : view === "explore" ? "Keşfet" : view === "notifications" ? "Bildirimler" : view === "messages" ? "Mesajlar" : view === "profile" ? "Profil" : "Ana Sayfa";
  const feedProps: Omit<FeedProps, "posts" | "morePost"> = { actions, pinned: mods.pinned, following, onAction: updateAction, onReply: startReply, onDetail: openDetail, onProfile: openProfile, onQuote: quotePost, onShare: sharePost, onMore: setMorePost, onMedia: setMediaPost, onDelete: deleteOwnPost, onPin: togglePin, onFollow: toggleFollow };
  const isOwnProfile = !profilePost || profilePost.own;
  const visibleProfile: Profile = profilePost && !profilePost.own ? { name: profilePost.name, handle: profilePost.handle, initials: profilePost.initials, bio: "NSosyal’daki açık konuşmalara katılıyor. Bu profil, çevrimdışı demo verisiyle gösteriliyor.", location: "Türkiye" } : profile;
  const profilePosts = profilePost && !profilePost.own ? posts.filter((post) => post.handle === profilePost.handle) : posts.filter((post) => post.own);

  return <main className="app-shell">
    <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
    <Sidebar view={view} setView={setView} profile={profile} unread={3 - readNotifications.length} onCompose={() => { setView("feed"); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 80); }} />
    <section className="timeline" aria-label={title}>
      <header className={"topbar " + (headerCompact ? "is-compact" : "")}>{view === "detail" ? <button className="back-button" onClick={() => setView("feed")} aria-label="Ana Sayfaya dön">←</button> : <span className="mobile-brand"><BrandMark small /><span className="sr-only">NSosyal</span></span>}<div className="topbar-heading"><span className="topbar-context">NSosyal</span><h1>{view === "detail" ? "NSosyal" : title}</h1></div><button className="top-action" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label="Temayı değiştir">{theme === "light" ? "◐" : "☀"}</button></header>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Bildirimi kapat">×</button></div>}
      <div id="main-content" className="content-area">
        {view === "feed" && <><div className="feed-tabs" role="tablist" aria-label="Ana Sayfa seçimi"><button role="tab" aria-selected={feedMode === "for-you"} className={feedMode === "for-you" ? "selected" : ""} onClick={() => setFeedMode("for-you")}>Sana Özel</button><button role="tab" aria-selected={feedMode === "following"} className={feedMode === "following" ? "selected" : ""} onClick={() => setFeedMode("following")}>Takip Ettiklerin</button></div><Composer text={composerText} setText={setComposerText} media={composerMedia} onTool={useComposerTool} replyingTo={replyingTo} clearReply={() => setReplyingTo(null)} onSubmit={createPost} /><Feed {...feedProps} posts={displayedPosts} morePost={morePost} /></>}
        {view === "detail" && selectedPost && <ThreadDetail {...feedProps} post={selectedPost} morePost={morePost} contextOpen={contextOpen} setContextOpen={setContextOpen} />}
        {view === "explore" && <Explore {...feedProps} posts={posts} search={search} setSearch={setSearch} />}
        {view === "notifications" && <Notifications read={readNotifications} setRead={setReadNotifications} onOpen={openDetail} />}
        {view === "messages" && <Messages messages={messages} setMessages={setMessages} profile={profile} />}
        {view === "bookmarks" && <><div className="view-intro"><p>Kaydettiğin konuşmalar burada, bu cihazda kalır.</p></div>{displayedPosts.length ? <Feed {...feedProps} posts={displayedPosts} morePost={morePost} /> : <EmptyState title="Henüz yer imi yok" copy="İlginç bir gönderiyi sonra dönmek için kaydedebilirsin." />}</>}
        {view === "profile" && <Profile {...feedProps} profile={visibleProfile} isOwn={isOwnProfile} posts={profilePosts} morePost={morePost} onEdit={() => setEditingProfile(true)} />}
        {view === "settings" && <Settings theme={theme} setTheme={setTheme} onReset={resetDemo} />}
      </div>
    </section>
    <aside className="right-rail" aria-label="Gündem ve öneriler"><div className="search-field"><span aria-hidden="true">⌕</span><input aria-label="NSosyal ara" placeholder="NSosyal ara" value={search} onChange={(event) => { setSearch(event.target.value); setView("explore"); }} /></div><TrendPanel onSelect={(topic) => { setSearch(topic); setView("explore"); }} /><WhoToFollow following={following} onFollow={toggleFollow} /><p className="legal">Koşullar · Gizlilik · Çerezler<br />NSosyal 2026</p></aside>
    <MobileNav view={view} setView={setView} unread={3 - readNotifications.length} />
    {shareFeedback && <div className="toast" role="status">{shareFeedback}</div>}
    {morePost && <MoreMenu post={morePost} isPinned={mods.pinned === morePost.id} followed={following.includes(morePost.handle)} onClose={() => setMorePost(null)} onDelete={deleteOwnPost} onPin={togglePin} onFollow={toggleFollow} onShare={sharePost} />}
    {mediaPost && <MediaPreview post={mediaPost} onClose={() => setMediaPost(null)} />}
    {editingProfile && <ProfileEditor profile={profile} onClose={() => setEditingProfile(false)} onSave={(next) => { setProfile(next); setEditingProfile(false); setNotice("Profilin güncellendi."); }} />}
  </main>;
}

function BrandMark({ small = false }: { small?: boolean }) { return <span className={"brand-mark " + (small ? "small" : "")} aria-hidden="true">{small ? <img src="/brand/nsosyal-favicon.svg" alt="" /> : <><img className="logo-for-dark" src="/brand/nsosyal-logo-dark.svg" alt="" /><img className="logo-for-light" src="/brand/nsosyal-logo-light.svg" alt="" /></>}</span>; }
function Avatar({ initials, tone }: { initials: string; tone: string }) { return <span className={"avatar " + tone}>{initials}</span>; }
function Sidebar({ view, setView, profile, unread, onCompose }: { view: View; setView: (view: View) => void; profile: Profile; unread: number; onCompose: () => void }) { return <aside className="sidebar" aria-label="Ana gezinme"><button className="brand" onClick={() => setView("feed")} aria-label="NSosyal ana sayfa"><BrandMark /><span className="sr-only">NSosyal</span></button><nav className="nav-list">{navigation.map((item) => <button key={item.id} className={"nav-item " + (view === item.id || (view === "detail" && item.id === "feed") ? "is-active" : "")} onClick={() => setView(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.id === "notifications" && unread > 0 && <b className="nav-dot">{unread}</b>}</button>)}<button className={"nav-item " + (view === "settings" ? "is-active" : "")} onClick={() => setView("settings")}><span className="nav-icon" aria-hidden="true">◌</span><span>Daha Fazla</span></button></nav><button className="primary-button sidebar-compose" onClick={onCompose}><span className="desktop-only">Paylaş</span><span className="mobile-only" aria-hidden="true">＋</span></button><button className="mini-profile" onClick={() => setView("profile")}><Avatar initials={profile.initials} tone="ink" /><span><strong>{profile.name}</strong><small>{profile.handle}</small></span><b aria-hidden="true">•••</b></button></aside>; }
function MobileNav({ view, setView, unread }: { view: View; setView: (view: View) => void; unread: number }) { return <nav className="bottom-nav" aria-label="Mobil gezinme">{navigation.slice(0, 5).map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)} aria-label={item.label}><span aria-hidden="true">{item.icon}</span>{item.id === "notifications" && unread > 0 && <b />}</button>)}</nav>; }
function Composer({ text, setText, media, onTool, replyingTo, clearReply, onSubmit }: { text: string; setText: (value: string) => void; media: boolean; onTool: (kind: "media" | "location" | "poll" | "mood") => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <form className="composer" onSubmit={onSubmit}><Avatar initials="DN" tone="ink" /><div className="composer-body">{replyingTo && <div className="replying">Şuna yanıtlıyorsun: <b>{replyingTo.name}</b><button type="button" onClick={clearReply} aria-label="Yanıtı iptal et">×</button></div>}<label className="sr-only" htmlFor="compose-input">Yeni gönderi yaz</label><textarea id="compose-input" value={text} onChange={(event) => setText(event.target.value.slice(0, 280))} placeholder={replyingTo ? "Yanıtını yaz" : "Ne düşünüyorsun?"} rows={2} />{media && <div className="composer-media"><span className="signal-art"><i /><i /><i /></span><span><b>Görsel taslağı</b><small>Gönderi ile birlikte paylaşılacak</small></span><button type="button" onClick={() => onTool("media")} aria-label="Görsel taslağını kaldır">×</button></div>}<div className="compose-footer"><div className="compose-tools" aria-label="Gönderi ekleri"><button type="button" onClick={() => onTool("media")} aria-label="Görsel taslağı ekle">▧</button><button type="button" onClick={() => onTool("location")} aria-label="Konum ekle">⌖</button><button type="button" onClick={() => onTool("poll")} aria-label="Anket taslağı ekle">▤</button><button type="button" onClick={() => onTool("mood")} aria-label="Duygu ekle">☺</button></div><span className={text.length > 250 ? "limit near" : "limit"}>{280 - text.length}</span><button className="primary-button small-button" type="submit">Paylaş</button></div></div></form>; }

type FeedProps = { posts: Post[]; actions: Actions; pinned: string | null; morePost: Post | null; following: string[]; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onDetail: (post: Post) => void; onProfile: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void; onMore: (post: Post | null) => void; onMedia: (post: Post) => void; onDelete: (post: Post) => void; onPin: (post: Post) => void; onFollow: (handle: string) => void; };
function Feed(props: FeedProps) { return <div className="post-list">{props.posts.map((post) => <PostCard key={post.id} post={post} {...props} />)}</div>; }
function PostCard({ post, actions, pinned, following, onAction, onReply, onDetail, onProfile, onQuote, onShare, onMore, onMedia, onFollow }: FeedProps & { post: Post }) {
  const liked = actions.likes.includes(post.id), reposted = actions.reposts.includes(post.id), saved = actions.bookmarks.includes(post.id);
  return <article className={"post " + (post.replies > 0 ? "has-thread" : "")}>{pinned === post.id && <p className="pin-status">⌖ Profilde sabitlendi</p>}<button className="avatar-button" onClick={(event) => runExclusive(event, () => onProfile(post))} aria-label={post.name + " profilini aç"}><Avatar initials={post.initials} tone={post.tone} /></button><div className="post-content">{post.replyTo && <p className="reply-context">{post.replyTo} adlı kişiye yanıt olarak</p>}<div className="post-meta"><button className="name" onClick={(event) => runExclusive(event, () => onProfile(post))}>{post.name}</button><span>{post.handle}</span><span>·</span><button className="time" onClick={() => onDetail(post)}>{post.time}</button><button className="more" aria-label="Gönderi seçeneklerini aç" onClick={(event) => runExclusive(event, () => onMore(post))}>•••</button></div><button className="post-body" onClick={() => onDetail(post)} aria-label="Gönderinin ayrıntılarını aç">{post.body}</button>{post.attachment === "signal" && <button className="signal-card media-card" onClick={(event) => runExclusive(event, () => onMedia(post))} aria-label="Şehir serinliği notları görselini aç"><span className="signal-art" aria-hidden="true"><i /><i /><i /></span><span className="signal-caption"><span>Kent notları</span><b>Şehir serinliği notları</b><small>Görsel önizlemeyi aç</small></span><em aria-hidden="true">↗</em></button>}{post.attachment === "note" && <button className="note-card" onClick={(event) => runExclusive(event, () => onMedia(post))}><span>Okuma notu</span><b>Yerel veriyi ortak bir dilde buluşturmak</b><small>Önizlemeyi aç · 4 dk okuma</small></button>}<div className="post-actions" aria-label="Gönderi işlemleri"><ActionButton icon="reply" label="Yanıtla" count={post.replies} onClick={() => onReply(post)} /><ActionButton icon="repost" label="Yeniden paylaş" count={post.reposts + Number(reposted)} active={reposted} onClick={() => onAction("reposts", post.id)} onAux={() => onQuote(post)} /><ActionButton icon="like" label="Beğen" count={post.likes + Number(liked)} active={liked} kind="like" onClick={() => onAction("likes", post.id)} /><ActionButton icon="bookmark" label={saved ? "Yer iminden kaldır" : "Yer imlerine ekle"} active={saved} onClick={() => onAction("bookmarks", post.id)} /><ActionButton icon="share" label="Paylaş" onClick={() => onShare(post)} /></div>{!post.own && <button className="post-follow" aria-pressed={following.includes(post.handle)} onClick={(event) => runExclusive(event, () => onFollow(post.handle))}>{following.includes(post.handle) ? "Takip Ediliyor" : "Takip et"}</button>}</div></article>;
}
function ActionIcon({ name }: { name: ActionIconName }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{name === "reply" && <><path {...shared} d="M20 11.5a7.2 7.2 0 0 1-7.5 7.1A8.5 8.5 0 0 1 8.8 17L4 18.7l1.5-4.1A6.8 6.8 0 0 1 5 12c0-3.8 3.4-6.9 7.5-6.9S20 7.7 20 11.5Z" /></>}{name === "repost" && <><path {...shared} d="m7 7 3-3 3 3M10 4v11a4 4 0 0 0 4 4h3" /><path {...shared} d="m17 17-3 3-3-3M14 20V9a4 4 0 0 0-4-4H7" /></>}{name === "like" && <path {...shared} d="M20.8 8.7c0 5-8.8 10.1-8.8 10.1S3.2 13.7 3.2 8.7A4.2 4.2 0 0 1 11 6.5L12 8l1-1.5a4.2 4.2 0 0 1 7.8 2.2Z" />}{name === "bookmark" && <path {...shared} d="M6.5 4.5h11v15l-5.5-3.2-5.5 3.2v-15Z" />}{name === "share" && <><circle {...shared} cx="18" cy="5" r="2.3" /><circle {...shared} cx="6" cy="12" r="2.3" /><circle {...shared} cx="18" cy="19" r="2.3" /><path {...shared} d="m8.1 10.9 7.8-4.7M8.1 13.1l7.8 4.7" /></>}</svg>;
}
function ActionButton({ icon, label, count, active, kind, onClick, onAux }: { icon: ActionIconName; label: string; count?: number; active?: boolean; kind?: "like"; onClick: () => void; onAux?: () => void }) { return <span className={"action-wrap " + (active ? "active " : "") + (kind || "")}><button className="action" aria-label={label} aria-pressed={typeof active === "boolean" ? active : undefined} onClick={(event) => runExclusive(event, onClick)}><i aria-hidden="true"><ActionIcon name={icon} /></i>{typeof count === "number" && <small>{formatNumber(count)}</small>}</button>{onAux && <button className="quote-mini" onClick={(event) => runExclusive(event, onAux)} aria-label="Alıntıla">＋</button>}</span>; }
function ThreadDetail(props: FeedProps & { post: Post; contextOpen: boolean; setContextOpen: (value: boolean) => void }) { const replies = props.post.context ? repliesForThread(seedReplies, props.post) : []; return <div className="thread-view"><PostCard {...props} />{props.post.context && <section className="context-summary" aria-label="Bağlam özeti"><button className="context-toggle" onClick={() => props.setContextOpen(!props.contextOpen)} aria-expanded={props.contextOpen}><span><i aria-hidden="true">✦</i><b>Bağlam Özeti</b><small>Bu konuşmada öne çıkanlar</small></span><span aria-hidden="true">{props.contextOpen ? "⌃" : "⌄"}</span></button>{props.contextOpen && <div className="summary-content"><ul>{contextBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><p>NSosyal yapay zekâ özeti <span>·</span> Hata içerebilir.</p></div>}</section>}<div className="thread-reply"><Avatar initials="DN" tone="ink" /><button onClick={() => props.onReply(props.post)}>Yanıtını yaz</button></div>{replies.length ? <Feed {...props} posts={replies} /> : <EmptyState title="Konuşma burada sakin" copy="İlk düşünceni paylaşarak bu gönderiyi büyütebilirsin." />}</div>; }
function Explore(props: Omit<FeedProps, "posts" | "morePost"> & { search: string; setSearch: (value: string) => void; posts: Post[] }) { const visible = props.posts.filter((post) => (post.name + " " + post.body).toLocaleLowerCase("tr").includes(props.search.toLocaleLowerCase("tr"))); return <div className="explore-view"><div className="explore-search"><span aria-hidden="true">⌕</span><input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Kişi ya da konu ara" aria-label="Kişi ya da konu ara" /></div>{props.search ? <><h2>Arama sonuçları</h2>{visible.length ? <div className="search-results"><Feed {...props} posts={visible} morePost={null} /></div> : <EmptyState title="Bir sonuç bulamadık" copy="Başka bir kelimeyle aramayı dene." />}</> : <><h2>Bugün konuşulanlar</h2><TrendPanel full onSelect={props.setSearch} /><section className="editor-pick"><p>Editörün seçimi</p><button onClick={() => props.onDetail(seedPosts[0])}><span className="editor-ripple"><i /><i /></span><span><b>Şehir nasıl serin kalır?</b><small>İklim ve kamusal alan üzerine açık konuşma</small></span><em>→</em></button></section></>}</div>; }
function Notifications({ read, setRead, onOpen }: { read: string[]; setRead: (value: string[]) => void; onOpen: (post: Post) => void }) { const [filter, setFilter] = useState<"all" | "unread">("all"); const items = [{ id: "selin", post: seedPosts[0], avatar: <Avatar initials="SU" tone="teal" />, copy: <><b>Selin Uçak</b> seninle aynı serin rota fikrini konuşuyor.</> }, { id: "veri", post: seedPosts[2], avatar: <span className="notification-stack"><Avatar initials="AV" tone="teal" /><Avatar initials="MS" tone="violet" /></span>, copy: <><b>Açık Veri Günlüğü</b> ve 12 kişi kaydettiğin notu beğendi.</> }, { id: "secim", post: seedPosts[1], avatar: <span className="spark">✦</span>, copy: <><b>NSosyal seçkisine hoş geldin.</b> Takip ettiğin konulardan daha dengeli bir ana sayfa hazırlıyoruz.</> }]; return <div className="notifications-view"><div className="notification-tabs"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Tümü</button><button className={filter === "unread" ? "selected" : ""} onClick={() => setFilter("unread")}>Okunmamış</button></div>{items.filter((item) => filter === "all" || !read.includes(item.id)).map((item) => <button key={item.id} className={"notification " + (read.includes(item.id) ? "is-read" : "")} onClick={() => { if (!read.includes(item.id)) setRead([...read, item.id]); onOpen(item.post); }}>{item.avatar}<span>{item.copy}<small>{read.includes(item.id) ? "Okundu" : "Yeni"}</small></span><em>→</em></button>)}</div>; }
function Messages({ messages, setMessages, profile }: { messages: Message[]; setMessages: (next: Message[]) => void; profile: Profile }) { const [open, setOpen] = useState("NSosyal Ekibi"); const [draft, setDraft] = useState(""); const send = () => { const body = draft.trim(); if (!body) return; setMessages([...messages, { id: "message-" + Date.now(), from: "me", body }]); setDraft(""); }; return <div className="messages-view"><div className="message-list"><button className={open === "NSosyal Ekibi" ? "selected" : ""} onClick={() => setOpen("NSosyal Ekibi")}><Avatar initials="YE" tone="coral" /><span><b>NSosyal Ekibi</b><small>Bağlam özeti hakkında…</small></span></button><button className={open === "Bora Ekin" ? "selected" : ""} onClick={() => setOpen("Bora Ekin")}><Avatar initials="BE" tone="violet" /><span><b>Bora Ekin</b><small>Rota notlarına baktın mı?</small></span></button></div><section className="message-thread"><header><Avatar initials={open === "NSosyal Ekibi" ? "YE" : "BE"} tone={open === "NSosyal Ekibi" ? "coral" : "violet"} /><span><b>{open}</b><small>@{open === "NSosyal Ekibi" ? "nsosyalekibi" : "boraekin"}</small></span></header><div className="message-scroll">{messages.map((message) => <div key={message.id} className={"message-bubble " + message.from}>{message.body}</div>)}</div><form className="message-compose" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={profile.name + " olarak mesaj yaz"} aria-label="Yeni bir mesaj yaz" /><button aria-label="Gönder" type="submit">↑</button></form></section></div>; }
function Profile(props: FeedProps & { profile: Profile; isOwn: boolean; onEdit: () => void }) { const [tab, setTab] = useState<"posts" | "replies" | "likes">("posts"); const visible = tab === "posts" ? props.posts.filter((post) => !post.replyTo) : tab === "replies" ? props.posts.filter((post) => post.replyTo) : props.posts.filter((post) => props.actions.likes.includes(post.id)); const copy = tab === "posts" ? "Ana Sayfadan yeni bir düşünce başlatabilirsin." : tab === "replies" ? "Bir gönderiya yanıt verdiğinde burada görünür." : "Beğendiğin kendi gönderiler burada görünür."; const followed = props.following.includes(props.profile.handle); return <div className="profile-view"><div className="profile-cover"><span className="cover-ripple"><i /><i /><i /></span></div><div className="profile-head"><Avatar initials={props.profile.initials} tone="ink" />{props.isOwn ? <button className="outline-button" onClick={props.onEdit}>Profili düzenle</button> : <button className={followed ? "outline-button" : "primary-button"} aria-pressed={followed} onClick={() => props.onFollow(props.profile.handle)}>{followed ? "Takip Ediliyor" : "Takip et"}</button>}</div><section className="profile-copy"><h2>{props.profile.name} <span>●</span></h2><p>{props.profile.handle}</p><p className="bio">{props.profile.bio}</p><div><span>⌖ {props.profile.location}</span><span>◷ Mayıs 2024’te katıldı</span></div><p><b>284</b> Takip edilen <b>1.208</b> Takipçi</p></section><div className="profile-tabs"><button className={tab === "posts" ? "selected" : ""} onClick={() => setTab("posts")}>Paylaşr</button><button className={tab === "replies" ? "selected" : ""} onClick={() => setTab("replies")}>Yanıtlar</button><button className={tab === "likes" ? "selected" : ""} onClick={() => setTab("likes")}>Beğeniler</button></div>{visible.length ? <Feed {...props} posts={visible} /> : <EmptyState title="Henüz burada bir şey yok" copy={copy} />}</div>; }
function Settings({ theme, setTheme, onReset }: { theme: Theme; setTheme: (theme: Theme) => void; onReset: () => void }) { return <div className="settings-view"><section><h2>Görünüm</h2><p>NSosyal’ın bu cihazdaki görünümünü seç.</p><div className="theme-options"><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-preview light" />Açık</button><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-preview dark" />Koyu</button></div></section><section><h2>Yerel demo</h2><p>Paylaşrın, beğenilerin, mesajların ve yer imlerin sadece bu tarayıcıda saklanır.</p><button className="outline-button demo-reset" onClick={onReset}>Demo verisini sıfırla</button></section><section><h2>Bağlam özeti</h2><p>Özetler konuşmaya yaklaşmana yardım eder; kesin bilgi yerine kaynaklara ve katılımcılara öncelik ver.</p></section></div>; }
function TrendPanel({ full = false, onSelect }: { full?: boolean; onSelect: (topic: string) => void }) { const trends = [["Türkiye’de gündem", "#serinrota", "4.282 gönderi"], ["Teknoloji · Gündem", "Açık standart", "1.904 gönderi"], ["Kültür · Gündem", "Sessiz sinema", "916 gönderi"], ["İstanbul’da gündem", "Gece kütüphanesi", "683 gönderi"]]; return <section className={"trend-panel " + (full ? "full" : "")}><h2>{full ? "Gündem" : "Şu an konuşulanlar"}</h2>{trends.map(([meta, topic, count]) => <button key={topic} onClick={() => onSelect(topic)}><span><small>{meta}</small><b>{topic}</b><small>{count}</small></span><em aria-hidden="true">•••</em></button>)}<p className="show-more">Gündem, örnek verilerle güncellenir.</p></section>; }
function WhoToFollow({ following, onFollow }: { following: string[]; onFollow: (handle: string) => void }) { const people = [{ name: "Sena Ertem", handle: "@senaertem", initials: "SE", tone: "gold" }, { name: "Barış Koral", handle: "@bariskoral", initials: "BK", tone: "violet" }]; return <section className="who-panel"><h2>Tanıyor olabileceğin kişiler</h2>{people.map((person) => <div key={person.handle}><Avatar initials={person.initials} tone={person.tone} /><span><b>{person.name}</b><small>{person.handle}</small></span><button className={following.includes(person.handle) ? "outline-button" : "dark-button"} aria-pressed={following.includes(person.handle)} onClick={() => onFollow(person.handle)}>{following.includes(person.handle) ? "Takip Ediliyor" : "Takip et"}</button></div>)}<p className="show-more">Kişi önerileri örnek veriyle sınırlı.</p></section>; }
function MoreMenu({ post, isPinned, followed, onClose, onDelete, onPin, onFollow, onShare }: { post: Post; isPinned: boolean; followed: boolean; onClose: () => void; onDelete: (post: Post) => void; onPin: (post: Post) => void; onFollow: (handle: string) => void; onShare: (post: Post) => void }) { return <div className="modal-backdrop"><section className="more-menu" role="dialog" aria-modal="true" aria-label="Gönderi seçenekleri"><button onClick={() => { onShare(post); onClose(); }}>⌑ Metni paylaş</button>{post.own ? <><button aria-pressed={isPinned} onClick={() => onPin(post)}>⌖ {isPinned ? "Profilden sabitlemeyi kaldır" : "Profiline sabitle"}</button><button className="danger" onClick={() => onDelete(post)}>⌫ Gönderiyi sil</button></> : <button aria-pressed={followed} onClick={() => { onFollow(post.handle); onClose(); }}>◉ {followed ? post.handle + " takipten çıkar" : post.handle + " takip et"}</button>}<button onClick={onClose}>Vazgeç</button></section></div>; }
function MediaPreview({ post, onClose }: { post: Post; onClose: () => void }) { return <div className="modal-backdrop"><section className="media-preview" role="dialog" aria-modal="true" aria-label="Medya önizlemesi"><button className="modal-close" onClick={onClose} aria-label="Önizlemeyi kapat">×</button><span className="media-ripple"><i /><i /><i /></span><p>{post.attachment === "note" ? "Açık veri notu" : "Şehir serinliği notları"}</p><h2>{post.body}</h2><small>Bu, çevrimdışı demo için hazırlanmış bir medya önizlemesidir.</small></section></div>; }
function ProfileEditor({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (profile: Profile) => void }) { const [draft, setDraft] = useState(profile); return <div className="modal-backdrop"><form className="profile-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}><header><h2>Profili düzenle</h2><button type="button" onClick={onClose} aria-label="Kapat">×</button></header><label>Adın<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value.slice(0, 36) })} /></label><label>Kısa bio<textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value.slice(0, 160) })} /></label><label>Konum<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value.slice(0, 36) })} /></label><button className="primary-button" type="submit">Kaydet</button></form></div>; }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <section className="empty-state"><span aria-hidden="true">◌</span><h2>{title}</h2><p>{copy}</p></section>; }
