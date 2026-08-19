"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "feed" | "explore" | "notifications" | "messages" | "bookmarks" | "profile" | "settings" | "detail";
type FeedMode = "for-you" | "following";
type Theme = "light" | "dark";

type Post = {
  id: string;
  name: string;
  handle: string;
  time: string;
  body: string;
  initials: string;
  tone: string;
  replies: number;
  reposts: number;
  likes: number;
  audience: "all" | "following";
  replyTo?: string;
  context?: boolean;
  attachment?: "signal" | "note";
};

type Actions = { likes: string[]; reposts: string[]; bookmarks: string[] };

const seedPosts: Post[] = [
  { id: "iklim-kent", name: "İdil Aras", handle: "@idilaras", time: "18 dk", body: "Kentte serinlemek bir lüks değil, altyapı meselesi. Gölgeli duraklar, açık su noktaları ve gece geç saatlere kadar açık kütüphaneler hakkında konuşalım.", initials: "İA", tone: "coral", replies: 86, reposts: 142, likes: 982, audience: "all", context: true, attachment: "signal" },
  { id: "film-kulubu", name: "Mert Soylu", handle: "@mertsoylu", time: "31 dk", body: "Bu akşam filmlerden sonra 10 dakika sessizlik kuralı koyabilir miyiz? Her şey biter bitmez yorum yapmak zorunda değiliz.", initials: "MS", tone: "violet", replies: 24, reposts: 18, likes: 311, audience: "following" },
  { id: "acik-veri", name: "Açık Veri Günlüğü", handle: "@acikverigunlugu", time: "1 sa", body: "Yeni açık veri notumuz yayında: Belediyelerin erişilebilirlik haritaları tek bir standartta nasıl buluşabilir? Kısa bir okuma listesi bıraktık.", initials: "AV", tone: "teal", replies: 39, reposts: 204, likes: 746, audience: "all", attachment: "note" },
  { id: "sabah-kosu", name: "Cemre Yalın", handle: "@cemreyln", time: "2 sa", body: "Sabah yürüyüşünde duyduğum tek motor sesi vapurdu. Şehrin bazen kendine bıraktığı o dar aralık çok iyi geliyor.", initials: "CY", tone: "gold", replies: 11, reposts: 7, likes: 198, audience: "following" },
];

const replies: Post[] = [
  { id: "yanit-1", name: "Selin Uçak", handle: "@selinucak", time: "12 dk", body: "Buna okul çıkış saatlerinde çalışan serin rota bilgisini de eklemek gerekir. İklim haritaları günlük kararları etkiliyor.", initials: "SU", tone: "teal", replies: 3, reposts: 4, likes: 76, audience: "all", replyTo: "İdil Aras" },
  { id: "yanit-2", name: "Bora Ekin", handle: "@boraekin", time: "7 dk", body: "Gece açık kamusal alan fikri önemli. Serinlik, güvenlik ve ulaşım birlikte düşünülünce gerçekten işe yarıyor.", initials: "BE", tone: "violet", replies: 1, reposts: 2, likes: 41, audience: "all", replyTo: "İdil Aras" },
];

const contextBullets = [
  "Konu, sıcak dalgalarında kamusal alanların erişilebilir kalması etrafında şekilleniyor.",
  "Konuşmada durak gölgesi, içme suyu ve gece açık güvenli alanlar öne çıkıyor.",
  "Yerel uygulama örnekleri isteniyor; öneriler henüz doğrulanmış bir plan değil.",
];

const navigation: { id: View; label: string; icon: string }[] = [
  { id: "feed", label: "Akış", icon: "⌂" }, { id: "explore", label: "Keşfet", icon: "⌕" }, { id: "notifications", label: "Bildirimler", icon: "♧" }, { id: "messages", label: "Mesajlar", icon: "✉" }, { id: "bookmarks", label: "Yer İmleri", icon: "▱" }, { id: "profile", label: "Profil", icon: "◉" },
];

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

function formatNumber(value: number) { return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value); }

