"use client";

/* eslint-disable @next/next/no-img-element -- Official SVG assets must be rendered byte-for-byte. */
import { FormEvent, RefObject, useEffect, useMemo, useRef, useState } from "react";
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
  replyTo?: string; replyToId?: string; context?: boolean; attachment?: Attachment; own?: boolean; repostedByMe?: boolean;
};
type Actions = { likes: string[]; reposts: string[]; bookmarks: string[] };
type Mods = { deleted: string[]; pinned: string | null };
type Profile = { name: string; handle: string; initials: string; bio: string; location: string };
type Message = { id: string; conversationId: string; from: "me" | "them"; body: string };
type Gamification = { points: number; completedTasks: string[]; taskDate: string };
type PointsBadge = { label: string; mark: string; tone: "starter" | "active" | "trusted" | "expert" };
type ActionIconName = "reply" | "repost" | "like" | "bookmark" | "share";
type UiIconName = "home" | "search" | "menu" | "plus" | "check" | "notifications" | "messages" | "bookmark" | "profile" | "settings" | "sun" | "moon" | "arrow-left" | "arrow-right" | "close" | "more" | "media" | "location" | "poll" | "mood" | "send" | "pin" | "quote" | "spark";

const demoProfile: Profile = { name: "Deniz Naz", handle: "@denizn", initials: "DN", bio: "Şehir, ekran ve insanlar hakkında küçük notlar.", location: "İstanbul" };
const defaultGamification: Gamification = { points: 0, completedTasks: [], taskDate: "" };
const dailyTasks = [
  { id: "check-in", label: "Bugün NSosyal’a uğra", points: 5 },
  { id: "like", label: "Bir gönderiyi beğen", points: 5 },
  { id: "repost", label: "Bir gönderiyi yeniden paylaş", points: 10 },
  { id: "reply", label: "Bir konuşmaya katkı yap", points: 15 },
  { id: "post", label: "Kendi düşünceni paylaş", points: 25 },
  { id: "deep-contribution", label: "Bir tartışmayı derinleştir", points: 20 },
];
const badgeMilestones: Array<PointsBadge & { points: number; copy: string }> = [
  { points: 0, label: "Yeni üye", mark: "·", tone: "starter", copy: "İlk adımını attın." },
  { points: 40, label: "Katılımcı", mark: "●", tone: "active", copy: "Düzenli katkıyla açılır." },
  { points: 100, label: "Güvenilir", mark: "◆", tone: "trusted", copy: "Konuşmaya devamlı katılımın göstergesi." },
  { points: 250, label: "Öncü", mark: "✦", tone: "expert", copy: "Topluluğa yön veren katkılar için." },
];
const authorPointsByHandle: Record<string, number> = {
  "@idilaras": 268,
  "@edizyilmaz": 134,
  "@acikverigunlugu": 66,
  "@adnankantar": 22,
  "@selinucak": 116,
  "@boraekin": 48,
};
const seedPosts: Post[] = [
  { id: "iklim-kent", name: "İdil Aras", handle: "@idilaras", time: "18 dk", body: "Kentte serinlemek bir lüks değil, altyapı meselesi. Gölgeli duraklar, açık su noktaları ve gece geç saatlere kadar açık kütüphaneler hakkında konuşalım.", initials: "İA", tone: "coral", replies: 86, reposts: 142, likes: 982, audience: "all", context: true, attachment: "signal" },
  { id: "film-kulubu", name: "Ediz Yılmaz", handle: "@edizyilmaz", time: "31 dk", body: "Bu akşam filmlerden sonra 10 dakika sessizlik kuralı koyabilir miyiz? Her şey biter bitmez yorum yapmak zorunda değiliz.", initials: "EY", tone: "violet", replies: 24, reposts: 18, likes: 311, audience: "following" },
  { id: "acik-veri", name: "Açık Veri Günlüğü", handle: "@acikverigunlugu", time: "1 sa", body: "Yeni açık veri notumuz yayında: Belediyelerin erişilebilirlik haritaları tek bir standartta nasıl buluşabilir? Kısa bir okuma listesi bıraktık.", initials: "AV", tone: "teal", replies: 39, reposts: 204, likes: 746, audience: "all", attachment: "note" },
  { id: "sabah-kosu", name: "Adnan Kantar", handle: "@adnankantar", time: "2 sa", body: "Sabah yürüyüşünde duyduğum tek motor sesi vapurdu. Şehrin bazen kendine bıraktığı o dar aralık çok iyi geliyor.", initials: "AK", tone: "gold", replies: 11, reposts: 7, likes: 198, audience: "following" },
];
const seedReplies: Post[] = [
  { id: "yanit-1", name: "Selin Uçak", handle: "@selinucak", time: "12 dk", body: "Buna okul çıkış saatlerinde çalışan serin rota bilgisini de eklemek gerekir. İklim haritaları günlük kararları etkiliyor.", initials: "SU", tone: "teal", replies: 3, reposts: 4, likes: 76, audience: "all", replyTo: "İdil Aras", replyToId: "iklim-kent" },
  { id: "yanit-2", name: "Bora Ekin", handle: "@boraekin", time: "7 dk", body: "Gece açık kamusal alan fikri önemli. Serinlik, güvenlik ve ulaşım birlikte düşünülünce gerçekten işe yarıyor.", initials: "BE", tone: "violet", replies: 1, reposts: 2, likes: 41, audience: "all", replyTo: "İdil Aras", replyToId: "iklim-kent" },
];
const seedMessages: Message[] = [{ id: "welcome", conversationId: "team", from: "them", body: "Bağlam özeti, konuşmaya yetişmene yardımcı olur. Her zaman kaynaklara göz atmayı unutma." }];
const contextBullets = [
  "Konu, sıcak dalgalarında kamusal alanların erişilebilir kalması etrafında şekilleniyor.",
  "Konuşmada durak gölgesi, içme suyu ve gece açık güvenli alanlar öne çıkıyor.",
  "Yerel uygulama örnekleri isteniyor; öneriler henüz doğrulanmış bir plan değil.",
];
const navigation: { id: View; label: string; icon: UiIconName }[] = [
  { id: "feed", label: "Ana Sayfa", icon: "home" }, { id: "explore", label: "Keşfet", icon: "search" },
  { id: "notifications", label: "Bildirimler", icon: "notifications" }, { id: "messages", label: "Mesajlar", icon: "messages" },
  { id: "bookmarks", label: "Yer İmleri", icon: "bookmark" }, { id: "profile", label: "Profil", icon: "profile" },
];

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    if (!isValidStored(key, value)) return fallback;
    return value as T;
  } catch { return fallback; }
}
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === "string"); }
function isPost(value: unknown): value is Post {
  if (!value || typeof value !== "object") return false;
  const post = value as Record<string, unknown>;
  return typeof post.id === "string" && typeof post.name === "string" && typeof post.handle === "string" && typeof post.time === "string" && typeof post.body === "string" && typeof post.initials === "string" && typeof post.tone === "string" && typeof post.replies === "number" && typeof post.reposts === "number" && typeof post.likes === "number" && (post.audience === "all" || post.audience === "following") && (post.replyTo === undefined || typeof post.replyTo === "string") && (post.replyToId === undefined || typeof post.replyToId === "string") && (post.attachment === undefined || post.attachment === "signal" || post.attachment === "note") && (post.own === undefined || typeof post.own === "boolean") && (post.repostedByMe === undefined || typeof post.repostedByMe === "boolean");
}
function isValidStored(key: string, value: unknown): boolean {
  if (key === "nsosyal-theme") return value === "light" || value === "dark";
  if (key === "nsosyal-actions") return !!value && typeof value === "object" && isStringArray((value as Actions).likes) && isStringArray((value as Actions).reposts) && isStringArray((value as Actions).bookmarks);
  if (key === "nsosyal-mods") return !!value && typeof value === "object" && isStringArray((value as Mods).deleted) && ((value as Mods).pinned === null || typeof (value as Mods).pinned === "string");
  if (key === "nsosyal-drafts") return Array.isArray(value) && value.every(isPost);
  if (key === "nsosyal-profile") return !!value && typeof value === "object" && ["name", "handle", "initials", "bio", "location"].every((field) => typeof (value as Record<string, unknown>)[field] === "string");
  if (key === "nsosyal-following" || key === "nsosyal-read-notifications") return isStringArray(value);
  if (key === "nsosyal-gamification") return !!value && typeof value === "object" && typeof (value as Gamification).points === "number" && isStringArray((value as Gamification).completedTasks) && typeof (value as Gamification).taskDate === "string";
  if (key === "nsosyal-messages") return Array.isArray(value) && value.every((item) => !!item && typeof item === "object" && typeof (item as Message).id === "string" && typeof (item as Message).conversationId === "string" && ((item as Message).from === "me" || (item as Message).from === "them") && typeof (item as Message).body === "string");
  return true;
}
function formatNumber(value: number) { return new Intl.NumberFormat("tr-TR", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
function getPointsBadge(points: number): PointsBadge {
  return [...badgeMilestones].reverse().find((badge) => points >= badge.points) ?? badgeMilestones[0];
}
function UiIcon({ name }: { name: UiIconName }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {name === "home" && <><path {...shared} d="m3.5 10.7 8.5-7 8.5 7v8.4a1.4 1.4 0 0 1-1.4 1.4H5a1.4 1.4 0 0 1-1.4-1.4v-8.4Z" /><path {...shared} d="M9.4 20.5v-5.4h5.2v5.4" /></>}
    {name === "search" && <><circle {...shared} cx="10.8" cy="10.8" r="6.4" /><path {...shared} d="m16 16 4.6 4.6" /></>}
    {name === "menu" && <path {...shared} d="M4 7h16M4 12h16M4 17h16" />}
    {name === "plus" && <path {...shared} d="M12 5v14M5 12h14" />}
    {name === "check" && <path {...shared} d="m5 12.5 4.2 4.2L19.5 6.5" />}
    {name === "notifications" && <><path {...shared} d="M5.2 17.5h13.6l-1.5-2.2V10a5.3 5.3 0 0 0-10.6 0v5.3l-1.5 2.2Z" /><path {...shared} d="M9.5 20.1h5" /></>}
    {name === "messages" && <><rect {...shared} x="3.5" y="5" width="17" height="13.5" rx="2.2" /><path {...shared} d="m4.5 6.5 7.5 6 7.5-6" /></>}
    {name === "bookmark" && <path {...shared} d="M6.5 4.5h11v15l-5.5-3.2-5.5 3.2v-15Z" />}
    {name === "profile" && <><circle {...shared} cx="12" cy="8" r="3.4" /><path {...shared} d="M5.2 20a6.8 6.8 0 0 1 13.6 0" /></>}
    {name === "settings" && <><circle {...shared} cx="12" cy="12" r="3" /><path {...shared} d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.9-1.1L14.4 3h-4.8l-.3 2.9a7 7 0 0 0-1.9 1.1l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.9 1.1l.3 2.9h4.8l.3-2.9a7 7 0 0 0 1.9-1.1l2.3 1 2-3.4-2-1.5c.1-.4.1-.7.1-1.1Z" /></>}
    {name === "sun" && <><circle {...shared} cx="12" cy="12" r="3.6" /><path {...shared} d="M12 2.5v2M12 19.5v2M4.1 4.1l1.4 1.4M18.5 18.5l1.4 1.4M2.5 12h2M19.5 12h2M4.1 19.9l1.4-1.4M18.5 5.5l1.4-1.4" /></>}
    {name === "moon" && <path {...shared} d="M19.4 15.8A7.7 7.7 0 0 1 8.2 4.6 8 8 0 1 0 19.4 15.8Z" />}
    {name === "arrow-left" && <><path {...shared} d="m14.5 5-7 7 7 7" /><path {...shared} d="M7.8 12h12" /></>}
    {name === "arrow-right" && <><path {...shared} d="m9.5 5 7 7-7 7" /><path {...shared} d="M16.2 12h-12" /></>}
    {name === "close" && <><path {...shared} d="m6 6 12 12M18 6 6 18" /></>}
    {name === "more" && <><circle cx="5" cy="12" r="1.25" fill="currentColor" /><circle cx="12" cy="12" r="1.25" fill="currentColor" /><circle cx="19" cy="12" r="1.25" fill="currentColor" /></>}
    {name === "media" && <><rect {...shared} x="3.5" y="4.5" width="17" height="15" rx="2" /><circle {...shared} cx="8.5" cy="9" r="1.3" /><path {...shared} d="m5.5 17 4.2-4.2 2.8 2.8 2.2-2.2 4.3 3.6" /></>}
    {name === "location" && <><path {...shared} d="M19 10.2c0 4.3-7 10.3-7 10.3s-7-6-7-10.3a7 7 0 1 1 14 0Z" /><circle {...shared} cx="12" cy="10" r="2.2" /></>}
    {name === "poll" && <><path {...shared} d="M5 19V10M12 19V5M19 19v-7" /><path {...shared} d="M3.5 19.5h17" /></>}
    {name === "mood" && <><circle {...shared} cx="12" cy="12" r="8.5" /><path {...shared} d="M8.5 14.5a4.4 4.4 0 0 0 7 0M8.8 9.5h.1M15.1 9.5h.1" /></>}
    {name === "send" && <path {...shared} d="m3.8 4.5 16.4 7.5-16.4 7.5 2.4-6.2 7.2-1.3-7.2-1.3-2.4-6.2Z" />}
    {name === "pin" && <path {...shared} d="m14.5 4.2 5.3 5.3-2.2 1.4-.5 4.3-2.4 2.4-3.2-3.2-4.7 4.7-.9-.9 4.7-4.7-3.2-3.2 2.4-2.4 4.3-.5 1.4-2.2Z" />}
    {name === "quote" && <><path {...shared} d="M6.4 17.3H4.8a2 2 0 0 1-2-2v-2.5a2 2 0 0 1 2-2h3.4v4.1a2.4 2.4 0 0 1-1.8 2.4ZM17.6 17.3H16a2 2 0 0 1-2-2v-2.5a2 2 0 0 1 2-2h3.4v4.1a2.4 2.4 0 0 1-1.8 2.4Z" /></>}
    {name === "spark" && <path {...shared} d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />}
  </svg>;
}
function useDialogFocus<T extends HTMLElement = HTMLElement>(onClose: () => void): RefObject<T | null> {
  const dialogRef = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusables = "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex=\"-1\"])";
    const focusFirst = () => {
      const first = dialogRef.current?.querySelector<HTMLElement>(focusables);
      (first || dialogRef.current)?.focus();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusables));
      if (!items.length) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.setTimeout(focusFirst, 0);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); window.setTimeout(() => previous?.focus(), 0); };
  }, []);
  return dialogRef;
}