export default function Home() {
  const [view, setView] = useState<View>("feed");
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [theme, setTheme] = useState<Theme>(() => readStored("yanki-theme", "light"));
  const [actions, setActions] = useState<Actions>(() => readStored("yanki-actions", { likes: [], reposts: [], bookmarks: [] }));
  const [draftPosts, setDraftPosts] = useState<Post[]>(() => readStored("yanki-drafts", []));
  const [composerText, setComposerText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [shareFeedback, setShareFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [following, setFollowing] = useState(true);

  useEffect(() => { window.localStorage.setItem("yanki-theme", JSON.stringify(theme)); document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { window.localStorage.setItem("yanki-actions", JSON.stringify(actions)); }, [actions]);
  useEffect(() => { window.localStorage.setItem("yanki-drafts", JSON.stringify(draftPosts)); }, [draftPosts]);

  const posts = useMemo(() => [...draftPosts, ...seedPosts], [draftPosts]);
  const bookmarkPosts = posts.filter((post) => actions.bookmarks.includes(post.id));
  const displayedPosts = useMemo(() => {
    if (view === "bookmarks") return bookmarkPosts;
    return feedMode === "following" ? posts.filter((post) => post.audience === "following") : posts;
  }, [bookmarkPosts, feedMode, posts, view]);

  function openDetail(post: Post) { setSelectedPost(post); setContextOpen(true); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function updateAction(kind: keyof Actions, id: string) { setActions((current) => ({ ...current, [kind]: current[kind].includes(id) ? current[kind].filter((item) => item !== id) : [...current[kind], id] })); }
  function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = composerText.trim();
    if (!body) { setNotice("Önce aklından geçenleri yaz."); return; }
    const post: Post = { id: `yerel-${Date.now()}`, name: "Sen", handle: "@sen", time: "şimdi", body: replyingTo ? `@${replyingTo.handle.slice(1)} ${body}` : body, initials: "SN", tone: "ink", replies: 0, reposts: 0, likes: 0, audience: "following", replyTo: replyingTo?.name };
    setDraftPosts((current) => [post, ...current]); setComposerText(""); setReplyingTo(null); setNotice("Yankın akışa eklendi."); setView("feed");
  }
  async function sharePost(post: Post) {
    const text = `${post.name}: ${post.body}`;
    try { await navigator.clipboard.writeText(text); setShareFeedback("Bağlantı yerine yankı metni panoya kopyalandı."); } catch { setShareFeedback("Paylaşmaya hazır: metni seçip kopyalayabilirsin."); }
    window.setTimeout(() => setShareFeedback(""), 2600);
  }
  function quotePost(post: Post) { setReplyingTo(null); setComposerText(`“${post.body.slice(0, 92)}${post.body.length > 92 ? "…" : ""}” için düşüncem: `); setView("feed"); setNotice("Alıntı için metin alanı hazır."); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 120); }
  const title = view === "bookmarks" ? "Yer İmleri" : view === "explore" ? "Keşfet" : view === "notifications" ? "Bildirimler" : view === "messages" ? "Mesajlar" : view === "profile" ? "Profil" : "Akış";

  return <main className="app-shell">
    <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
    <aside className="sidebar" aria-label="Ana gezinme">
      <button className="brand" onClick={() => setView("feed")} aria-label="Yankı ana sayfa"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>yankı</span></button>
      <nav className="nav-list">{navigation.map((item) => <button key={item.id} className={`nav-item ${view === item.id || (view === "detail" && item.id === "feed") ? "is-active" : ""}`} onClick={() => setView(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.id === "notifications" && <b className="nav-dot">3</b>}</button>)}<button className={`nav-item ${view === "settings" ? "is-active" : ""}`} onClick={() => setView("settings")}><span className="nav-icon" aria-hidden="true">◌</span><span>Daha fazla</span></button></nav>
      <button className="primary-button sidebar-compose" onClick={() => { setView("feed"); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 80); }}><span className="desktop-only">Yankıla</span><span className="mobile-only" aria-hidden="true">＋</span></button>
      <button className="mini-profile" onClick={() => setView("profile")}><Avatar initials="DN" tone="ink" /><span><strong>Deniz Naz</strong><small>@denizn</small></span><b aria-hidden="true">•••</b></button>
    </aside>
    <section className="timeline" aria-label={title}>
      <header className="topbar">{view === "detail" ? <button className="back-button" onClick={() => setView("feed")} aria-label="Akışa dön">←</button> : <span className="mobile-brand"><span className="brand-mark small" aria-hidden="true"><i /><i /><i /></span>yankı</span>}<h1>{view === "detail" ? "Yankı" : title}</h1><button className="top-action" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label="Temayı değiştir">{theme === "light" ? "◐" : "☀"}</button></header>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Bildirimi kapat">×</button></div>}
      <div id="main-content" className="content-area">
        {view === "feed" && <><div className="feed-tabs" role="tablist" aria-label="Akış seçimi"><button role="tab" aria-selected={feedMode === "for-you"} className={feedMode === "for-you" ? "selected" : ""} onClick={() => setFeedMode("for-you")}>Senin için</button><button role="tab" aria-selected={feedMode === "following"} className={feedMode === "following" ? "selected" : ""} onClick={() => setFeedMode("following")}>Takipte</button></div><Composer text={composerText} setText={setComposerText} replyingTo={replyingTo} clearReply={() => setReplyingTo(null)} onSubmit={createPost} /><Feed posts={displayedPosts} actions={actions} onAction={updateAction} onReply={setReplyingTo} onDetail={openDetail} onQuote={quotePost} onShare={sharePost} /></>}
        {view === "detail" && selectedPost && <ThreadDetail post={selectedPost} actions={actions} onAction={updateAction} onReply={setReplyingTo} onQuote={quotePost} onShare={sharePost} contextOpen={contextOpen} setContextOpen={setContextOpen} onBack={() => setView("feed")} />}
        {view === "explore" && <Explore search={search} setSearch={setSearch} onOpen={openDetail} />}
        {view === "notifications" && <Notifications onOpen={openDetail} />}
        {view === "messages" && <Messages />}
        {view === "bookmarks" && <><div className="view-intro"><p>Kaydettiğin konuşmalar burada, bu cihazda kalır.</p></div>{displayedPosts.length ? <Feed posts={displayedPosts} actions={actions} onAction={updateAction} onReply={setReplyingTo} onDetail={openDetail} onQuote={quotePost} onShare={sharePost} /> : <EmptyState title="Henüz yer imi yok" copy="İlginç bir yankıyı sonra dönmek için kaydedebilirsin." />}</>}
        {view === "profile" && <Profile following={following} setFollowing={setFollowing} actions={actions} onAction={updateAction} onReply={setReplyingTo} onDetail={openDetail} onQuote={quotePost} onShare={sharePost} posts={posts.filter((post) => post.name === "Sen")} />}
        {view === "settings" && <Settings theme={theme} setTheme={setTheme} />}
      </div>
    </section>
    <aside className="right-rail" aria-label="Gündem ve öneriler"><div className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Yankı ara" placeholder="Yankı ara" value={search} onChange={(event) => { setSearch(event.target.value); setView("explore"); }} /></div><TrendPanel /><WhoToFollow following={following} setFollowing={setFollowing} /><p className="legal">Koşullar · Gizlilik · Çerezler<br />Yankı 2026</p></aside>
    <nav className="bottom-nav" aria-label="Mobil gezinme">{navigation.slice(0, 5).map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => setView(item.id)} aria-label={item.label}><span aria-hidden="true">{item.icon}</span>{item.id === "notifications" && <b />}</button>)}</nav>
    {shareFeedback && <div className="toast" role="status">{shareFeedback}</div>}
  </main>;
}