export default function Home() {
  const [view, setView] = useState<View>("feed");
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [theme, setTheme] = useState<Theme>("dark");
  const [actions, setActions] = useState<Actions>({ likes: [], reposts: [], bookmarks: [] });
  const [mods, setMods] = useState<Mods>({ deleted: [], pinned: null });
  const [draftPosts, setDraftPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [gamification, setGamification] = useState<Gamification>(defaultGamification);
  const [following, setFollowing] = useState<string[]>(["@bariskoral"]);
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [composerText, setComposerText] = useState("");
  const [composerMedia, setComposerMedia] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Post | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [profilePost, setProfilePost] = useState<Post | null>(null);
  const [messageTarget, setMessageTarget] = useState<Profile | null>(null);
  const [morePost, setMorePost] = useState<Post | null>(null);
  const [mediaPost, setMediaPost] = useState<Post | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);
  const [shareFeedback, setShareFeedback] = useState("");
  // Action feedback stays silent in the feed; the state change itself is the
  // confirmation and no banner should push content below the sticky top bar.
  const setNotice: (message: string) => void = () => undefined;
  const [search, setSearch] = useState("");
  const [headerCompact, setHeaderCompact] = useState(false);
  const [composeHidden, setComposeHidden] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [compactMenuOpen, setCompactMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const restoredLocalState = useRef(false);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      setTheme(readStored("nsosyal-theme", "dark"));
      setActions(readStored("nsosyal-actions", { likes: [], reposts: [], bookmarks: [] }));
      setMods(readStored("nsosyal-mods", { deleted: [], pinned: null }));
      setDraftPosts(readStored("nsosyal-drafts", []));
      setProfile(readStored("nsosyal-profile", demoProfile));
      const savedGamification = readStored("nsosyal-gamification", defaultGamification);
      const today = new Date().toISOString().slice(0, 10);
      setGamification(savedGamification.taskDate === today ? savedGamification : { points: savedGamification.points + 5, completedTasks: ["check-in"], taskDate: today });
      setFollowing(readStored("nsosyal-following", ["@bariskoral"]));
      setMessages(readStored("nsosyal-messages", seedMessages));
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
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-gamification", JSON.stringify(gamification)); }, [gamification]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-following", JSON.stringify(following)); }, [following]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-messages", JSON.stringify(messages)); }, [messages]);
  useEffect(() => { if (restoredLocalState.current) window.localStorage.setItem("nsosyal-read-notifications", JSON.stringify(readNotifications)); }, [readNotifications]);
  useEffect(() => {
    let lastScrollY = Math.max(0, window.scrollY);
    let compact = false;
    let lastDirection = 0;
    let directionTravel = 0;
    let frame = 0;
    const syncHeader = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const currentScrollY = Math.max(0, window.scrollY);
        const delta = currentScrollY - lastScrollY;
        const direction = delta === 0 ? lastDirection : delta > 0 ? 1 : -1;
        if (direction !== lastDirection) directionTravel = 0;
        directionTravel += Math.abs(delta);
        lastDirection = direction;
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const atTop = currentScrollY <= 2;
        const atBottom = maxScrollY > 0 && currentScrollY >= maxScrollY - 2;
        let nextCompact = compact;
        if (atTop) { nextCompact = false; directionTravel = 0; }
        else if (direction === 1 && directionTravel >= 18) { nextCompact = !atBottom && currentScrollY > 32; directionTravel = 0; }
        else if (direction === -1 && directionTravel >= 18) { nextCompact = false; directionTravel = 0; }
        if (nextCompact !== compact) { compact = nextCompact; setHeaderCompact(nextCompact); setComposeHidden(nextCompact); }
        lastScrollY = currentScrollY;
      });
    };
    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    return () => { window.removeEventListener("scroll", syncHeader); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  const posts = useMemo(() => [...draftPosts, ...seedPosts].filter((post) => !mods.deleted.includes(post.id)).sort((a, b) => Number(b.id === mods.pinned) - Number(a.id === mods.pinned)), [draftPosts, mods]);
  const bookmarkPosts = posts.filter((post) => actions.bookmarks.includes(post.id));
  const rootPosts = useMemo(() => posts.filter((post) => !post.replyToId), [posts]);
  const displayedPosts = useMemo(() => view === "bookmarks" ? bookmarkPosts : feedMode === "following" ? rootPosts.filter((post) => post.own || following.includes(post.handle)) : rootPosts, [bookmarkPosts, feedMode, following, rootPosts, view]);
  const startReply = (post: Post) => { setSelectedPost(post); setReplyingTo(post); setContextOpen(true); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); window.setTimeout(() => document.getElementById("thread-reply-input")?.focus(), 120); };
  const openDetail = (post: Post) => { setSelectedPost(post); setContextOpen(true); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openProfile = (post: Post) => { setProfilePost(post); setView("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openOwnProfile = () => { setProfilePost(null); setMessageTarget(null); setMobileMoreOpen(false); setView("profile"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openMessages = (target?: Profile) => { setMessageTarget(target ?? null); setView("messages"); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const openSearch = () => { setSearch(""); setView("explore"); window.scrollTo({ top: 0, behavior: "smooth" }); window.setTimeout(() => document.querySelector<HTMLInputElement>(".explore-search input")?.focus(), 80); };
  const openComposer = () => { setCompactMenuOpen(false); setMobileMoreOpen(false); setView("feed"); setComposerOpen(true); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 120); };
  const updateAction = (kind: keyof Actions, id: string) => {
    const active = actions[kind].includes(id);
    setActions((current) => ({ ...current, [kind]: toggleItem(current[kind], id) }));
    if (!active && kind === "likes") awardTask("like", 5);
    if (!active && kind === "reposts") awardTask("repost", 10);
    const messages: Record<keyof Actions, [string, string]> = {
      likes: ["Gönderi beğenildi.", "Beğeni kaldırıldı."],
      reposts: ["Gönderi yeniden paylaşıldı.", "Yeniden paylaşım kaldırıldı."],
      bookmarks: ["Gönderi yer imlerine eklendi.", "Gönderi yer imlerinden kaldırıldı."],
    };
    setNotice(messages[kind][Number(active)]);
  };
  function awardTask(taskId: string, points: number) {
    setGamification((current) => {
      const today = new Date().toISOString().slice(0, 10);
      const completed = current.taskDate === today ? current.completedTasks : [];
      if (completed.includes(taskId)) return { ...current, taskDate: today, completedTasks: completed };
      return { points: current.points + points, completedTasks: [...completed, taskId], taskDate: today };
    });
  }
  const toggleFollow = (handle: string) => setFollowing((current) => toggleItem(current, handle));
  const quotePost = (post: Post) => { setReplyingTo(null); setComposerText("“" + post.body.slice(0, 92) + (post.body.length > 92 ? "…" : "") + "” için düşüncem: "); setView("feed"); setComposerOpen(true); setNotice("Alıntı için metin alanı hazır."); window.setTimeout(() => document.getElementById("compose-input")?.focus(), 120); };
  async function sharePost(post: Post) {
    try { await navigator.clipboard.writeText(post.name + ": " + post.body); setShareFeedback("Gönderi metni panoya kopyalandı."); } catch { setShareFeedback("Paylaşmaya hazır: metni seçip kopyalayabilirsin."); }
    window.setTimeout(() => setShareFeedback(""), 2600);
  }
  function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const body = composerText.trim();
    if (!body) { setNotice("Önce aklından geçenleri yaz."); return; }
    const replyTarget = replyingTo;
    const post: Post = { id: "yerel-" + Date.now(), name: profile.name, handle: profile.handle, time: "şimdi", body: replyTarget ? replyTarget.handle + " " + body : body, initials: profile.initials, tone: "ink", replies: 0, reposts: 0, likes: 0, audience: "following", replyTo: replyTarget?.name, replyToId: replyTarget?.id, attachment: composerMedia ? "signal" : undefined, own: true };
    setDraftPosts((current) => [post, ...current]); setComposerText(""); setComposerMedia(false); setReplyingTo(null); setComposerOpen(false);
    if (replyTarget) { awardTask("reply", 15); setNotice("Yanıtın konuşmaya eklendi."); setView("detail"); }
    else { awardTask("post", 25); setNotice("Gönderi Ana Sayfa'ya eklendi."); setView("feed"); }
  }
  function publishGuidedContribution(body: string) {
    const contribution = body.trim();
    if (!contribution) { setNotice("Katkını paylaşmadan önce kısa bir düşünce ekle."); return; }
    const post: Post = { id: "derinlik-" + Date.now(), name: profile.name, handle: profile.handle, time: "şimdi", body: contribution, initials: profile.initials, tone: "ink", replies: 0, reposts: 0, likes: 0, audience: "following", own: true, attachment: "note" };
    setDraftPosts((current) => [post, ...current]); awardTask("deep-contribution", 20); setNotice("Katkın konuşmaya eklendi; +20 NSosyal puanı kazandın."); setView("feed");
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
    ["nsosyal-actions", "nsosyal-mods", "nsosyal-drafts", "nsosyal-profile", "nsosyal-following", "nsosyal-messages", "nsosyal-read-notifications", "nsosyal-gamification"].forEach((key) => window.localStorage.removeItem(key));
    setActions({ likes: [], reposts: [], bookmarks: [] }); setMods({ deleted: [], pinned: null }); setDraftPosts([]); setProfile(demoProfile); setGamification(defaultGamification); setFollowing(["@bariskoral"]); setMessages(seedMessages); setReadNotifications([]); setTheme("dark"); setNotice("Demo başlangıç durumuna döndü."); setView("feed");
  }
  const title = view === "bookmarks" ? "Yer İmleri" : view === "explore" ? "Keşfet" : view === "notifications" ? "Bildirimler" : view === "messages" ? "Mesajlar" : view === "profile" ? "Profil" : "Ana Sayfa";
  const feedProps: Omit<FeedProps, "posts" | "morePost"> = { actions, pinned: mods.pinned, following, points: gamification.points, onAction: updateAction, onReply: startReply, onDetail: openDetail, onProfile: openProfile, onQuote: quotePost, onShare: sharePost, onMore: setMorePost, onMedia: setMediaPost, onDelete: deleteOwnPost, onPin: togglePin, onFollow: toggleFollow };
  const isOwnProfile = !profilePost || profilePost.own;
  const visibleProfile: Profile = profilePost && !profilePost.own ? { name: profilePost.name, handle: profilePost.handle, initials: profilePost.initials, bio: "NSosyal’daki açık konuşmalara katılıyor. Bu profil, çevrimdışı demo verisiyle gösteriliyor.", location: "Türkiye" } : profile;
  const profilePosts = useMemo(() => profilePost && !profilePost.own ? posts.filter((post) => post.handle === profilePost.handle) : posts, [profilePost, posts]);

  return <main className="app-shell">
    <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
<Sidebar view={view} setView={setView} profile={profile} unread={3 - readNotifications.length} onOwnProfile={openOwnProfile} onCompose={openComposer} onSearch={openSearch} />
    <section className="timeline" aria-label={title}>
       <header className={"topbar " + (headerCompact ? "is-compact " : "") + (view === "detail" ? "is-detail" : "")}><button className="top-menu" onClick={() => setCompactMenuOpen(true)} aria-label="Yan menüyü aç"><UiIcon name="menu" /></button>{view === "detail" ? <button className="back-button" onClick={() => { setReplyingTo(null); setView("feed"); }} aria-label="Ana Sayfaya dön"><UiIcon name="arrow-left" /></button> : <button className="mobile-profile-button" onClick={openOwnProfile} aria-label={profile.initials + ", profilini aç"}><Avatar initials={profile.initials} tone="ink" /></button>}<span className="mobile-brand"><BrandMark small /><span className="sr-only">NSosyal</span></span><span className="topbar-center-brand"><BrandMark /><span className="sr-only">NSosyal ana sayfa</span></span><div className="topbar-heading"><span className="topbar-context">NSosyal</span><h1>{view === "detail" ? "Gönderi" : title}</h1></div><button className="top-action top-action-theme" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label="Temayı değiştir"><UiIcon name={theme === "light" ? "moon" : "sun"} /></button><button className="top-action top-action-search" onClick={openSearch} aria-label="Aramayı aç"><UiIcon name="search" /></button></header>
       <div id="main-content" className="content-area">
         {view === "detail" && selectedPost && <div className="detail-backbar"><button className="back-button" onClick={() => { setReplyingTo(null); setView("feed"); }} aria-label="Ana Sayfaya dön"><UiIcon name="arrow-left" /></button><strong>Gönderi</strong></div>}
        {view === "feed" && <><div className="feed-tabs" role="tablist" aria-label="Ana Sayfa seçimi"><button role="tab" aria-selected={feedMode === "for-you"} className={feedMode === "for-you" ? "selected" : ""} onClick={() => setFeedMode("for-you")}>Sana Özel</button><button role="tab" aria-selected={feedMode === "following"} className={feedMode === "following" ? "selected" : ""} onClick={() => setFeedMode("following")}>Takip Ettiklerin</button></div><Feed {...feedProps} posts={displayedPosts} morePost={morePost} /></>}
        {view === "detail" && selectedPost && <ThreadDetail {...feedProps} post={selectedPost} morePost={morePost} allPosts={posts} contextOpen={contextOpen} setContextOpen={setContextOpen} composerText={composerText} setComposerText={setComposerText} composerMedia={composerMedia} onTool={useComposerTool} replyingTo={replyingTo} clearReply={() => setReplyingTo(null)} onSubmit={createPost} />}
        {view === "explore" && <Explore {...feedProps} posts={posts} search={search} setSearch={setSearch} />}
        {view === "notifications" && <Notifications read={readNotifications} setRead={setReadNotifications} onOpen={openDetail} />}
        {view === "messages" && <Messages messages={messages} setMessages={setMessages} profile={profile} target={messageTarget} />}
        {view === "bookmarks" && <><div className="view-intro"><p>Kaydettiğin konuşmalar burada, bu cihazda kalır.</p></div>{displayedPosts.length ? <Feed {...feedProps} posts={displayedPosts} morePost={morePost} /> : <EmptyState title="Henüz yer imi yok" copy="İlginç bir gönderiyi sonra dönmek için kaydedebilirsin." />}</>}
        {view === "profile" && <Profile {...feedProps} profile={visibleProfile} isOwn={isOwnProfile} posts={profilePosts} morePost={morePost} points={gamification.points} gamification={gamification} onEdit={() => setEditingProfile(true)} onSettings={() => setView("settings")} onMessage={openMessages} onPoints={() => setMilestonesOpen(true)} />}
        {view === "settings" && <Settings theme={theme} setTheme={setTheme} onReset={resetDemo} />}
      </div>
    </section>
    <aside className="right-rail" aria-label="Gündem ve öneriler"><div className="search-field"><span aria-hidden="true"><UiIcon name="search" /></span><input aria-label="NSosyal ara" placeholder="NSosyal ara" value={search} onChange={(event) => { setSearch(event.target.value); setView("explore"); }} /></div><TrendPanel onSelect={(topic) => { setSearch(topic); setView("explore"); }} /><WhoToFollow following={following} onFollow={toggleFollow} /><p className="legal">Koşullar · Gizlilik · Çerezler<br />NSosyal 2026</p></aside>
    <ParticipationJourney onPublish={publishGuidedContribution} />
<MobileNav view={view} setView={setView} unread={3 - readNotifications.length} onCompose={openComposer} composeHidden={composeHidden} onSearch={openSearch} />
    <button className={"desktop-compose-fab " + (composeHidden ? "is-hidden" : "")} onClick={openComposer} aria-label="Yeni gönderi paylaş" tabIndex={composeHidden ? -1 : 0}><UiIcon name="plus" /></button>
    {shareFeedback && <div className="toast" role="status">{shareFeedback}</div>}
    {composerOpen && <ComposeModal text={composerText} setText={setComposerText} media={composerMedia} onTool={useComposerTool} replyingTo={replyingTo} clearReply={() => setReplyingTo(null)} onSubmit={createPost} onClose={() => setComposerOpen(false)} />}
    {compactMenuOpen && <CompactDesktopMenu view={view} setView={setView} theme={theme} setTheme={setTheme} profile={profile} onClose={() => setCompactMenuOpen(false)} onOwnProfile={openOwnProfile} onCompose={openComposer} onSearch={openSearch} />}
    {morePost && <MoreMenu post={morePost} isPinned={mods.pinned === morePost.id} followed={following.includes(morePost.handle)} onClose={() => setMorePost(null)} onDelete={deleteOwnPost} onPin={togglePin} onFollow={toggleFollow} onShare={sharePost} onQuote={quotePost} />}
    {mobileMoreOpen && <MobileMoreMenu onClose={() => setMobileMoreOpen(false)} onProfile={openOwnProfile} onBookmarks={() => { setMobileMoreOpen(false); setView("bookmarks"); }} onSettings={() => { setMobileMoreOpen(false); setView("settings"); }} />}
    {mediaPost && <MediaPreview post={mediaPost} onClose={() => setMediaPost(null)} />}
    {editingProfile && <ProfileEditor profile={profile} onClose={() => setEditingProfile(false)} onSave={(next) => { setProfile(next); setEditingProfile(false); setNotice("Profilin güncellendi."); }} />}
    {milestonesOpen && <MilestoneSheet points={gamification.points} onClose={() => setMilestonesOpen(false)} />}
  </main>;
}

function BrandMark({ small = false }: { small?: boolean }) { return <span className={"brand-mark " + (small ? "small" : "")} aria-hidden="true">{small ? <img src="/brand/nsosyal-favicon.svg" alt="" /> : <><img className="logo-for-dark" src="/brand/nsosyal-source-era-logo-dark.svg" alt="" /><img className="logo-for-light" src="/brand/nsosyal-source-era-logo-light.svg" alt="" /></>}</span>; }
function Avatar({ initials, tone }: { initials: string; tone: string }) { return <span className={"avatar " + tone}>{initials}</span>; }

type ContributionIntent = { id: string; label: string; helper: string; prompt: string };
const contributionIntents: ContributionIntent[] = [
  { id: "ask", label: "Soru sor", helper: "Eksik bir noktayı netleştir", prompt: "Şunu daha iyi anlamak istiyorum: " },
  { id: "agree", label: "Katılıyorum", helper: "Görüşü kendi gerekçenle güçlendir", prompt: "Bu görüşe katılıyorum; çünkü " },
  { id: "counter", label: "Karşı görüş", helper: "Saygılı bir alternatif öner", prompt: "Farklı bir açıdan bakınca " },
  { id: "source", label: "Kaynak ekle", helper: "Konuşmayı doğrulanabilir bilgiyle besle", prompt: "Bu noktayı destekleyen kaynak: " },
  { id: "summarize", label: "Özetle", helper: "Dalı herkes için anlaşılır kıl", prompt: "Bu daldaki ortak nokta şu: " },
];