function Composer({ text, setText, replyingTo, clearReply, onSubmit }: { text: string; setText: (value: string) => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="composer" onSubmit={onSubmit}><Avatar initials="DN" tone="ink" /><div className="composer-body">{replyingTo && <div className="replying">Şuna yanıtlıyorsun: <b>{replyingTo.name}</b><button type="button" onClick={clearReply}>×</button></div>}<label className="sr-only" htmlFor="compose-input">Yeni yankı yaz</label><textarea id="compose-input" value={text} onChange={(event) => setText(event.target.value.slice(0, 280))} placeholder={replyingTo ? "Yanıtını yaz" : "Neler yankılanıyor?"} rows={2} /><div className="compose-footer"><div className="compose-tools" aria-label="Yankı ekleri"><button type="button" aria-label="Görsel ekle">▧</button><button type="button" aria-label="Konum ekle">⌖</button><button type="button" aria-label="Anket ekle">▤</button><button type="button" aria-label="Duygu ekle">☺</button></div><span className={text.length > 250 ? "limit near" : "limit"}>{280 - text.length}</span><button className="primary-button small-button" type="submit">Yankıla</button></div></div></form>;
}

function Feed({ posts, actions, onAction, onReply, onDetail, onQuote, onShare }: { posts: Post[]; actions: Actions; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onDetail: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void }) { return <div className="post-list">{posts.map((post) => <PostCard key={post.id} post={post} actions={actions} onAction={onAction} onReply={onReply} onDetail={onDetail} onQuote={onQuote} onShare={onShare} />)}</div>; }

function PostCard({ post, actions, onAction, onReply, onDetail, onQuote, onShare, compact = false }: { post: Post; actions: Actions; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onDetail: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void; compact?: boolean }) {
  const liked = actions.likes.includes(post.id), reposted = actions.reposts.includes(post.id), saved = actions.bookmarks.includes(post.id);
  return <article className={`post ${compact ? "compact" : ""}`}><button className="avatar-button" onClick={() => undefined} aria-label={`${post.name} profili`}><Avatar initials={post.initials} tone={post.tone} /></button><div className="post-content">{post.replyTo && <p className="reply-context">{post.replyTo} adlı kişiye yanıt olarak</p>}<div className="post-meta"><button className="name" onClick={() => undefined}>{post.name}</button><span>{post.handle}</span><span>·</span><button className="time" onClick={() => onDetail(post)}>{post.time}</button><button className="more" aria-label="Daha fazla seçenek">•••</button></div><button className="post-body" onClick={() => onDetail(post)} aria-label="Yankının ayrıntılarını aç">{post.body}</button>{post.attachment === "signal" && <button className="signal-card" onClick={() => onDetail(post)}><span className="signal-art"><i /><i /><i /></span><span><b>Şehir serinliği notları</b><small>Kamusal alan · devam eden konuşma</small></span><em>↗</em></button>}{post.attachment === "note" && <button className="note-card" onClick={() => onDetail(post)}><span>Okuma notu</span><b>Yerel veriyi ortak bir dilde buluşturmak</b><small>4 dk okuma</small></button>}<div className="post-actions" aria-label="Yankı işlemleri"><ActionButton icon="◌" label="Yanıtla" count={post.replies} onClick={() => onReply(post)} /><ActionButton icon="↻" label="Yeniden yankıla" count={post.reposts + (reposted ? 1 : 0)} active={reposted} onClick={() => onAction("reposts", post.id)} onAux={() => onQuote(post)} /><ActionButton icon="♡" label="Beğen" count={post.likes + (liked ? 1 : 0)} active={liked} kind="like" onClick={() => onAction("likes", post.id)} /><ActionButton icon={saved ? "▰" : "▱"} label={saved ? "Yer iminden kaldır" : "Yer imlerine ekle"} active={saved} onClick={() => onAction("bookmarks", post.id)} /><ActionButton icon="⌑" label="Paylaş" onClick={() => onShare(post)} /></div></div></article>;
}

function ActionButton({ icon, label, count, active, kind, onClick, onAux }: { icon: string; label: string; count?: number; active?: boolean; kind?: "like"; onClick: () => void; onAux?: () => void }) { return <span className={`action-wrap ${active ? "active" : ""} ${kind || ""}`}><button className="action" aria-label={label} onClick={onClick}><i aria-hidden="true">{icon}</i>{typeof count === "number" && <small>{formatNumber(count)}</small>}</button>{onAux && <button className="quote-mini" onClick={onAux} aria-label="Alıntıla">＋</button>}</span>; }

function ThreadDetail({ post, actions, onAction, onReply, onQuote, onShare, contextOpen, setContextOpen, onBack }: { post: Post; actions: Actions; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void; contextOpen: boolean; setContextOpen: (open: boolean) => void; onBack: () => void }) {
  const threadReplies = post.context ? replies : [];
  return <div className="thread-view"><PostCard post={post} actions={actions} onAction={onAction} onReply={onReply} onDetail={() => undefined} onQuote={onQuote} onShare={onShare} />{post.context && <section className="context-summary" aria-label="Bağlam özeti"><button className="context-toggle" onClick={() => setContextOpen(!contextOpen)} aria-expanded={contextOpen}><span><i aria-hidden="true">✦</i><b>Bağlam Özeti</b><small>Bu konuşmada öne çıkanlar</small></span><span aria-hidden="true">{contextOpen ? "⌃" : "⌄"}</span></button>{contextOpen && <div className="summary-content"><ul>{contextBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><p>AI özeti <span>•</span> hata içerebilir</p></div>}</section>}<div className="thread-reply"><Avatar initials="DN" tone="ink" /><button onClick={() => onReply(post)}>Yanıtını yaz</button></div>{threadReplies.length ? <Feed posts={threadReplies} actions={actions} onAction={onAction} onReply={onReply} onDetail={() => undefined} onQuote={onQuote} onShare={onShare} /> : <EmptyState title="Konuşma burada sakin" copy="İlk düşünceni paylaşarak bu yankıyı büyütebilirsin." action="Akışa dön" onAction={onBack} />}</div>;
}

function Explore({ search, setSearch, onOpen }: { search: string; setSearch: (value: string) => void; onOpen: (post: Post) => void }) {
  const visible = seedPosts.filter((post) => `${post.name} ${post.body}`.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")));
  return <div className="explore-view"><div className="explore-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kişi ya da konu ara" aria-label="Kişi ya da konu ara" /></div>{search ? <><h2>Arama sonuçları</h2>{visible.length ? <div className="search-results"><Feed posts={visible} actions={{ likes: [], reposts: [], bookmarks: [] }} onAction={() => undefined} onReply={() => undefined} onDetail={onOpen} onQuote={() => undefined} onShare={() => undefined} /></div> : <EmptyState title="Bir sonuç bulamadık" copy="Başka bir kelimeyle aramayı dene." />}</> : <><h2>Bugün konuşulanlar</h2><TrendPanel full /><section className="editor-pick"><p>Editörün seçimi</p><button onClick={() => onOpen(seedPosts[0])}><span className="editor-ripple"><i /><i /></span><span><b>Şehir nasıl serin kalır?</b><small>İklim ve kamusal alan üzerine açık konuşma</small></span><em>→</em></button></section></>}</div>;
}

function Notifications({ onOpen }: { onOpen: (post: Post) => void }) { return <div className="notifications-view"><div className="notification-tabs"><button className="selected">Tümü</button><button>Bahsedenler</button></div><button className="notification" onClick={() => onOpen(seedPosts[0])}><Avatar initials="SU" tone="teal" /><span><b>Selin Uçak</b> seninle aynı serin rota fikrini konuşuyor.<small>18 dk önce</small></span><em>→</em></button><button className="notification" onClick={() => onOpen(seedPosts[2])}><span className="notification-stack"><Avatar initials="AV" tone="teal" /><Avatar initials="MS" tone="violet" /></span><span><b>Açık Veri Günlüğü</b> ve 12 kişi kaydettiğin notu beğendi.<small>1 sa önce</small></span><em>→</em></button><button className="notification" onClick={() => onOpen(seedPosts[1])}><span className="spark">✦</span><span><b>Yankı seçkisine hoş geldin.</b> Takip ettiğin konulardan daha dengeli bir akış hazırlıyoruz.<small>Dün</small></span><em>→</em></button></div>; }

function Messages() { const [open, setOpen] = useState("Yankı Ekibi"); return <div className="messages-view"><div className="message-list"><button className={open === "Yankı Ekibi" ? "selected" : ""} onClick={() => setOpen("Yankı Ekibi")}><Avatar initials="YE" tone="coral" /><span><b>Yankı Ekibi</b><small>Bağlam özeti hakkında…</small></span></button><button className={open === "Bora Ekin" ? "selected" : ""} onClick={() => setOpen("Bora Ekin")}><Avatar initials="BE" tone="violet" /><span><b>Bora Ekin</b><small>Rota notlarına baktın mı?</small></span></button></div><section className="message-thread"><header><Avatar initials={open === "Yankı Ekibi" ? "YE" : "BE"} tone={open === "Yankı Ekibi" ? "coral" : "violet"} /><span><b>{open}</b><small>@{open === "Yankı Ekibi" ? "yankiekibi" : "boraekin"}</small></span></header><div className="message-bubble">{open === "Yankı Ekibi" ? "Bağlam özeti, konuşmaya yetişmene yardımcı olur. Her zaman kaynaklara göz atmayı unutma." : "Evet, sabah hattını ayrıca işaretledim."}</div><div className="message-compose"><input placeholder="Yeni bir mesaj yaz" aria-label="Yeni bir mesaj yaz" /><button aria-label="Gönder">↑</button></div></section></div>; }

function Profile({ following, setFollowing, actions, onAction, onReply, onDetail, onQuote, onShare, posts }: { following: boolean; setFollowing: (value: boolean) => void; actions: Actions; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onDetail: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void; posts: Post[] }) { return <div className="profile-view"><div className="profile-cover"><span className="cover-ripple"><i /><i /><i /></span></div><div className="profile-head"><Avatar initials="DN" tone="ink" /><button className={following ? "outline-button" : "primary-button"} onClick={() => setFollowing(!following)}>{following ? "Takiptesin" : "Takip et"}</button></div><section className="profile-copy"><h2>Deniz Naz <span>●</span></h2><p>@denizn</p><p className="bio">Şehir, ekran ve insanlar hakkında küçük notlar. Bu prototipteki etkileşimler yalnızca bu cihazda saklanır.</p><div><span>⌖ İstanbul</span><span>◷ Mayıs 2024’te katıldı</span></div><p><b>284</b> Takip edilen <b>1.208</b> Takipçi</p></section><div className="profile-tabs"><button className="selected">Yankılar</button><button>Yanıtlar</button><button>Beğeniler</button></div>{posts.length ? <Feed posts={posts} actions={actions} onAction={onAction} onReply={onReply} onDetail={onDetail} onQuote={onQuote} onShare={onShare} /> : <EmptyState title="Henüz kendi yankın yok" copy="Akıştan yeni bir düşünce başlatabilirsin." />}</div>; }

function Settings({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) { return <div className="settings-view"><section><h2>Görünüm</h2><p>Yankı’nın bu cihazdaki görünümünü seç.</p><div className="theme-options"><button className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-preview light" />Açık</button><button className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-preview dark" />Koyu</button></div></section><section><h2>Yerel demo</h2><p>Yankıların, beğenilerin ve yer imlerin sadece bu tarayıcıda saklanır. Çevrimdışıyken de çalışır.</p></section><section><h2>Bağlam özeti</h2><p>Özetler konuşmaya hızlıca yaklaşmana yardımcı olur; kesin bilgi yerine kaynaklara ve katılımcılara öncelik ver.</p></section></div>; }

function TrendPanel({ full = false }: { full?: boolean }) { const trends = [["Türkiye’de gündem", "#serinrota", "4.282 yankı"], ["Teknoloji · Gündem", "Açık standart", "1.904 yankı"], ["Kültür · Gündem", "Sessiz sinema", "916 yankı"], ["İstanbul’da gündem", "Gece kütüphanesi", "683 yankı"]]; return <section className={`trend-panel ${full ? "full" : ""}`}><h2>{full ? "Gündem" : "Şu an konuşulanlar"}</h2>{trends.map(([meta, topic, count]) => <button key={topic}><span><small>{meta}</small><b>{topic}</b><small>{count}</small></span><em aria-hidden="true">•••</em></button>)}<button className="show-more">Daha fazlasını göster</button></section>; }

function WhoToFollow({ following, setFollowing }: { following: boolean; setFollowing: (value: boolean) => void }) { return <section className="who-panel"><h2>Tanıyor olabileceğin kişiler</h2><div><Avatar initials="SE" tone="gold" /><span><b>Sena Ertem</b><small>@senaertem</small></span><button className="dark-button">Takip et</button></div><div><Avatar initials="BK" tone="violet" /><span><b>Barış Koral</b><small>@bariskoral</small></span><button className={following ? "outline-button" : "dark-button"} onClick={() => setFollowing(!following)}>{following ? "Takiptesin" : "Takip et"}</button></div><button className="show-more">Daha fazlasını göster</button></section>; }

function EmptyState({ title, copy, action, onAction }: { title: string; copy: string; action?: string; onAction?: () => void }) { return <section className="empty-state"><span aria-hidden="true">◌</span><h2>{title}</h2><p>{copy}</p>{action && <button className="outline-button" onClick={onAction}>{action}</button>}</section>; }
function Avatar({ initials, tone }: { initials: string; tone: string }) { return <span className={`avatar ${tone}`}>{initials}</span>; }