function ParticipationJourney({ onPublish }: { onPublish: (body: string) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"mission" | "map" | "studio" | "complete">("mission");
  const [expanded, setExpanded] = useState(false);
  const [selectedNode, setSelectedNode] = useState("n2");
  const [intent, setIntent] = useState<ContributionIntent>(contributionIntents[0]);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("Mikro görev hazır.");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const openJourney = () => { setOpen(true); setStep("mission"); setMessage("Bugünkü mikro görev açıldı."); };
  const selectIntent = (next: ContributionIntent) => { setDraft((current) => !current.trim() || current === intent.prompt ? next.prompt : current); setIntent(next); setMessage(next.label + " niyeti seçildi."); };
  const publish = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!draft.trim()) { setMessage("Paylaşmadan önce kısa bir düşünce ekle."); return; } onPublish(draft); setStep("complete"); setMessage("Katkın yayınlandı. +20 puan eklendi."); };
  const close = () => { setOpen(false); setStep("mission"); };

  return <>
    <button className="participation-trigger" type="button" onClick={openJourney} aria-haspopup="dialog" aria-label="Katkını derinleştir görevini aç">
      <span className="participation-trigger-mark" aria-hidden="true">✦</span><span><b>Katkını derinleştir</b><small>Bugünün mikro görevi</small></span>
    </button>
    {open && <div className="participation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="participation-sheet" role="dialog" aria-modal="true" aria-labelledby="participation-title" aria-describedby="participation-copy">
        <header className="participation-header"><div><span className="eyebrow">NSosyal Katılım Döngüsü</span><h2 id="participation-title">{step === "complete" ? "Katkın konuşmaya eklendi" : "Katkını derinleştir"}</h2></div><button type="button" className="participation-close" onClick={close} aria-label="Katılım stüdyosunu kapat">×</button></header>
        {step !== "complete" && <ol className="journey-progress" aria-label="Katılım akışı"><li className={step === "mission" ? "is-current" : "is-complete"}><span>1</span><b>Hedef</b></li><li className={step === "map" ? "is-current" : step === "studio" ? "is-complete" : ""}><span>2</span><b>Bağlam</b></li><li className={step === "studio" ? "is-current" : ""}><span>3</span><b>Katkı</b></li></ol>}
        <p id="participation-copy" className="participation-copy">{step === "mission" ? "Kısa bir görevle, yoğun bir tartışmanın açıkta kalan dalına anlamlı bir katkı ver." : step === "map" ? "Harita önce üç düzeyi gösterir. Bağlamı kaybetmeden konuşmanın uygun noktasını seç." : step === "studio" ? "Boş bir ekrana değil, seçtiğin niyete ve bağlama göre üret." : "Geri bildirim döngüsü tamamlandı. İstersen yeni bir dal keşfedebilirsin."}</p>
        {step === "mission" && <div className="mission-card"><div className="mission-icon" aria-hidden="true">⌁</div><div><span className="mission-kicker">Mikro görev · 2 dakika</span><h3>Derinleşmiş bir yanıta yapıcı katkı bırak</h3><p>Bir görüşü netleştir, kaynak ekle ya da sakin bir karşı görüş sun.</p></div><button type="button" className="journey-primary" onClick={() => { setStep("map"); setMessage("Sohbet haritası açıldı."); }}>Sohbet haritasını aç <span aria-hidden="true">→</span></button></div>}
        {step === "map" && <div className="conversation-map"><div className="map-toolbar"><span><b>Konuşma haritası</b><small>4 kişi · 1 açık dal</small></span><button type="button" onClick={() => { setStep("studio"); setMessage("Katılım stüdyosu açıldı."); }}>Seçili dala yaz</button></div><div className="map-canvas" role="tree" aria-label="Tartışma yanıt ağacı"><button role="treeitem" aria-level={1} aria-selected={selectedNode === "n1"} className={"conversation-node level-1 " + (selectedNode === "n1" ? "is-selected" : "")} onClick={() => { setSelectedNode("n1"); setMessage("Ana görüş seçildi."); }}><span className="node-shape node-claim" aria-hidden="true">●</span><span><b>Selin</b><small>Kamusal alanın gölgeleri neden önemli?</small></span><em>1</em></button><button role="treeitem" aria-level={2} aria-selected={selectedNode === "n2"} className={"conversation-node level-2 " + (selectedNode === "n2" ? "is-selected" : "")} onClick={() => { setSelectedNode("n2"); setMessage("Açık uçlu yanıt seçildi."); }}><span className="node-shape node-question" aria-hidden="true">?</span><span><b>Barış</b><small>Mahalle ölçeğinde kim karar veriyor?</small></span><em>2</em></button><button role="treeitem" aria-level={3} aria-selected={selectedNode === "n3"} className={"conversation-node level-3 " + (selectedNode === "n3" ? "is-selected" : "")} onClick={() => { setSelectedNode("n3"); setMessage("Örnek içeren yanıt seçildi."); }}><span className="node-shape node-answer" aria-hidden="true">↗</span><span><b>İpek</b><small>Yerel veriye dayanan örnek ekliyorum.</small></span><em>3</em></button>{expanded && <><button role="treeitem" aria-level={4} aria-selected={selectedNode === "n4"} className={"conversation-node level-4 " + (selectedNode === "n4" ? "is-selected" : "")} onClick={() => { setSelectedNode("n4"); setMessage("Derin dal seçildi."); }}><span className="node-shape node-answer" aria-hidden="true">↗</span><span><b>Merve</b><small>Bu örneği başka ilçelerde de görüyoruz.</small></span><em>4</em></button><button role="treeitem" aria-level={4} aria-selected={selectedNode === "n5"} className={"conversation-node level-4 " + (selectedNode === "n5" ? "is-selected" : "")} onClick={() => { setSelectedNode("n5"); setMessage("Kaynak isteyen dal seçildi."); }}><span className="node-shape node-question" aria-hidden="true">?</span><span><b>Umut</b><small>Bu gözlemi destekleyen bir kaynak var mı?</small></span><em>4</em></button></>}<button type="button" className="map-disclosure" onClick={() => { setExpanded((current) => !current); setMessage(expanded ? "Alt dallar gizlendi." : "İki alt dal daha gösterildi."); }} aria-expanded={expanded}>{expanded ? "Alt dalları daralt" : "2 alt yanıtı göster"}</button></div><div className="map-selection"><span className="node-shape node-question" aria-hidden="true">?</span><p><b>Seçili bağlam</b> · Bu dalın sorusu açıkta. Katkın konuşmayı ilerletebilir.</p><button type="button" className="journey-primary" onClick={() => { setStep("studio"); setMessage("Katılım stüdyosu açıldı."); }}>Bu dala katkı ver</button></div></div>}
        {step === "studio" && <form className="participation-studio" onSubmit={publish}><fieldset><legend>Niyetini seç</legend><div className="intent-grid">{contributionIntents.map((item) => <button type="button" key={item.id} className={"intent-card " + (intent.id === item.id ? "is-selected" : "")} aria-pressed={intent.id === item.id} onClick={() => selectIntent(item)}><b>{item.label}</b><small>{item.helper}</small></button>)}</div></fieldset><div className="studio-draft"><span><b>{intent.label}</b><small>Seçili dal: seviye {selectedNode === "n1" ? "1" : selectedNode === "n2" ? "2" : selectedNode === "n3" ? "3" : "4"}</small></span><textarea id="guided-contribution" aria-label={intent.label + " için katkın"} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={intent.prompt} maxLength={280} aria-describedby="studio-hint" /></div><div className="studio-footer"><p id="studio-hint">Kısa, somut ve saygılı kal. {draft.length}/280</p><button className="journey-primary" type="submit">Katkını paylaş <span aria-hidden="true">→</span></button></div></form>}
        {step === "complete" && <div className="completion-card"><div className="completion-burst" aria-hidden="true">✦</div><h3>Konuşmaya yeni bir bağ eklendi</h3><p>Katkın, seçtiğin niyet ve bağlamla birlikte ana akışta görünür. Günlük görev ilerlemen de güncellendi.</p><div className="completion-points"><b>+20</b><span>NSosyal puanı</span></div><button type="button" className="journey-primary" onClick={close}>Akışa dön</button></div>}
        <p className="journey-status" role="status" aria-live="polite">{message}</p>
      </section>
    </div>}
  </>;
}
function Sidebar({ view, setView, profile, unread, onCompose, onOwnProfile, onSearch }: { view: View; setView: (view: View) => void; profile: Profile; unread: number; onCompose: () => void; onOwnProfile: () => void; onSearch: () => void }) { const openHome = () => { setView("feed"); window.scrollTo({ top: 0, behavior: "smooth" }); }; return <aside className="sidebar" aria-label="Ana gezinme"><button className="brand" onClick={openHome} aria-label="NSosyal ana sayfa"><BrandMark /><span className="sr-only">NSosyal</span></button><nav className="nav-list">{navigation.map((item) => <button key={item.id} className={"nav-item " + (view === item.id || (view === "detail" && item.id === "feed") ? "is-active" : "")} onClick={() => item.id === "profile" ? onOwnProfile() : item.id === "feed" ? openHome() : item.id === "explore" ? onSearch() : setView(item.id)}><span className="nav-icon" aria-hidden="true"><UiIcon name={item.icon} /></span><span>{item.label}</span>{item.id === "notifications" && unread > 0 && <b className="nav-dot">{unread}</b>}</button>)}<button className={"nav-item " + (view === "settings" ? "is-active" : "")} onClick={() => setView("settings")} aria-label="Daha Fazla"><span className="nav-icon" aria-hidden="true"><UiIcon name="settings" /></span><span>Daha Fazla</span></button></nav><button className="primary-button sidebar-compose" onClick={onCompose} aria-label="Yeni gönderi paylaş"><span className="desktop-only">Paylaş</span><span className="mobile-only" aria-hidden="true"><UiIcon name="spark" /></span></button><button className="mini-profile" onClick={onOwnProfile}><Avatar initials={profile.initials} tone="ink" /><span><strong>{profile.name}</strong><small>{profile.handle}</small></span><b aria-hidden="true"><UiIcon name="more" /></b></button></aside>; }
function MobileNav({ view, setView, unread, onCompose, composeHidden, onSearch }: { view: View; setView: (view: View) => void; unread: number; onCompose: () => void; composeHidden: boolean; onSearch: () => void }) { const openHome = () => { setView("feed"); window.scrollTo({ top: 0, behavior: "smooth" }); }; return <nav className={"bottom-nav " + (composeHidden ? "is-compact" : "")} aria-label="Mobil gezinme">{navigation.slice(0, 4).map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => item.id === "feed" ? openHome() : item.id === "explore" ? onSearch() : setView(item.id)} aria-current={view === item.id ? "page" : undefined} aria-label={item.label}><UiIcon name={item.icon} />{item.id === "notifications" && unread > 0 && <b />}</button>)}<button className={"bottom-compose " + (composeHidden ? "is-hidden" : "")} onClick={onCompose} aria-label="Yeni gönderi paylaş" aria-hidden={composeHidden} tabIndex={composeHidden ? -1 : 0}><UiIcon name="plus" /></button></nav>; }
function MobileMoreMenu({ onClose, onProfile, onBookmarks, onSettings }: { onClose: () => void; onProfile: () => void; onBookmarks: () => void; onSettings: () => void }) { const dialogRef = useDialogFocus(onClose); return <div className="modal-backdrop"><section ref={dialogRef} className="more-menu mobile-more-menu" role="dialog" aria-modal="true" aria-label="Daha fazla gezinme" tabIndex={-1}><button onClick={onProfile}><UiIcon name="profile" /> Profil</button><button onClick={onBookmarks}><UiIcon name="bookmark" /> Yer İmleri</button><button onClick={onSettings}><UiIcon name="settings" /> Ayarlar</button><button onClick={onClose}><UiIcon name="close" /> Vazgeç</button></section></div>; }
function CompactDesktopMenu({ view, setView, theme, setTheme, profile, onClose, onOwnProfile, onCompose, onSearch }: { view: View; setView: (view: View) => void; theme: Theme; setTheme: (theme: Theme) => void; profile: Profile; onClose: () => void; onOwnProfile: () => void; onCompose: () => void; onSearch: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  const navigate = (next: View) => { if (next === "profile") onOwnProfile(); else if (next === "explore") onSearch(); else { setView(next); if (next === "feed") window.scrollTo({ top: 0, behavior: "smooth" }); } onClose(); };
  return <div className="modal-backdrop compact-menu-backdrop"><aside ref={dialogRef} className="compact-menu" role="dialog" aria-modal="true" aria-label="Yan gezinme menüsü" tabIndex={-1}>
    <header><BrandMark /><button onClick={onClose} aria-label="Yan menüyü kapat"><UiIcon name="close" /></button></header>
    <nav aria-label="Yan menü gezinmesi">{navigation.map((item) => <button key={item.id} className={"compact-nav-item " + (view === item.id || (view === "detail" && item.id === "feed") ? "is-active" : "")} onClick={() => navigate(item.id)}><UiIcon name={item.icon} /><span>{item.label}</span>{item.id === "notifications" && <b>3</b>}</button>)}<button className={"compact-nav-item " + (view === "settings" ? "is-active" : "")} onClick={() => navigate("settings")}><UiIcon name="settings" /><span>Daha Fazla</span></button></nav>
    <button className="compact-compose" onClick={() => { onClose(); onCompose(); }}><UiIcon name="plus" /><span>Yeni gönderi</span></button>
    <button className="compact-menu-profile" onClick={() => { onClose(); onOwnProfile(); }}><Avatar initials={profile.initials} tone="ink" /><span><strong>{profile.name}</strong><small>{profile.handle}</small></span><UiIcon name="arrow-right" /></button>
    <button className="compact-theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}><UiIcon name={theme === "light" ? "moon" : "sun"} /><span>{theme === "light" ? "Koyu görünüme geç" : "Açık görünüme geç"}</span></button>
  </aside></div>;
}
function ComposeModal({ text, setText, media, onTool, replyingTo, clearReply, onSubmit, onClose }: { text: string; setText: (value: string) => void; media: boolean; onTool: (kind: "media" | "location" | "poll" | "mood") => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  return <div className="modal-backdrop compose-backdrop"><section ref={dialogRef} className="compose-modal" role="dialog" aria-modal="true" aria-label="Yeni gönderi oluştur" tabIndex={-1}><header><strong>Yeni gönderi</strong><button type="button" onClick={onClose} aria-label="Gönderi oluşturmayı kapat"><UiIcon name="close" /></button></header><Composer text={text} setText={setText} media={media} onTool={onTool} replyingTo={replyingTo} clearReply={clearReply} onSubmit={onSubmit} /></section></div>;
}
function Composer({ text, setText, media, onTool, replyingTo, clearReply, onSubmit, inputId = "compose-input" }: { text: string; setText: (value: string) => void; media: boolean; onTool: (kind: "media" | "location" | "poll" | "mood") => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; inputId?: string }) { return <form className="composer" onSubmit={onSubmit}><Avatar initials="DN" tone="ink" /><div className="composer-body">{replyingTo && <div className="replying">Şunu yanıtlıyorsun: <b>{replyingTo.name}</b><button type="button" onClick={clearReply} aria-label="Yanıtı iptal et"><UiIcon name="close" /></button></div>}<label className="sr-only" htmlFor={inputId}>Yeni gönderi yaz</label><textarea id={inputId} value={text} onChange={(event) => setText(event.target.value.slice(0, 280))} placeholder={replyingTo ? "Yanıtını yaz" : "Ne paylaşmak istersin?"} rows={2} />{media && <div className="composer-media"><span className="signal-art"><i /><i /><i /></span><span><b>Görsel taslağı</b><small>Gönderi ile birlikte paylaşılacak</small></span><button type="button" onClick={() => onTool("media")} aria-label="Görsel taslağını kaldır"><UiIcon name="close" /></button></div>}<div className="compose-footer"><div className="compose-tools" aria-label="Gönderi ekleri"><button type="button" onClick={() => onTool("media")} aria-label="Görsel taslağı ekle"><UiIcon name="media" /></button><button type="button" onClick={() => onTool("location")} aria-label="Konum ekle"><UiIcon name="location" /></button><button type="button" onClick={() => onTool("poll")} aria-label="Anket taslağı ekle"><UiIcon name="poll" /></button><button type="button" onClick={() => onTool("mood")} aria-label="Duygu ekle"><UiIcon name="mood" /></button></div><span className={text.length > 250 ? "limit near" : "limit"}>{280 - text.length}</span><button className="primary-button small-button" type="submit">Paylaş</button></div></div></form>; }

type FeedProps = { posts: Post[]; actions: Actions; pinned: string | null; morePost: Post | null; following: string[]; points: number; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onDetail: (post: Post) => void; onProfile: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void; onMore: (post: Post | null) => void; onMedia: (post: Post) => void; onDelete: (post: Post) => void; onPin: (post: Post) => void; onFollow: (handle: string) => void; };
function Feed(props: FeedProps) { return <div className="post-list">{props.posts.map((post) => <PostCard key={post.id} {...props} post={post} />)}</div>; }
function PostCard({ post, actions, pinned, following, points, onAction, onReply, onDetail, onProfile, onShare, onMore, onMedia, onFollow }: FeedProps & { post: Post }) {
  const liked = actions.likes.includes(post.id), reposted = actions.reposts.includes(post.id), saved = actions.bookmarks.includes(post.id);
  const authorPoints = post.own ? points : authorPointsByHandle[post.handle] ?? 0;
  const authorBadge = getPointsBadge(authorPoints);
  return <article className={"post " + (post.replies > 0 ? "has-thread" : "")}>
    {pinned === post.id && <p className="pin-status"><UiIcon name="pin" /> Profilde sabitlendi</p>}
    <button className="avatar-button" onClick={(event) => runExclusive(event, () => onProfile(post))} aria-label={post.initials + ", " + post.name + " profilini aç"}><Avatar initials={post.initials} tone={post.tone} /></button>
    <div className="post-content">
      {post.repostedByMe && <p className="repost-status" aria-label="Yeniden paylaştığın gönderi"><ActionIcon name="repost" /> Yeniden paylaştın</p>}
      {post.replyTo && <p className="reply-context">{post.replyTo} adlı kişiye yanıt olarak</p>}
      <div className="post-meta"><button className="name" onClick={(event) => runExclusive(event, () => onProfile(post))}>{post.name}</button><span className={"points-badge " + authorBadge.tone} title={authorBadge.label + ": " + authorPoints + " puan"} aria-label={authorBadge.label + ", " + authorPoints + " puan"}>{authorBadge.mark}</span><span>{post.handle}</span><span>·</span><button className="time" onClick={() => onDetail(post)}>{post.time}</button>{!post.own && <button className="post-follow" aria-label={following.includes(post.handle) ? post.handle + " takibini bırak" : post.handle + " kişisini takip et"} aria-pressed={following.includes(post.handle)} onClick={(event) => runExclusive(event, () => onFollow(post.handle))}><UiIcon name={following.includes(post.handle) ? "check" : "plus"} /><span className="sr-only">{following.includes(post.handle) ? "Takip ediliyor" : "Takip et"}</span></button>}<button className="more" aria-label="Gönderi seçeneklerini aç" onClick={(event) => runExclusive(event, () => onMore(post))}><UiIcon name="more" /></button></div>
      <button className="post-body" onClick={() => onDetail(post)} aria-label={post.body + " — gönderi ayrıntılarını aç"}>{post.body}</button>
      {post.attachment === "signal" && <button className="signal-card media-card" onClick={(event) => runExclusive(event, () => onMedia(post))}><span className="signal-art" aria-hidden="true"><i /><i /><i /></span><span className="signal-caption"><span>Kent notları</span><b>Şehir serinliği notları</b><small>Görsel önizlemeyi aç</small></span><em aria-hidden="true"><UiIcon name="arrow-right" /></em></button>}
      {post.attachment === "note" && <button className="note-card" onClick={(event) => runExclusive(event, () => onMedia(post))}><span>Okuma notu</span><b>Yerel veriyi ortak bir dilde buluşturmak</b><small>Önizlemeyi aç · 4 dk okuma</small></button>}
      <div className="post-actions" aria-label="Gönderi işlemleri"><ActionButton icon="reply" label="Yanıtla" count={post.replies} onClick={() => onReply(post)} /><ActionButton icon="repost" label="Yeniden paylaş" count={post.reposts + Number(reposted)} active={reposted} onClick={() => onAction("reposts", post.id)} /><ActionButton icon="like" label="Beğen" count={post.likes + Number(liked)} active={liked} kind="like" onClick={() => onAction("likes", post.id)} /><ActionButton icon="bookmark" label={saved ? "Yer iminden kaldır" : "Yer imlerine ekle"} active={saved} onClick={() => onAction("bookmarks", post.id)} /><ActionButton icon="share" label="Paylaş" onClick={() => onShare(post)} /></div>
    </div>
  </article>;
}
function ActionIcon({ name }: { name: ActionIconName }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 2.05, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {name === "reply" && <path {...shared} d="M20.5 11.4a7.25 7.25 0 0 1-7.4 7.1 8.6 8.6 0 0 1-3.8-.9L4 19l1.5-4.2a6.9 6.9 0 0 1-.9-3.4c0-3.9 3.4-7 7.9-7s8 3.1 8 7Z" />}
    {name === "repost" && <><path {...shared} d="m17 2.5 4 4-4 4" /><path {...shared} d="M3 11V9a4 4 0 0 1 4-4h14" /><path {...shared} d="m7 21.5-4-4 4-4" /><path {...shared} d="M21 13v2a4 4 0 0 1-4 4H3" /></>}
    {name === "like" && <path {...shared} d="M20.8 8.7c0 5-8.8 10.1-8.8 10.1S3.2 13.7 3.2 8.7A4.2 4.2 0 0 1 11 6.5L12 8l1-1.5a4.2 4.2 0 0 1 7.8 2.2Z" />}
    {name === "bookmark" && <path {...shared} d="M6.5 4.5h11v15l-5.5-3.2-5.5 3.2v-15Z" />}
    {name === "share" && <><circle {...shared} cx="18" cy="5" r="2.3" /><circle {...shared} cx="6" cy="12" r="2.3" /><circle {...shared} cx="18" cy="19" r="2.3" /><path {...shared} d="m8.1 10.9 7.8-4.7M8.1 13.1l7.8 4.7" /></>}
  </svg>;
}
function ActionButton({ icon, label, count, active, kind, onClick }: { icon: ActionIconName; label: string; count?: number; active?: boolean; kind?: "like"; onClick: () => void }) { const accessibleLabel = typeof count === "number" ? label + " " + formatNumber(count) : label; return <span className={"action-wrap " + icon + " " + (active ? "active " : "") + (kind || "") + (typeof count !== "number" ? " icon-only" : "")}><button className="action" aria-label={accessibleLabel} aria-pressed={typeof active === "boolean" ? active : undefined} onClick={(event) => runExclusive(event, onClick)}><i aria-hidden="true"><ActionIcon name={icon} /></i>{typeof count === "number" && <small>{formatNumber(count)}</small>}</button></span>; }
type ThreadDetailProps = Omit<FeedProps, "posts" | "morePost"> & { post: Post; morePost: Post | null; allPosts: Post[]; contextOpen: boolean; setContextOpen: (value: boolean) => void; composerText: string; setComposerText: (value: string) => void; composerMedia: boolean; onTool: (kind: "media" | "location" | "poll" | "mood") => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void };
function ThreadDetail(props: ThreadDetailProps) {
  const merged = Array.from(new Map([...seedReplies, ...props.allPosts].map((post) => [post.id, post])).values());
  const replies = props.post.context ? repliesForThread(merged, props.post) : repliesForThread(merged, props.post);
  const seededReplyIds = new Set(seedReplies.map((post) => post.id));
  const localReplyCount = replies.filter((reply) => !seededReplyIds.has(reply.id)).length;
  const displayPost = localReplyCount ? { ...props.post, replies: props.post.replies + localReplyCount } : props.post;
  return <div className="thread-view"><PostCard {...props} posts={props.allPosts} post={displayPost} />{props.post.context && <section className="context-summary" aria-label="Bağlam özeti"><button className="context-toggle" onClick={() => props.setContextOpen(!props.contextOpen)} aria-expanded={props.contextOpen}><span><i aria-hidden="true"><UiIcon name="spark" /></i><b>Bağlam Özeti</b><small>Bu konuşmada öne çıkanlar</small></span><span aria-hidden="true"><UiIcon name={props.contextOpen ? "arrow-left" : "arrow-right"} /></span></button>{props.contextOpen && <div className="summary-content"><ul>{contextBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><p>NSosyal yapay zekâ özeti <span>·</span> Hata içerebilir.</p></div>}</section>}{props.replyingTo?.id === props.post.id ? <Composer text={props.composerText} setText={props.setComposerText} media={props.composerMedia} onTool={props.onTool} replyingTo={props.replyingTo} clearReply={props.clearReply} onSubmit={props.onSubmit} inputId="thread-reply-input" /> : <div className="thread-reply"><Avatar initials="DN" tone="ink" /><button onClick={() => props.onReply(props.post)}>Yanıtını yaz</button></div>}{replies.length ? <Feed {...props} posts={replies} /> : <EmptyState title="Konuşma burada sakin" copy="İlk düşünceni paylaşarak bu gönderiyi büyütebilirsin." />}</div>;
}
function Explore(props: Omit<FeedProps, "posts" | "morePost"> & { search: string; setSearch: (value: string) => void; posts: Post[] }) { const visible = props.posts.filter((post) => (post.name + " " + post.body).toLocaleLowerCase("tr").includes(props.search.toLocaleLowerCase("tr"))); return <div className="explore-view"><div className="explore-search"><span aria-hidden="true"><UiIcon name="search" /></span><input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Kişi ya da konu ara" aria-label="Kişi ya da konu ara" /></div>{props.search ? <><h2>Arama sonuçları</h2>{visible.length ? <div className="search-results"><Feed {...props} posts={visible} morePost={null} /></div> : <EmptyState title="Bir sonuç bulamadık" copy="Başka bir kelimeyle aramayı dene." />}</> : <><h2>Bugün konuşulanlar</h2><TrendPanel full onSelect={props.setSearch} /><section className="editor-pick"><p>Editörün seçimi</p><button onClick={() => props.onDetail(seedPosts[0])}><span className="editor-ripple"><i /><i /></span><span><b>Şehir nasıl serin kalır?</b><small>İklim ve kamusal alan üzerine açık konuşma</small></span><em aria-hidden="true"><UiIcon name="arrow-right" /></em></button></section></>}</div>; }
function Notifications({ read, setRead, onOpen }: { read: string[]; setRead: (value: string[]) => void; onOpen: (post: Post) => void }) { const [filter, setFilter] = useState<"all" | "unread">("all"); const items = [{ id: "selin", post: seedPosts[0], avatar: <Avatar initials="SU" tone="teal" />, copy: <><b>Selin Uçak</b> seninle aynı serin rota fikrini konuşuyor.</> }, { id: "veri", post: seedPosts[2], avatar: <span className="notification-stack"><Avatar initials="AV" tone="teal" /><Avatar initials="MS" tone="violet" /></span>, copy: <><b>Açık Veri Günlüğü</b> ve 12 kişi kaydettiğin notu beğendi.</> }, { id: "secim", post: seedPosts[1], avatar: <span className="spark"><UiIcon name="spark" /></span>, copy: <><b>NSosyal seçkisine hoş geldin.</b> Takip ettiğin konulardan daha dengeli bir ana sayfa hazırlıyoruz.</> }]; return <div className="notifications-view"><div className="notification-tabs" role="tablist" aria-label="Bildirim filtresi"><button role="tab" aria-selected={filter === "all"} className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Tümü</button><button role="tab" aria-selected={filter === "unread"} className={filter === "unread" ? "selected" : ""} onClick={() => setFilter("unread")}>Okunmamış</button></div>{items.filter((item) => filter === "all" || !read.includes(item.id)).map((item) => <button key={item.id} className={"notification " + (read.includes(item.id) ? "is-read" : "")} onClick={() => { if (!read.includes(item.id)) setRead([...read, item.id]); onOpen(item.post); }}>{item.avatar}<span>{item.copy}<small>{read.includes(item.id) ? "Okundu" : "Yeni"}</small></span><em aria-hidden="true"><UiIcon name="arrow-right" /></em></button>)}</div>; }
function Messages({ messages, setMessages, profile, target }: { messages: Message[]; setMessages: (next: Message[]) => void; profile: Profile; target: Profile | null }) {
  const targetConversation = target?.handle ?? "team";
  const [open, setOpen] = useState(targetConversation); const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const contacts = [
    { id: "team", name: "NSosyal Ekibi", handle: "@nsosyalekibi", initials: "YE", tone: "coral", preview: "Bağlam özeti hakkında…" },
    { id: "bora", name: "Bora Ekin", handle: "@boraekin", initials: "BE", tone: "violet", preview: "Rota notlarına baktın mı?" },
    ...(target && target.handle !== "@boraekin" ? [{ id: target.handle, name: target.name, handle: target.handle, initials: target.initials, tone: "ink", preview: "Yeni konuşma" }] : []),
  ];
  const contact = contacts.find((item) => item.id === open) ?? contacts[0];
  const visibleMessages = messages.filter((message) => message.conversationId === open);
  useEffect(() => { const frame = window.requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }); return () => window.cancelAnimationFrame(frame); }, [open, visibleMessages.length]);
  const send = () => { const body = draft.trim(); if (!body) return; setMessages([...messages, { id: "message-" + Date.now(), conversationId: open, from: "me", body }]); setDraft(""); };
  return <div className="messages-view"><div className="message-list">{contacts.map((item) => <button key={item.id} className={open === item.id ? "selected" : ""} onClick={() => setOpen(item.id)} aria-label={item.name + " konuşmasını aç"}><Avatar initials={item.initials} tone={item.tone} /><span><b>{item.name}</b><small>{item.preview}</small></span></button>)}</div><section className="message-thread"><header><Avatar initials={contact.initials} tone={contact.tone} /><span><b>{contact.name}</b><small>{contact.handle}</small></span></header><div className="message-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label={contact.name + " ile mesajlar"}>{visibleMessages.map((message) => <div key={message.id} className={"message-bubble " + message.from}>{message.body}</div>)}</div><form className="message-compose" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={profile.name + " olarak mesaj yaz"} aria-label="Yeni bir mesaj yaz" /><button aria-label="Gönder" type="submit"><UiIcon name="send" /></button></form></section></div>;
}
function Profile(props: FeedProps & { profile: Profile; isOwn: boolean; points: number; gamification: Gamification; onEdit: () => void; onSettings: () => void; onMessage: (profile: Profile) => void; onPoints: () => void }) {
  const [tab, setTab] = useState<"posts" | "replies" | "likes" | "bookmarks">("posts");
  const belongsToProfile = (post: Post) => props.isOwn ? post.own === true : post.handle === props.profile.handle;
  const visible = tab === "posts" ? (props.isOwn ? props.posts.filter((post) => !post.replyTo && (post.own || props.actions.reposts.includes(post.id))).map((post) => post.own ? post : { ...post, repostedByMe: true }) : props.posts.filter((post) => belongsToProfile(post) && !post.replyTo)) : tab === "replies" ? props.posts.filter((post) => belongsToProfile(post) && !!post.replyTo) : tab === "likes" ? (props.isOwn ? props.posts.filter((post) => props.actions.likes.includes(post.id)) : []) : (props.isOwn ? props.posts.filter((post) => props.actions.bookmarks.includes(post.id)) : []);
  const copy = tab === "posts" ? "Ana Sayfadan yeni bir düşünce başlatabilirsin." : tab === "replies" ? "Bir gönderiye yanıt verdiğinde burada görünür." : tab === "likes" ? "Beğendiğin gönderiler burada görünür." : "Yer imlerine eklediğin gönderiler burada görünür.";
  const followed = props.following.includes(props.profile.handle);
  const profilePoints = props.isOwn ? props.points : authorPointsByHandle[props.profile.handle] ?? 0;
  const badge = getPointsBadge(profilePoints);
  const profileBadge = props.isOwn ? <button className="profile-reputation" onClick={props.onPoints} aria-label={profilePoints + " puan. Rozet ve kilometre taşlarını gör."}><span className={"points-badge " + badge.tone} aria-hidden="true">{badge.mark}</span></button> : <span className="profile-reputation is-static" title={badge.label + ": " + profilePoints + " puan"} aria-label={badge.label + ", " + profilePoints + " puan"}><span className={"points-badge " + badge.tone} aria-hidden="true">{badge.mark}</span></span>;
  return <div className="profile-view"><div className="profile-cover"><span className="cover-ripple"><i /><i /><i /></span></div><div className="profile-head"><Avatar initials={props.profile.initials} tone="ink" />{props.isOwn ? <div className="profile-actions"><button className="outline-button" onClick={props.onEdit}>Profili düzenle</button><button className="icon-button profile-settings" onClick={props.onSettings} aria-label="Ayarları aç"><UiIcon name="settings" /></button></div> : <div className="profile-actions"><button className={followed ? "outline-button" : "primary-button"} aria-pressed={followed} onClick={() => props.onFollow(props.profile.handle)}>{followed ? "Takip Ediliyor" : "Takip et"}</button><button className="outline-button profile-message" onClick={() => props.onMessage(props.profile)}><UiIcon name="messages" /> Mesaj gönder</button></div>}</div><section className="profile-copy"><h2>{props.profile.name}{profileBadge}</h2><p>{props.profile.handle}</p><p className="bio">{props.profile.bio}</p><div><span><UiIcon name="location" /> {props.profile.location}</span><span><UiIcon name="spark" /> Mayıs 2024’te katıldı <small className="profile-points">· {profilePoints} puan</small></span></div><p><b>284</b> Takip edilen <b>1.208</b> Takipçi</p></section>{props.isOwn && <DailyTasks gamification={props.gamification} />}<div className="profile-tabs" role="tablist" aria-label="Profil bölümleri"><button role="tab" aria-selected={tab === "posts"} className={tab === "posts" ? "selected" : ""} onClick={() => setTab("posts")}>Gönderiler</button><button role="tab" aria-selected={tab === "replies"} className={tab === "replies" ? "selected" : ""} onClick={() => setTab("replies")}>Yanıtlar</button><button role="tab" aria-selected={tab === "likes"} className={tab === "likes" ? "selected" : ""} onClick={() => setTab("likes")}>Beğeniler</button><button role="tab" aria-selected={tab === "bookmarks"} className={tab === "bookmarks" ? "selected" : ""} onClick={() => setTab("bookmarks")}>Yer İmleri</button></div>{visible.length ? <Feed {...props} posts={visible} /> : <EmptyState title="Henüz burada bir şey yok" copy={copy} />}</div>;
}
function DailyTasks({ gamification }: { gamification: Gamification }) { return <section className="daily-tasks" aria-label="Günlük görevler"><header><span><b>Günlük görevler</b><small>Katıldıkça puan kazan</small></span></header><div>{dailyTasks.map((task) => { const done = gamification.completedTasks.includes(task.id); return <div className={done ? "task done" : "task"} key={task.id}><span className="task-check" aria-hidden="true">{done ? "✓" : "○"}</span><span><b>{task.label}</b><small>{done ? "Tamamlandı" : "+" + task.points + " puan"}</small></span></div>; })}</div></section>; }

function MilestoneSheet({ points, onClose }: { points: number; onClose: () => void }) {
  const dialogRef = useDialogFocus(onClose);
  const current = getPointsBadge(points);
  const currentMilestone = badgeMilestones.find((badge) => badge.label === current.label) ?? badgeMilestones[0];
  const next = badgeMilestones.find((badge) => badge.points > points);
  const progress = next ? Math.round(((points - currentMilestone.points) / (next.points - currentMilestone.points)) * 100) : 100;
  return <div className="modal-backdrop milestone-backdrop"><section ref={dialogRef} className="milestone-sheet" role="dialog" aria-modal="true" aria-labelledby="milestone-title" tabIndex={-1}><header><span className={"points-badge " + current.tone} aria-hidden="true">{current.mark}</span><span><small>Topluluk puanın</small><strong id="milestone-title">{points} puan</strong></span><button className="icon-button" aria-label="Rozetleri kapat" onClick={onClose}><UiIcon name="close" /></button></header><p>{next ? next.label + " rozetine " + Math.max(0, next.points - points) + " puan kaldı." : "Tüm topluluk rozetlerini açtın."}</p>{next && <div className="milestone-progress" aria-label={next.label + " rozetine ilerleme"}><span style={{ width: Math.max(0, Math.min(100, progress)) + "%" }} /></div>}<ol className="milestone-list">{badgeMilestones.map((badge) => { const unlocked = points >= badge.points; return <li className={unlocked ? "is-unlocked" : ""} key={badge.label}><span className={"points-badge " + badge.tone} aria-hidden="true">{badge.mark}</span><span><b>{badge.label}</b><small>{badge.copy}</small></span><em>{unlocked ? "Açıldı" : badge.points + " puan"}</em></li>; })}</ol></section></div>;
}
function Settings({ theme, setTheme, onReset }: { theme: Theme; setTheme: (theme: Theme) => void; onReset: () => void }) { return <div className="settings-view"><section><h2>Görünüm</h2><p>NSosyal’ın bu cihazdaki görünümünü seç.</p><div className="theme-options" role="tablist" aria-label="Tema seçimi"><button role="tab" aria-selected={theme === "light"} className={theme === "light" ? "selected" : ""} onClick={() => setTheme("light")}><span className="theme-preview light" />Açık</button><button role="tab" aria-selected={theme === "dark"} className={theme === "dark" ? "selected" : ""} onClick={() => setTheme("dark")}><span className="theme-preview dark" />Koyu</button></div></section><section><h2>Yerel demo</h2><p>Gönderilerin, beğenilerin, mesajların ve yer imlerin sadece bu tarayıcıda saklanır.</p><button className="outline-button demo-reset" onClick={onReset}>Demo verisini sıfırla</button></section><section><h2>Bağlam özeti</h2><p>Özetler konuşmaya yaklaşmana yardım eder; kesin bilgi yerine kaynaklara ve katılımcılara öncelik ver.</p></section></div>; }
function TrendPanel({ full = false, onSelect }: { full?: boolean; onSelect: (topic: string) => void }) { const trends = [["Türkiye’de gündem", "#serinrota", "4.282 gönderi"], ["Teknoloji · Gündem", "Açık standart", "1.904 gönderi"], ["Kültür · Gündem", "Sessiz sinema", "916 gönderi"], ["İstanbul’da gündem", "Gece kütüphanesi", "683 gönderi"]]; return <section className={"trend-panel " + (full ? "full" : "")}><h2>{full ? "Gündem" : "Şu an konuşulanlar"}</h2>{trends.map(([meta, topic, count]) => <button key={topic} onClick={() => onSelect(topic)}><span><small>{meta}</small><b>{topic}</b><small>{count}</small></span><em aria-hidden="true"><UiIcon name="more" /></em></button>)}<p className="show-more">Gündem, örnek verilerle güncellenir.</p></section>; }
function WhoToFollow({ following, onFollow }: { following: string[]; onFollow: (handle: string) => void }) { const people = [{ name: "Sena Ertem", handle: "@senaertem", initials: "SE", tone: "gold" }, { name: "Barış Koral", handle: "@bariskoral", initials: "BK", tone: "violet" }]; return <section className="who-panel"><h2>Tanıyor olabileceğin kişiler</h2>{people.map((person) => <div key={person.handle}><Avatar initials={person.initials} tone={person.tone} /><span><b>{person.name}</b><small>{person.handle}</small></span><button className={following.includes(person.handle) ? "outline-button" : "dark-button"} aria-pressed={following.includes(person.handle)} onClick={() => onFollow(person.handle)}>{following.includes(person.handle) ? "Takip Ediliyor" : "Takip et"}</button></div>)}<p className="show-more">Kişi önerileri örnek veriyle sınırlı.</p></section>; }
function MoreMenu({ post, isPinned, followed, onClose, onDelete, onPin, onFollow, onShare, onQuote }: { post: Post; isPinned: boolean; followed: boolean; onClose: () => void; onDelete: (post: Post) => void; onPin: (post: Post) => void; onFollow: (handle: string) => void; onShare: (post: Post) => void; onQuote: (post: Post) => void }) { const dialogRef = useDialogFocus(onClose); return <div className="modal-backdrop"><section ref={dialogRef} className="more-menu" role="dialog" aria-modal="true" aria-label="Gönderi seçenekleri" tabIndex={-1}><button onClick={() => { onShare(post); onClose(); }}><UiIcon name="send" /> Metni paylaş</button><button onClick={() => { onQuote(post); onClose(); }}><UiIcon name="quote" /> Alıntıla</button>{post.own ? <><button aria-pressed={isPinned} onClick={() => onPin(post)}><UiIcon name="pin" /> {isPinned ? "Profilden sabitlemeyi kaldır" : "Profiline sabitle"}</button><button className="danger" onClick={() => onDelete(post)}><UiIcon name="close" /> Gönderiyi sil</button></> : <button aria-pressed={followed} onClick={() => { onFollow(post.handle); onClose(); }}><UiIcon name="profile" /> {followed ? post.handle + " takipten çıkar" : post.handle + " takip et"}</button>}<button onClick={onClose}><UiIcon name="close" /> Vazgeç</button></section></div>; }
function MediaPreview({ post, onClose }: { post: Post; onClose: () => void }) { const dialogRef = useDialogFocus(onClose); return <div className="modal-backdrop"><section ref={dialogRef} className="media-preview" role="dialog" aria-modal="true" aria-label="Medya önizlemesi" tabIndex={-1}><button className="modal-close" onClick={onClose} aria-label="Önizlemeyi kapat"><UiIcon name="close" /></button><span className="media-ripple"><i /><i /><i /></span><p>{post.attachment === "note" ? "Açık veri notu" : "Şehir serinliği notları"}</p><h2>{post.body}</h2><small>Bu, çevrimdışı demo için hazırlanmış bir medya önizlemesidir.</small></section></div>; }
function ProfileEditor({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (profile: Profile) => void }) { const [draft, setDraft] = useState(profile); const dialogRef = useDialogFocus<HTMLFormElement>(onClose); return <div className="modal-backdrop"><form ref={dialogRef} className="profile-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft); }} role="dialog" aria-modal="true" aria-label="Profili düzenle" tabIndex={-1}><header><h2>Profili düzenle</h2><button type="button" onClick={onClose} aria-label="Kapat"><UiIcon name="close" /></button></header><label>Adın<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value.slice(0, 36) })} /></label><label>Kısa bio<textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value.slice(0, 160) })} /></label><label>Konum<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value.slice(0, 36) })} /></label><button className="primary-button" type="submit">Kaydet</button></form></div>; }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <section className="empty-state"><span aria-hidden="true"><UiIcon name="spark" /></span><h2>{title}</h2><p>{copy}</p></section>; }
