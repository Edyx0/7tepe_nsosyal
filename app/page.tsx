"use client";

/* eslint-disable @next/next/no-img-element -- Official SVG assets must be rendered byte-for-byte. */
import { FormEvent, Fragment, RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  countNewRepliesForThread,
  removeItem,
  runExclusive,
  threadedRepliesForRoot,
  threadRootForPost,
  toggleItem,
  togglePinned,
} from "./demo-state.mjs";

/**
 * Social shell, composer/action anatomy, and responsive navigation are adapted
 * from ccrsxx/twitter-clone at 62a9588577ec6f5ce6d28b50d30bf46d2229453d.
 * This is a local-only React 19 rewrite; see THIRD_PARTY_NOTICES.md.
 */
type View = "feed" | "contribute" | "explore" | "notifications" | "messages" | "bookmarks" | "profile" | "settings" | "detail";
type FeedMode = "for-you" | "following";
type Theme = "light" | "dark";
type Attachment = "signal" | "note";
type Poll = { question: string; options: string[] };
type ComposerImage = { src: string; name: string };
type Post = {
  id: string; name: string; handle: string; time: string; body: string; initials: string;
  tone: string; replies: number; reposts: number; likes: number; audience: "all" | "following";
  replyTo?: string; replyToId?: string; context?: boolean; attachment?: Attachment; own?: boolean; repostedByMe?: boolean;
  image?: string; imageAlt?: string; repostedBy?: string; repostQuote?: string; poll?: Poll;
};
type Actions = { likes: string[]; reposts: string[]; bookmarks: string[] };
type Mods = { deleted: string[]; pinned: string | null };
type Profile = { name: string; handle: string; initials: string; bio: string; location: string; cover?: string };
type Message = { id: string; conversationId: string; from: "me" | "them"; body: string };
type Gamification = { points: number; completedTasks: string[]; taskDate: string };
type PointsBadge = { label: string; mark: string; tone: "starter" | "active" | "trusted" | "expert" };
type ActionIconName = "reply" | "repost" | "like" | "bookmark" | "share";
type UiIconName = "home" | "search" | "menu" | "plus" | "check" | "notifications" | "messages" | "bookmark" | "profile" | "settings" | "sun" | "moon" | "arrow-left" | "arrow-right" | "close" | "more" | "media" | "location" | "poll" | "mood" | "send" | "pin" | "quote" | "spark";

const demoProfile: Profile = { name: "Deniz Naz", handle: "@denizn", initials: "DN", bio: "Şehirde yürürken aklıma takılan küçük şeyleri yazıyorum.", location: "İstanbul", cover: "/demo/mahalle-kutuphanesi.png" };
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
  "@cerenyaziyor": 89,
  "@efe_s": 57,
  "@asliguler": 73,
  "@canerdogan": 41,
  "@deryauzun": 118,
  "@iremdeniz": 31,
  "@kivancsari": 52,
  "@leylaoruc": 96,
  "@meliskara": 27,
  "@oneraktas": 64,
  "@pelinnotlar": 38,
  "@yagiztoprak": 45,
};
const portraitByInitials: Record<string, string> = {
  DN: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=82",
  İA: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=82",
  EY: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=82",
  AV: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=82",
  AK: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=82",
  SU: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=240&q=82",
  BE: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=240&q=82",
  CY: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=82",
  ES: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=240&q=82",
  YE: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=82",
};
const profilesByHandle: Record<string, Profile> = {
  "@idilaras": { name: "İdil Aras", handle: "@idilaras", initials: "İA", bio: "Kentte biraz daha rahat nefes alabilmek için küçük, uygulanabilir fikirleri topluyorum.", location: "Kadıköy, İstanbul", cover: "/demo/kent-serinligi.png" },
  "@edizyilmaz": { name: "Ediz Yılmaz", handle: "@edizyilmaz", initials: "EY", bio: "Film, kitap ve mahalle hayatı hakkında kısa notlar. Bazen fazla düşünüyorum.", location: "Beyoğlu, İstanbul", cover: "/demo/mahalle-kutuphanesi.png" },
  "@selinucak": { name: "Selin Uçak", handle: "@selinucak", initials: "SU", bio: "Okul yollarını, mahalleleri ve çocukların şehirle kurduğu ilişkiyi takip ediyorum.", location: "Üsküdar, İstanbul", cover: "/demo/kent-serinligi.png" },
  "@boraekin": { name: "Bora Ekin", handle: "@boraekin", initials: "BE", bio: "Gece yürüyüşleri, açık mekânlar ve herkesin kullanabildiği şehirler üzerine düşünüyorum.", location: "İzmir", cover: "/demo/mahalle-kutuphanesi.png" },
  "@cerenyaziyor": { name: "Ceren Yalçın", handle: "@cerenyaziyor", initials: "CY", bio: "Mahallede gördüğüm işe yarar şeyleri not alıyorum. Büyük sözlerden biraz yoruldum.", location: "Beşiktaş, İstanbul", cover: "/demo/kent-serinligi.png" },
  "@efe_s": { name: "Efe Sönmez", handle: "@efe_s", initials: "ES", bio: "Açık veri, kaldırımlar ve bir de iyi kahve. Sırası her gün değişiyor.", location: "Karşıyaka, İzmir", cover: "/demo/mahalle-kutuphanesi.png" },
  "@asliguler": { name: "Aslı Güler", handle: "@asliguler", initials: "AG", bio: "Şehirde çocukla dolaşmanın pratiklerini biriktiriyorum. Bir kısmı sinir bozucu derecede basit.", location: "Ataşehir, İstanbul", cover: "/demo/kent-serinligi.png" },
  "@canerdogan": { name: "Can Erdoğan", handle: "@canerdogan", initials: "CE", bio: "Ses kayıtçısı. Vapurlar, pazar yerleri ve apartman boşlukları ilgimi çekiyor.", location: "Alsancak, İzmir", cover: "/demo/mahalle-kutuphanesi.png" },
  "@deryauzun": { name: "Derya Uzun", handle: "@deryauzun", initials: "DU", bio: "Mahalle kütüphanelerinde çalışıyorum. İnsanların hangi kitabı ödünç aldığını tahmin etmeyi bıraktım.", location: "Nilüfer, Bursa", cover: "/demo/mahalle-kutuphanesi.png" },
  "@iremdeniz": { name: "İrem Deniz", handle: "@iremdeniz", initials: "İD", bio: "Yürüyerek ulaşılabilen şeylerin peşindeyim. Bazen harita, bazen fırın önerisi paylaşıyorum.", location: "Moda, İstanbul", cover: "/demo/kent-serinligi.png" },
  "@kivancsari": { name: "Kıvanç Sarı", handle: "@kivancsari", initials: "KS", bio: "Açık kaynak, eski bilgisayarlar ve iyi hazırlanmış çay.", location: "Eskişehir", cover: "/demo/mahalle-kutuphanesi.png" },
  "@leylaoruc": { name: "Leyla Oruç", handle: "@leylaoruc", initials: "LO", bio: "Kent bahçeleriyle uğraşıyorum. Domates kadar gölge de önemli.", location: "Bornova, İzmir", cover: "/demo/kent-serinligi.png" },
  "@meliskara": { name: "Melis Kara", handle: "@meliskara", initials: "MK", bio: "Mimarlık öğrencisi. Bir bankın neden rahat olmadığını uzun uzun anlatabilirim.", location: "Kadıköy, İstanbul", cover: "/demo/kent-serinligi.png" },
  "@oneraktas": { name: "Öner Aktaş", handle: "@oneraktas", initials: "ÖA", bio: "Toplu taşıma verisini kurcalıyorum. Gece seferlerini de unutmayalım.", location: "Çankaya, Ankara", cover: "/demo/mahalle-kutuphanesi.png" },
  "@pelinnotlar": { name: "Pelin Soylu", handle: "@pelinnotlar", initials: "PS", bio: "Küçük sergiler, mahalle kahveleri ve not defterleri.", location: "Balat, İstanbul", cover: "/demo/mahalle-kutuphanesi.png" },
  "@yagiztoprak": { name: "Yağız Toprak", handle: "@yagiztoprak", initials: "YT", bio: "Bisikletle şehir içinde kaybolmayı seviyorum. Sonra dönüş yolunu da buluyorum.", location: "Konak, İzmir", cover: "/demo/kent-serinligi.png" },
};
const seedPosts: Post[] = [
  { id: "iklim-kent", name: "İdil Aras", handle: "@idilaras", time: "18 dk", body: "Bugün Kadıköy sahilde, gölgeli durakta beklemenin ne kadar fark ettiğini yine gördüm. Yanında çeşme de olunca insanlar biraz soluklanıyor. Önce birkaç mahallede denesek mi?", initials: "İA", tone: "coral", replies: 86, reposts: 142, likes: 982, audience: "all", context: true, attachment: "signal", image: "/demo/kent-serinligi.png", imageAlt: "Ağaç gölgesindeki durak ve sahil" },
  { id: "film-kulubu", name: "Ediz Yılmaz", handle: "@edizyilmaz", time: "31 dk", body: "Filmler biter bitmez konuşmaya başlıyoruz. Bu akşam 10 dakika sessiz kalmayı deneyelim mi? Aklında kalan sahne o zaman daha net çıkıyor ortaya.", initials: "EY", tone: "violet", replies: 24, reposts: 18, likes: 311, audience: "following", attachment: "note", image: "/demo/mahalle-kutuphanesi.png", imageAlt: "Akşam saatlerinde mahalle kütüphanesi" },
  { id: "acik-veri", name: "Açık Veri Günlüğü", handle: "@acikverigunlugu", time: "1 sa", body: "Erişilebilirlik haritalarını tek bir biçimde yayınlamak sandığımız kadar zor değil. Asıl mesele, verinin ne zaman güncellendiğini görebilmek. Küçük bir okuma listesi bıraktık.", initials: "AV", tone: "teal", replies: 39, reposts: 204, likes: 746, audience: "all", attachment: "note" },
  { id: "sokak-notu", name: "Selin Uçak", handle: "@selinucak", time: "1 sa", body: "Okul çıkışında gölgede kalacak yolu seçmek artık annelerin küçük taktiği olmuş. Bu işi insanların hafızasına bırakmak yerine, rota bilgisini duraklara asmak daha iyi olmaz mı?", initials: "SU", tone: "teal", replies: 18, reposts: 29, likes: 384, audience: "all", repostedBy: "Efe Sönmez" },
  { id: "gece-notu", name: "Bora Ekin", handle: "@boraekin", time: "2 sa", body: "Gece açık bir kütüphane, sadece ders çalışacak yer demek değil. Eve dönmeden önce biraz oturacak, telefonunu şarj edecek, tuvalete girecek bir yer de demek.", initials: "BE", tone: "violet", replies: 27, reposts: 41, likes: 523, audience: "following", repostedBy: "Ceren Yalçın", repostQuote: "Bu cümle aklımda kaldı. Şehirde 'biraz beklemek' için de güvenli yer lazım." },
  { id: "sabah-kosu", name: "Adnan Kantar", handle: "@adnankantar", time: "3 sa", body: "Sabah yürüyüşünde duyduğum tek motor sesi vapurdu. Şehrin bazen kendine bıraktığı o dar aralık çok iyi geliyor.", initials: "AK", tone: "gold", replies: 11, reposts: 7, likes: 198, audience: "following" },
  { id: "pazar-listesi", name: "Leyla Oruç", handle: "@leylaoruc", time: "3 sa", body: "Mahalle bostanında bu yıl ilk kez oturma yeri yaptık. Meğer insanlar domatese değil, gölgeye geliyormuş. Öğleden sonra boş sandalye kalmadı.", initials: "LO", tone: "teal", replies: 14, reposts: 12, likes: 267, audience: "all" },
  { id: "otobus-notu", name: "Öner Aktaş", handle: "@oneraktas", time: "4 sa", body: "Gece seferinin uygulamada görünmesi yetmiyor. Durağa gelince gerçekten geçip geçmediğini bilmek istiyorsun. İnsanlar bunu her gün yazıyor, hâlâ çözülmedi.", initials: "ÖA", tone: "gold", replies: 22, reposts: 38, likes: 416, audience: "all" },
  { id: "okul-yolu", name: "Aslı Güler", handle: "@asliguler", time: "4 sa", body: "Bugün okuldan dönerken kaldırımın yarısı motosikletle kapalıydı. Pusetle yol değiştirmek zorunda kalınca haritadaki 'kolay rota' lafı biraz komik kalıyor.", initials: "AG", tone: "coral", replies: 31, reposts: 46, likes: 588, audience: "all" },
  { id: "ses-haritasi", name: "Can Erdoğan", handle: "@canerdogan", time: "5 sa", body: "İzmir'de sabahın sesini kaydetmeye çıktım. Martıdan önce kepenk sesi geliyor. Sonra bir çay kaşığı, uzaktan bir tren, hepsi birbirine karışıyor.", initials: "CE", tone: "violet", replies: 9, reposts: 6, likes: 174, audience: "following" },
  { id: "acik-kaynak", name: "Kıvanç Sarı", handle: "@kivancsari", time: "5 sa", body: "Bir belediye veri setini indirmek için üç farklı PDF açtım. Sonunda dosyayı buldum, tarih 2022. Buna 'açık' demek biraz iyimserlik oluyor.", initials: "KS", tone: "ink", replies: 47, reposts: 92, likes: 781, audience: "all" },
  { id: "bank-meselesi", name: "Melis Kara", handle: "@meliskara", time: "6 sa", body: "Meydandaki yeni banklar fotoğrafta çok iyi duruyor. Oturunca sırtın arkadaki metal şeride denk geliyor. Tasarımın son beş dakikasında biri gerçekten oturmuş mu acaba?", initials: "MK", tone: "coral", replies: 19, reposts: 17, likes: 326, audience: "following" },
  { id: "kitap-donusu", name: "Derya Uzun", handle: "@deryauzun", time: "7 sa", body: "Kütüphaneye bugün üç kişi aynı kitabı sordu. Hiçbirine 'yok' demek istemedim. Küçük bir bekleme listesi açtık, bakalım insanlar birbirine not da bırakacak mı.", initials: "DU", tone: "teal", replies: 16, reposts: 8, likes: 241, audience: "all" },
  { id: "sokak-lambasi", name: "İrem Deniz", handle: "@iremdeniz", time: "8 sa", body: "Bir sokak lambası yanınca bütün rota değişiyor. Akşam eve yürürken bunu fark etmek için kent plancısı olmaya gerek yok, sadece biraz geç çıkmak yeterli.", initials: "İD", tone: "gold", replies: 28, reposts: 24, likes: 449, audience: "all" },
  { id: "sergi-uzun", name: "Pelin Soylu", handle: "@pelinnotlar", time: "9 sa", body: "Küçük sergilerde en sevdiğim şey, açılıştan bir gün sonra tekrar gitmek. Kalabalık gidiyor, işler kalıyor. Bazen ancak o zaman neye baktığını anlıyorsun.", initials: "PS", tone: "violet", replies: 12, reposts: 10, likes: 205, audience: "following" },
  { id: "bisiklet-kaldirimi", name: "Yağız Toprak", handle: "@yagiztoprak", time: "10 sa", body: "Bisiklet yolunun bittiği yerde 'devam et' tabelası var, yol yok. İnsan bunu görünce sinirlenmek yerine gülüyor. Sonra tabii yine sinirleniyor.", initials: "YT", tone: "ink", replies: 35, reposts: 63, likes: 694, audience: "all" },
];
const seedReplies: Post[] = [
  { id: "yanit-1", name: "Selin Uçak", handle: "@selinucak", time: "12 dk", body: "Okul çıkışı için ayrı bir rota bilgisi olsa çok iş görür. Çocukla yürürken iki sokak bile fazla gelebiliyor.", initials: "SU", tone: "teal", replies: 3, reposts: 4, likes: 76, audience: "all", replyTo: "İdil Aras", replyToId: "iklim-kent" },
  { id: "yanit-1a", name: "Ceren Yalçın", handle: "@cerenyaziyor", time: "9 dk", body: "Aynen. Bir de gölgelik var diye yolun güvenli olduğunu varsayıyoruz, oysa akşam başka bir mesele çıkıyor.", initials: "CY", tone: "coral", replies: 1, reposts: 0, likes: 19, audience: "all", replyTo: "Selin Uçak", replyToId: "yanit-1" },
  { id: "yanit-1b", name: "Efe Sönmez", handle: "@efe_s", time: "5 dk", body: "Rota verisini akşam aydınlatmasıyla birleştirmek mümkün. Mahalle bazında başlanırsa güncellemesi de daha kolay olur.", initials: "ES", tone: "gold", replies: 0, reposts: 1, likes: 12, audience: "all", replyTo: "Ceren Yalçın", replyToId: "yanit-1a" },
  { id: "yanit-2", name: "Bora Ekin", handle: "@boraekin", time: "7 dk", body: "Gece açık yer fikri önemli. Serinlik, güvenlik ve ulaşım aynı anda düşünülmezse plan kâğıt üstünde kalıyor.", initials: "BE", tone: "violet", replies: 1, reposts: 2, likes: 41, audience: "all", replyTo: "İdil Aras", replyToId: "iklim-kent" },
];
const seedReplyIds = seedReplies.map((post) => post.id);
function withLocalReplyCount(post: Post, allPosts: Post[]) {
  const localReplyCount = countNewRepliesForThread([...seedReplies, ...allPosts], post, seedReplyIds);
  return localReplyCount ? { ...post, replies: post.replies + localReplyCount } : post;
}
const seedMessages: Message[] = [{ id: "welcome", conversationId: "team", from: "them", body: "Bağlam özetini istersen konuşmanın başında aç. Kaynağa bakmak için iyi bir başlangıç oluyor." }];
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
function mixAvatarPresence(posts: Post[]) {
  const withPhoto = posts.filter((post) => !!portraitByInitials[post.initials]);
  const withoutPhoto = posts.filter((post) => !portraitByInitials[post.initials]);
  const sequence = [withPhoto, withoutPhoto, withPhoto, withoutPhoto, withoutPhoto];
  const cursors = new Map<Post[], number>([[withPhoto, 0], [withoutPhoto, 0]]);
  const mixed: Post[] = [];

  for (let index = 0; mixed.length < posts.length; index += 1) {
    const preferred = sequence[index % sequence.length];
    const fallback = preferred === withPhoto ? withoutPhoto : withPhoto;
    const pickFrom = cursors.get(preferred)! < preferred.length ? preferred : fallback;
    const cursor = cursors.get(pickFrom)!;
    if (cursor < pickFrom.length) {
      mixed.push(pickFrom[cursor]);
      cursors.set(pickFrom, cursor + 1);
    }
  }

  return mixed;
}
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
  const [composerImage, setComposerImage] = useState<ComposerImage | null>(null);
  const [composerPoll, setComposerPoll] = useState<Poll | null>(null);
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
  const mixedRootPosts = useMemo(() => mixAvatarPresence(rootPosts), [rootPosts]);
  const displayedPosts = useMemo(() => view === "bookmarks" ? bookmarkPosts : feedMode === "following" ? rootPosts.filter((post) => post.own || following.includes(post.handle)) : mixedRootPosts, [bookmarkPosts, feedMode, following, mixedRootPosts, rootPosts, view]);
  const startReply = (post: Post) => { const root = threadRootForPost([...seedReplies, ...posts], post); setSelectedPost(root); setReplyingTo(post); setContextOpen(true); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); window.setTimeout(() => document.getElementById("thread-reply-input")?.focus(), 120); };
  const openDetail = (post: Post) => { const root = threadRootForPost([...seedReplies, ...posts], post); setSelectedPost(root); setContextOpen(true); setView("detail"); window.scrollTo({ top: 0, behavior: "smooth" }); };
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
    event.preventDefault(); const body = composerText.trim(); const pollQuestion = composerPoll?.question.trim() ?? ""; const pollOptions = composerPoll?.options.map((option) => option.trim()).filter(Boolean) ?? [];
    if (!body && !pollQuestion) { setNotice("Önce bir düşünce ya da anket sorusu ekle."); return; }
    if (composerPoll && (!pollQuestion || pollOptions.length < 2)) { setNotice("Anket için bir soru ve en az iki seçenek ekle."); return; }
    const replyTarget = replyingTo;
    const post: Post = { id: "yerel-" + Date.now(), name: profile.name, handle: profile.handle, time: "şimdi", body: replyTarget && body ? replyTarget.handle + " " + body : body, initials: profile.initials, tone: "ink", replies: 0, reposts: 0, likes: 0, audience: "following", replyTo: replyTarget?.name, replyToId: replyTarget?.id, image: composerImage?.src, imageAlt: composerImage ? "Yüklenen görsel: " + composerImage.name : undefined, poll: composerPoll ? { question: pollQuestion, options: pollOptions } : undefined, own: true };
    setDraftPosts((current) => [post, ...current]); setComposerText(""); setComposerImage(null); setComposerPoll(null); setReplyingTo(null); setComposerOpen(false);
    if (replyTarget) { awardTask("reply", 15); setNotice("Yanıtın konuşmaya eklendi."); setView("detail"); }
    else { awardTask("post", 25); setNotice("Gönderi Ana Sayfa'ya eklendi."); setView("feed"); }
  }
  function publishGuidedContribution(body: string, replyTarget: Post) {
    const contribution = body.trim();
    if (!contribution) { setNotice("Katkını paylaşmadan önce kısa bir düşünce ekle."); return; }
    const post: Post = { id: "derinlik-" + Date.now(), name: profile.name, handle: profile.handle, time: "şimdi", body: replyTarget.handle + " " + contribution, initials: profile.initials, tone: "ink", replies: 0, reposts: 0, likes: 0, audience: "following", replyTo: replyTarget.name, replyToId: replyTarget.id, own: true };
    const root = threadRootForPost([...seedReplies, ...posts], replyTarget);
    setDraftPosts((current) => [post, ...current]); awardTask("deep-contribution", 20); setSelectedPost(root); setContextOpen(true); setNotice("Katkın konuşmaya eklendi; +20 NSosyal puanı kazandın."); setView("detail");
  }
  function selectComposerImage(file: File | null) { if (!file) return; if (!file.type.startsWith("image/")) { setNotice("Yalnızca görsel dosyaları ekleyebilirsin."); return; } const reader = new FileReader(); reader.onload = () => { const src = String(reader.result ?? ""); if (src) { setComposerImage({ src, name: file.name }); setNotice("Görsel eklendi."); } }; reader.readAsDataURL(file); }
  function toggleComposerPoll() { setComposerPoll((current) => current ? null : { question: "", options: ["", ""] }); }
  function deleteOwnPost(post: Post) { setMods((current) => ({ ...current, deleted: removeItem(current.deleted, post.id), pinned: current.pinned === post.id ? null : current.pinned })); setMorePost(null); setSelectedPost(null); setNotice("Gönderin bu cihazdaki ana sayfadan kaldırıldı."); setView("feed"); }
  function togglePin(post: Post) { setMods((current) => ({ ...current, pinned: togglePinned(current.pinned, post.id) })); setMorePost(null); setNotice(mods.pinned === post.id ? "Gönderi sabitlemeden kaldırıldı." : "Gönderi profiline sabitlendi."); }
  function resetDemo() {
    ["nsosyal-actions", "nsosyal-mods", "nsosyal-drafts", "nsosyal-profile", "nsosyal-following", "nsosyal-messages", "nsosyal-read-notifications", "nsosyal-gamification"].forEach((key) => window.localStorage.removeItem(key));
    setActions({ likes: [], reposts: [], bookmarks: [] }); setMods({ deleted: [], pinned: null }); setDraftPosts([]); setProfile(demoProfile); setGamification(defaultGamification); setFollowing(["@bariskoral"]); setMessages(seedMessages); setReadNotifications([]); setTheme("dark"); setNotice("Demo başlangıç durumuna döndü."); setView("feed");
  }
  const title = view === "contribute" ? "Katkı" : view === "bookmarks" ? "Yer İmleri" : view === "explore" ? "Keşfet" : view === "notifications" ? "Bildirimler" : view === "messages" ? "Mesajlar" : view === "profile" ? "Profil" : "Ana Sayfa";
  const feedProps: Omit<FeedProps, "posts" | "morePost"> = { allPosts: posts, actions, pinned: mods.pinned, following, points: gamification.points, onAction: updateAction, onReply: startReply, onDetail: openDetail, onProfile: openProfile, onQuote: quotePost, onShare: sharePost, onMore: setMorePost, onMedia: setMediaPost, onDelete: deleteOwnPost, onPin: togglePin, onFollow: toggleFollow };
  const isOwnProfile = !profilePost || profilePost.own;
  const visibleProfile: Profile = profilePost && !profilePost.own ? profilesByHandle[profilePost.handle] ?? { name: profilePost.name, handle: profilePost.handle, initials: profilePost.initials, bio: "Mahallede olup biteni ve aklına takılanları buraya not ediyor.", location: "Türkiye", cover: "/demo/kent-serinligi.png" } : profile;
  const profilePosts = useMemo(() => profilePost && !profilePost.own ? posts.filter((post) => post.handle === profilePost.handle) : posts, [profilePost, posts]);

  return <main className="app-shell">
    <a className="skip-link" href="#main-content">Ana içeriğe geç</a>
<Sidebar view={view} setView={setView} profile={profile} unread={3 - readNotifications.length} onOwnProfile={openOwnProfile} onCompose={openComposer} onSearch={openSearch} />
    <section className="timeline" aria-label={title}>
       <header className={"topbar " + (headerCompact ? "is-compact " : "") + (view === "detail" ? "is-detail" : "")}><button className="top-menu" onClick={() => setCompactMenuOpen(true)} aria-label="Yan menüyü aç"><UiIcon name="menu" /></button>{view === "detail" ? <button className="back-button" onClick={() => { setReplyingTo(null); setView("feed"); }} aria-label="Ana Sayfaya dön"><UiIcon name="arrow-left" /></button> : <button className="mobile-profile-button" onClick={openOwnProfile} aria-label={profile.initials + ", profilini aç"}><Avatar initials={profile.initials} tone="ink" /></button>}<span className="mobile-brand"><BrandMark small /><span className="sr-only">NSosyal</span></span><span className="topbar-center-brand"><BrandMark /><span className="sr-only">NSosyal ana sayfa</span></span><div className="topbar-heading"><span className="topbar-context">NSosyal</span><h1>{view === "detail" ? "Gönderi" : title}</h1></div><button className="top-action top-action-theme" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label="Temayı değiştir"><UiIcon name={theme === "light" ? "moon" : "sun"} /></button><button className="top-action top-action-search" onClick={openSearch} aria-label="Aramayı aç"><UiIcon name="search" /></button></header>
       <div id="main-content" className="content-area">
         {view === "detail" && selectedPost && <div className="detail-backbar"><button className="back-button" onClick={() => { setReplyingTo(null); setView("feed"); }} aria-label="Ana Sayfaya dön"><UiIcon name="arrow-left" /></button><strong>Gönderi</strong></div>}
         {view === "feed" && <><div className="feed-tabs" role="tablist" aria-label="Ana Sayfa seçimi"><button role="tab" aria-selected={feedMode === "for-you"} className={feedMode === "for-you" ? "selected" : ""} onClick={() => setFeedMode("for-you")}>Sana Özel</button><button role="tab" aria-selected={feedMode === "following"} className={feedMode === "following" ? "selected" : ""} onClick={() => setFeedMode("following")}>Takip Ettiklerin</button></div><Feed {...feedProps} posts={displayedPosts} morePost={morePost} showContributionPrompt={feedMode === "for-you"} onContribution={() => setView("contribute")} /></>}
         {view === "contribute" && <ContributionHub posts={rootPosts} onPublish={publishGuidedContribution} onCompose={openComposer} />}
        {view === "detail" && selectedPost && <ThreadDetail {...feedProps} post={selectedPost} morePost={morePost} allPosts={posts} contextOpen={contextOpen} setContextOpen={setContextOpen} composerText={composerText} setComposerText={setComposerText} composerImage={composerImage} onImageSelect={selectComposerImage} clearImage={() => setComposerImage(null)} composerPoll={composerPoll} setComposerPoll={setComposerPoll} toggleComposerPoll={toggleComposerPoll} replyingTo={replyingTo} clearReply={() => setReplyingTo(null)} onSubmit={createPost} />}
        {view === "explore" && <Explore {...feedProps} posts={posts} search={search} setSearch={setSearch} />}
        {view === "notifications" && <Notifications read={readNotifications} setRead={setReadNotifications} onOpen={openDetail} />}
        {view === "messages" && <Messages messages={messages} setMessages={setMessages} profile={profile} target={messageTarget} />}
        {view === "bookmarks" && <><div className="view-intro"><p>Kaydettiğin konuşmalar burada, bu cihazda kalır.</p></div>{displayedPosts.length ? <Feed {...feedProps} posts={displayedPosts} morePost={morePost} /> : <EmptyState title="Henüz yer imi yok" copy="İlginç bir gönderiyi sonra dönmek için kaydedebilirsin." />}</>}
        {view === "profile" && <Profile {...feedProps} profile={visibleProfile} isOwn={isOwnProfile} posts={profilePosts} morePost={morePost} points={gamification.points} gamification={gamification} onEdit={() => setEditingProfile(true)} onSettings={() => setView("settings")} onMessage={openMessages} onPoints={() => setMilestonesOpen(true)} />}
        {view === "settings" && <Settings theme={theme} setTheme={setTheme} onReset={resetDemo} />}
      </div>
    </section>
    <aside className="right-rail" aria-label="Gündem ve öneriler"><div className="search-field"><span aria-hidden="true"><UiIcon name="search" /></span><input aria-label="NSosyal ara" placeholder="NSosyal ara" value={search} onChange={(event) => { setSearch(event.target.value); setView("explore"); }} /></div><TrendPanel onSelect={(topic) => { setSearch(topic); setView("explore"); }} /><WhoToFollow following={following} onFollow={toggleFollow} /><p className="legal">Koşullar · Gizlilik · Çerezler<br />NSosyal 2026</p></aside>
    <MobileNav view={view} setView={setView} unread={3 - readNotifications.length} composeHidden={composeHidden} onSearch={openSearch} onCompose={openComposer} />
    <button className={"desktop-compose-fab " + (composeHidden ? "is-hidden" : "")} onClick={openComposer} aria-label="Yeni gönderi paylaş" tabIndex={composeHidden ? -1 : 0}><UiIcon name="plus" /></button>
    {shareFeedback && <div className="toast" role="status">{shareFeedback}</div>}
    {composerOpen && <ComposeModal text={composerText} setText={setComposerText} image={composerImage} onImageSelect={selectComposerImage} clearImage={() => setComposerImage(null)} poll={composerPoll} setPoll={setComposerPoll} togglePoll={toggleComposerPoll} replyingTo={replyingTo} clearReply={() => setReplyingTo(null)} onSubmit={createPost} onClose={() => setComposerOpen(false)} />}
    {compactMenuOpen && <CompactDesktopMenu view={view} setView={setView} theme={theme} setTheme={setTheme} profile={profile} onClose={() => setCompactMenuOpen(false)} onOwnProfile={openOwnProfile} onCompose={openComposer} onSearch={openSearch} />}
    {morePost && <MoreMenu post={morePost} isPinned={mods.pinned === morePost.id} followed={following.includes(morePost.handle)} onClose={() => setMorePost(null)} onDelete={deleteOwnPost} onPin={togglePin} onFollow={toggleFollow} onShare={sharePost} onQuote={quotePost} />}
    {mobileMoreOpen && <MobileMoreMenu onClose={() => setMobileMoreOpen(false)} onProfile={openOwnProfile} onBookmarks={() => { setMobileMoreOpen(false); setView("bookmarks"); }} onSettings={() => { setMobileMoreOpen(false); setView("settings"); }} />}
    {mediaPost && <MediaPreview post={mediaPost} onClose={() => setMediaPost(null)} />}
    {editingProfile && <ProfileEditor profile={profile} onClose={() => setEditingProfile(false)} onSave={(next) => { setProfile(next); setEditingProfile(false); setNotice("Profilin güncellendi."); }} />}
    {milestonesOpen && <MilestoneSheet points={gamification.points} onClose={() => setMilestonesOpen(false)} />}
  </main>;
}

function BrandMark({ small = false }: { small?: boolean }) { return <span className={"brand-mark " + (small ? "small" : "")} aria-hidden="true">{small ? <img src="/brand/nsosyal-favicon.svg" alt="" /> : <><img className="logo-for-dark" src="/brand/nsosyal-source-era-logo-dark.svg" alt="" /><img className="logo-for-light" src="/brand/nsosyal-source-era-logo-light.svg" alt="" /></>}</span>; }
function Avatar({ initials, tone }: { initials: string; tone: string }) { const photo = portraitByInitials[initials]; return <span className={"avatar " + tone + (photo ? " has-photo" : "")}>{photo ? <img src={photo} alt="" /> : initials}</span>; }

type ContributionIntent = { id: string; label: string; helper: string; prompt: string; icon: UiIconName };
const contributionIntents: ContributionIntent[] = [
  { id: "experience", label: "Kendi deneyimini ekle", helper: "Konunun hayatta nasıl göründüğünü anlat", prompt: "Bunu ben de yaşadım: ", icon: "check" },
  { id: "proposal", label: "Somut bir adım öner", helper: "Yapılabilir, net bir öneri bırak", prompt: "Bunu ilerletmek için şu adım atılabilir: ", icon: "spark" },
  { id: "source", label: "Kaynak veya veri ekle", helper: "Okuma, bağlantı ya da sayı paylaş", prompt: "Bu noktayı destekleyen kaynak: ", icon: "quote" },
];

function ContributionHub({ posts, onPublish, onCompose }: { posts: Post[]; onPublish: (body: string, target: Post) => void; onCompose: () => void }) {
  const candidates = posts.slice(0, 3);
  const [targetId, setTargetId] = useState("");
  const [intent, setIntent] = useState<ContributionIntent | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const target = candidates.find((post) => post.id === targetId) ?? candidates[0];
  const selectIntent = (next: ContributionIntent) => { setIntent(next); setStatus(next.label + " seçildi. Düşünceni kısa ve somut tut."); };
  const publish = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!target) { setStatus("Önce konuşmak istediğin gönderiyi seç."); return; } if (!intent) { setStatus("Katkının türünü seç."); return; } const replyBody = draft.trim(); if (!replyBody) { setStatus("Katkını 1–2 cümleyle yaz."); return; } onPublish(replyBody, target); };

  return <section className="contribution-view" aria-labelledby="contribution-title"><header className="contribution-hero"><span className="contribution-hero-mark" aria-hidden="true"><UiIcon name="spark" /></span><span><p>Katkı alanı</p><h2 id="contribution-title">Konuşmayı ileri taşı</h2><small>Bir konuşmayı seç, ne eklediğini belirt ve düşünceni doğrudan o tartışmaya bağla.</small></span><button type="button" className="contribution-plain" onClick={onCompose}>Yeni gönderi yaz</button></header><form className="contribution-form" onSubmit={publish}><fieldset className="contribution-step"><legend><span>1</span> Konuşmayı seç</legend><div className="contribution-targets">{candidates.map((post) => { const excerpt = post.body.length > 112 ? post.body.slice(0, 109) + "…" : post.body; return <button type="button" className={target?.id === post.id ? "is-selected" : ""} aria-pressed={target?.id === post.id} key={post.id} onClick={() => { setTargetId(post.id); setStatus(post.name + " ile başlayan konuşma seçildi."); }}><Avatar initials={post.initials} tone={post.tone} /><span><b>{post.name}</b><small>{formatNumber(post.replies)} yanıt · {post.time}</small><p>{excerpt}</p></span></button>; })}</div></fieldset><fieldset className="contribution-step"><legend><span>2</span> Ne ekliyorsun?</legend><div className="contribution-intents">{contributionIntents.map((item) => <button type="button" key={item.id} className={intent?.id === item.id ? "is-selected" : ""} aria-pressed={intent?.id === item.id} onClick={() => selectIntent(item)}><UiIcon name={item.icon} /><span><b>{item.label}</b><small>{item.helper}</small></span></button>)}</div></fieldset>{target && intent && <section className="contribution-draft"><header><span><b>{target.name}</b> ile başlayan konuşmaya ekliyorsun</span><small>{intent.label}</small></header><label htmlFor="contribution-draft">Katkını yaz</label><textarea id="contribution-draft" value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 280))} placeholder={intent.prompt} maxLength={280} aria-describedby="contribution-draft-hint" /><footer><small id="contribution-draft-hint">Doğrudan bağlantılı yorum olarak görünür · {draft.length}/280</small><button className="primary-button" type="submit" disabled={!draft.trim()}>Konuşmaya ekle</button></footer></section>}<p className="contribution-status" role="status" aria-live="polite">{status}</p></form></section>;
}
function Sidebar({ view, setView, profile, unread, onCompose, onOwnProfile, onSearch }: { view: View; setView: (view: View) => void; profile: Profile; unread: number; onCompose: () => void; onOwnProfile: () => void; onSearch: () => void }) { const openHome = () => { setView("feed"); window.scrollTo({ top: 0, behavior: "smooth" }); }; return <aside className="sidebar" aria-label="Ana gezinme"><button className="brand" onClick={openHome} aria-label="NSosyal ana sayfa"><BrandMark /><span className="sr-only">NSosyal</span></button><nav className="nav-list">{navigation.map((item) => <button key={item.id} className={"nav-item " + (view === item.id || (view === "detail" && item.id === "feed") ? "is-active" : "")} onClick={() => item.id === "profile" ? onOwnProfile() : item.id === "feed" ? openHome() : item.id === "explore" ? onSearch() : setView(item.id)}><span className="nav-icon" aria-hidden="true"><UiIcon name={item.icon} /></span><span>{item.label}</span>{item.id === "notifications" && unread > 0 && <b className="nav-dot">{unread}</b>}</button>)}<button className={"nav-item " + (view === "settings" ? "is-active" : "")} onClick={() => setView("settings")} aria-label="Daha Fazla"><span className="nav-icon" aria-hidden="true"><UiIcon name="settings" /></span><span>Daha Fazla</span></button></nav><button className="primary-button sidebar-compose" onClick={onCompose} aria-label="Yeni gönderi paylaş"><span className="desktop-only">Paylaş</span><span className="mobile-only" aria-hidden="true"><UiIcon name="spark" /></span></button><button className="mini-profile" onClick={onOwnProfile}><Avatar initials={profile.initials} tone="ink" /><span><strong>{profile.name}</strong><small>{profile.handle}</small></span><b aria-hidden="true"><UiIcon name="more" /></b></button></aside>; }
function MobileNav({ view, setView, unread, composeHidden, onSearch, onCompose }: { view: View; setView: (view: View) => void; unread: number; composeHidden: boolean; onSearch: () => void; onCompose: () => void }) { const openHome = () => { setView("feed"); window.scrollTo({ top: 0, behavior: "smooth" }); }; const mobileItems = navigation.slice(0, 4); return <nav className={"bottom-nav " + (composeHidden ? "is-compact" : "")} aria-label="Mobil gezinme">{mobileItems.map((item) => <button key={item.id} className={view === item.id ? "is-active" : ""} onClick={() => item.id === "feed" ? openHome() : item.id === "explore" ? onSearch() : setView(item.id)} aria-current={view === item.id ? "page" : undefined} aria-label={item.label}><UiIcon name={item.icon} />{item.id === "notifications" && unread > 0 && <b />}</button>)}<button type="button" className={"bottom-compose " + (composeHidden ? "is-hidden" : "")} onClick={onCompose} aria-label="Yeni gönderi oluştur"><UiIcon name="plus" /></button></nav>; }
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
function ComposeModal({ text, setText, image, onImageSelect, clearImage, poll, setPoll, togglePoll, replyingTo, clearReply, onSubmit, onClose }: { text: string; setText: (value: string) => void; image: ComposerImage | null; onImageSelect: (file: File | null) => void; clearImage: () => void; poll: Poll | null; setPoll: (poll: Poll | null) => void; togglePoll: () => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  return <div className="modal-backdrop compose-backdrop"><section ref={dialogRef} className="compose-modal" role="dialog" aria-modal="true" aria-label="Yeni gönderi oluştur" tabIndex={-1}><header><strong>Yeni gönderi</strong><button type="button" onClick={onClose} aria-label="Gönderi oluşturmayı kapat"><UiIcon name="close" /></button></header><Composer text={text} setText={setText} image={image} onImageSelect={onImageSelect} clearImage={clearImage} poll={poll} setPoll={setPoll} togglePoll={togglePoll} replyingTo={replyingTo} clearReply={clearReply} onSubmit={onSubmit} /></section></div>;
}
function Composer({ text, setText, image, onImageSelect, clearImage, poll, setPoll, togglePoll, replyingTo, clearReply, onSubmit, inputId = "compose-input" }: { text: string; setText: (value: string) => void; image: ComposerImage | null; onImageSelect: (file: File | null) => void; clearImage: () => void; poll: Poll | null; setPoll: (poll: Poll | null) => void; togglePoll: () => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; inputId?: string }) {
  const [emojiOpen, setEmojiOpen] = useState(false); const imageInputRef = useRef<HTMLInputElement>(null); const emojis = ["👍", "💡", "❤️", "👏", "✨", "🤝", "🌿", "📌"]; const updatePoll = (change: (current: Poll) => Poll) => { if (poll) setPoll(change(poll)); };
  return <form className="composer" onSubmit={onSubmit}><Avatar initials="DN" tone="ink" /><div className="composer-body">{replyingTo && <div className="replying">Şunu yanıtlıyorsun: <b>{replyingTo.name}</b><button type="button" onClick={clearReply} aria-label="Yanıtı iptal et"><UiIcon name="close" /></button></div>}<label className="sr-only" htmlFor={inputId}>Yeni gönderi yaz</label><textarea id={inputId} value={text} onChange={(event) => setText(event.target.value.slice(0, 280))} placeholder={replyingTo ? "Yanıtını yaz" : "Ne paylaşmak istersin?"} rows={2} /><input ref={imageInputRef} className="sr-only" type="file" accept="image/*" onChange={(event) => { onImageSelect(event.currentTarget.files?.[0] ?? null); event.currentTarget.value = ""; }} />{image && <figure className="composer-image"><img src={image.src} alt="Seçilen görsel önizlemesi" /><figcaption><span><b>{image.name}</b><small>Gönderiyle birlikte paylaşılacak</small></span><button type="button" onClick={clearImage} aria-label="Görseli kaldır"><UiIcon name="close" /></button></figcaption></figure>}{poll && <fieldset className="composer-poll"><legend>Anket</legend><label>Anket sorusu<input value={poll.question} maxLength={120} onChange={(event) => updatePoll((current) => ({ ...current, question: event.target.value }))} placeholder="Neyi merak ediyorsun?" /></label>{poll.options.map((option, index) => <label key={index}>Seçenek {index + 1}<span><input value={option} maxLength={80} onChange={(event) => updatePoll((current) => ({ ...current, options: current.options.map((value, position) => position === index ? event.target.value : value) }))} placeholder={index === 0 ? "İlk seçenek" : "Diğer seçenek" } />{poll.options.length > 2 && <button type="button" onClick={() => updatePoll((current) => ({ ...current, options: current.options.filter((_, position) => position !== index) }))} aria-label={(index + 1) + ". seçeneği kaldır"}><UiIcon name="close" /></button>}</span></label>)}<button className="poll-option-add" type="button" disabled={poll.options.length >= 4} onClick={() => updatePoll((current) => ({ ...current, options: [...current.options, ""] }))}><UiIcon name="plus" /> Seçenek ekle</button></fieldset>}<div className="compose-footer"><div className="compose-tools" aria-label="Gönderi ekleri"><button type="button" onClick={() => imageInputRef.current?.click()} aria-label="Fotoğraf yükle"><UiIcon name="media" /></button><button type="button" className={poll ? "is-active" : ""} onClick={togglePoll} aria-pressed={Boolean(poll)} aria-label={poll ? "Anketi kaldır" : "Anket oluştur"}><UiIcon name="poll" /></button><span className="emoji-tool"><button type="button" className={emojiOpen ? "is-active" : ""} onClick={() => setEmojiOpen((open) => !open)} aria-expanded={emojiOpen} aria-label="Emoji ekle"><UiIcon name="mood" /></button>{emojiOpen && <span className="emoji-menu" role="group" aria-label="Emoji seç">{emojis.map((emoji) => <button type="button" key={emoji} onClick={() => { setText((text + emoji).slice(0, 280)); setEmojiOpen(false); }} aria-label={emoji + " ekle"}>{emoji}</button>)}</span>}</span></div><span className={text.length > 250 ? "limit near" : "limit"}>{280 - text.length}</span><button className="primary-button small-button" type="submit">Paylaş</button></div></div></form>;
}

type FeedProps = { posts: Post[]; allPosts: Post[]; actions: Actions; pinned: string | null; morePost: Post | null; following: string[]; points: number; showContributionPrompt?: boolean; onContribution?: () => void; onAction: (kind: keyof Actions, id: string) => void; onReply: (post: Post) => void; onDetail: (post: Post) => void; onProfile: (post: Post) => void; onQuote: (post: Post) => void; onShare: (post: Post) => void; onMore: (post: Post | null) => void; onMedia: (post: Post) => void; onDelete: (post: Post) => void; onPin: (post: Post) => void; onFollow: (handle: string) => void; };
function Feed(props: FeedProps) { return <div className="post-list">{props.posts.map((post, index) => { const displayPost = withLocalReplyCount(post, props.allPosts); return <Fragment key={post.id}><PostCard {...props} post={displayPost} />{props.showContributionPrompt && index === 0 && props.onContribution && <InlineContributionPrompt onOpen={props.onContribution} />}</Fragment>; })}</div>; }
function InlineContributionPrompt({ onOpen }: { onOpen: () => void }) { return <section className="inline-contribution" aria-label="Konuşmaya katkı yap"><span className="inline-contribution-mark" aria-hidden="true"><UiIcon name="spark" /></span><div className="inline-contribution-copy"><h2>Konuşmaya katkı yap</h2><p>Bir fikri, öneriyi ya da kaynağı doğrudan ilgili konuşmaya bağla.</p></div><button className="inline-contribution-cta" type="button" onClick={onOpen}>Katkı yap <UiIcon name="arrow-right" /></button></section>; }
type ThreadReplyNode = { post: Post; children: ThreadReplyNode[] };
function ThreadReplyBranch({ node, depth, allPosts, feedProps }: { node: ThreadReplyNode; depth: number; allPosts: Post[]; feedProps: FeedProps }) { return <div className="thread-reply-node" data-depth={depth}><PostCard {...feedProps} threaded hasChildReplies={node.children.length > 0} post={withLocalReplyCount(node.post, allPosts)} />{node.children.length > 0 && <div className="thread-children">{node.children.map((child) => <ThreadReplyBranch key={child.post.id} node={child} depth={depth + 1} allPosts={allPosts} feedProps={feedProps} />)}</div>}</div>; }
function ThreadReplies({ nodes, allPosts, ...rest }: FeedProps & { nodes: ThreadReplyNode[] }) { const feedProps = { ...rest, allPosts } as FeedProps; const countNodes = (branches: ThreadReplyNode[]): number => branches.reduce((total, branch) => total + 1 + countNodes(branch.children), 0); const replyCount = countNodes(nodes); return <section className="thread-replies" aria-labelledby="thread-replies-title"><h2 id="thread-replies-title">Yorumlar <span>{replyCount}</span></h2><div className="thread-reply-tree">{nodes.map((node) => <ThreadReplyBranch key={node.post.id} node={node} depth={0} allPosts={allPosts} feedProps={feedProps} />)}</div></section>; }
function PostPoll({ poll }: { poll: Poll }) { const [selected, setSelected] = useState<number | null>(null); const [votes, setVotes] = useState(() => poll.options.map((_, index) => 8 + index * 5)); const total = votes.reduce((sum, vote) => sum + vote, 0) || 1; const choose = (next: number) => { if (next === selected) return; setVotes((current) => current.map((vote, index) => vote + (index === next ? 1 : index === selected ? -1 : 0))); setSelected(next); }; return <section className="post-poll" aria-label={"Anket: " + poll.question}><p>{poll.question}</p><div>{poll.options.map((option, index) => <button key={option + index} type="button" className={selected === index ? "selected" : ""} aria-pressed={selected === index} onClick={() => choose(index)}><span>{option}</span><small>{Math.round((votes[index] / total) * 100)}%</small></button>)}</div><footer>{selected === null ? "Oyunu seçerek sonucu gör" : "Oyun kaydedildi"} <span>· {formatNumber(total)} oy</span></footer></section>; }
function PostCard({ post, actions, pinned, following, points, onAction, onReply, onDetail, onProfile, onShare, onMore, onMedia, onFollow, threaded = false, hasChildReplies = false }: FeedProps & { post: Post; threaded?: boolean; hasChildReplies?: boolean }) {
  const liked = actions.likes.includes(post.id), reposted = actions.reposts.includes(post.id), saved = actions.bookmarks.includes(post.id);
  const authorPoints = post.own ? points : authorPointsByHandle[post.handle] ?? 0;
  const authorBadge = getPointsBadge(authorPoints);
  const showThreadRail = threaded ? hasChildReplies : post.replies > 0;
  return <article className={"post " + (showThreadRail ? "has-thread" : "")}>
    {pinned === post.id && <p className="pin-status"><UiIcon name="pin" /> Profilde sabitlendi</p>}
    <button className="avatar-button" onClick={(event) => runExclusive(event, () => onProfile(post))} aria-label={post.initials + ", " + post.name + " profilini aç"}><Avatar initials={post.initials} tone={post.tone} /></button>
    <div className="post-content">
      {(post.repostedByMe || post.repostedBy) && <p className="repost-status" aria-label={(post.repostedByMe ? "Sen" : post.repostedBy) + " tarafından yeniden paylaşılan gönderi"}><ActionIcon name="repost" /> {post.repostedByMe ? "Yeniden paylaştın" : post.repostedBy + " yeniden paylaştı"}</p>}
      <div className="post-meta"><button className="name" onClick={(event) => runExclusive(event, () => onProfile(post))}>{post.name}</button><span className={"points-badge " + authorBadge.tone} title={authorBadge.label + ": " + authorPoints + " puan"} aria-label={authorBadge.label + ", " + authorPoints + " puan"}>{authorBadge.mark}</span><span>{post.handle}</span><span>·</span><button className="time" onClick={() => onDetail(post)}>{post.time}</button>{!post.own && <button className="post-follow" aria-label={following.includes(post.handle) ? post.handle + " takibini bırak" : post.handle + " kişisini takip et"} aria-pressed={following.includes(post.handle)} onClick={(event) => runExclusive(event, () => onFollow(post.handle))}><UiIcon name={following.includes(post.handle) ? "check" : "plus"} /><span className="sr-only">{following.includes(post.handle) ? "Takip ediliyor" : "Takip et"}</span></button>}<button className="more" aria-label="Gönderi seçeneklerini aç" onClick={(event) => runExclusive(event, () => onMore(post))}><UiIcon name="more" /></button></div>
      {post.replyTo && <p className="reply-context">{post.replyTo} adlı kişiye yanıt olarak</p>}
      {post.repostQuote && <blockquote className="repost-quote">{post.repostQuote}</blockquote>}
      {post.body && <button className="post-body" onClick={() => onDetail(post)} aria-label={post.body + " — gönderi ayrıntılarını aç"}>{post.body}</button>}
      {post.poll && <PostPoll poll={post.poll} />}
      {post.image && <button className="post-photo" onClick={(event) => runExclusive(event, () => onMedia(post))} aria-label={(post.imageAlt ?? "Görsel") + " önizlemesini aç"}><img src={post.image} alt={post.imageAlt ?? ""} /><span>Görseli aç</span></button>}
      {post.attachment === "signal" && !post.image && <button className="signal-card media-card" onClick={(event) => runExclusive(event, () => onMedia(post))}><span className="signal-art" aria-hidden="true"><i /><i /><i /></span><span className="signal-caption"><span>Kent notları</span><b>Şehir serinliği notları</b><small>Görsel önizlemeyi aç</small></span><em aria-hidden="true"><UiIcon name="arrow-right" /></em></button>}
      {post.attachment === "note" && !post.image && <button className="note-card" onClick={(event) => runExclusive(event, () => onMedia(post))}><span>Okuma notu</span><b>Yerel veriyi ortak bir dilde buluşturmak</b><small>Önizlemeyi aç · 4 dk okuma</small></button>}
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
type ThreadDetailProps = Omit<FeedProps, "posts" | "morePost" | "allPosts"> & { post: Post; morePost: Post | null; allPosts: Post[]; contextOpen: boolean; setContextOpen: (value: boolean) => void; composerText: string; setComposerText: (value: string) => void; composerImage: ComposerImage | null; onImageSelect: (file: File | null) => void; clearImage: () => void; composerPoll: Poll | null; setComposerPoll: (poll: Poll | null) => void; toggleComposerPoll: () => void; replyingTo: Post | null; clearReply: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void };
function ThreadDetail(props: ThreadDetailProps) {
  const merged = Array.from(new Map([...seedReplies, ...props.allPosts].map((post) => [post.id, post])).values());
  const replyTree = threadedRepliesForRoot(merged, props.post) as ThreadReplyNode[];
  const displayPost = withLocalReplyCount(props.post, props.allPosts);
  return <div className="thread-view"><PostCard {...props} posts={props.allPosts} post={displayPost} />{props.post.context && <section className="context-summary" aria-label="Bağlam özeti"><button className="context-toggle" onClick={() => props.setContextOpen(!props.contextOpen)} aria-expanded={props.contextOpen}><span><i aria-hidden="true"><UiIcon name="spark" /></i><b>Bağlam Özeti</b><small>Bu konuşmada öne çıkanlar</small></span><span aria-hidden="true"><UiIcon name={props.contextOpen ? "arrow-left" : "arrow-right"} /></span></button>{props.contextOpen && <div className="summary-content"><ul>{contextBullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul><p>NSosyal yapay zekâ özeti <span>·</span> Hata içerebilir.</p></div>}</section>}{props.replyingTo ? <Composer text={props.composerText} setText={props.setComposerText} image={props.composerImage} onImageSelect={props.onImageSelect} clearImage={props.clearImage} poll={props.composerPoll} setPoll={props.setComposerPoll} togglePoll={props.toggleComposerPoll} replyingTo={props.replyingTo} clearReply={props.clearReply} onSubmit={props.onSubmit} inputId="thread-reply-input" /> : <div className="thread-reply"><Avatar initials="DN" tone="ink" /><button onClick={() => props.onReply(props.post)}>Yanıtını yaz</button></div>}{replyTree.length ? <ThreadReplies {...props} nodes={replyTree} /> : <EmptyState title="Konuşma burada sakin" copy="İlk düşünceni paylaşarak bu gönderiyi büyütebilirsin." />}</div>;
}
function Explore(props: Omit<FeedProps, "posts" | "morePost"> & { search: string; setSearch: (value: string) => void; posts: Post[] }) { const visible = props.posts.filter((post) => (post.name + " " + post.body).toLocaleLowerCase("tr").includes(props.search.toLocaleLowerCase("tr"))); return <div className="explore-view"><div className="explore-search"><span aria-hidden="true"><UiIcon name="search" /></span><input value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="Kişi ya da konu ara" aria-label="Kişi ya da konu ara" /></div>{props.search ? <><h2>Arama sonuçları</h2>{visible.length ? <div className="search-results"><Feed {...props} posts={visible} morePost={null} /></div> : <EmptyState title="Bir sonuç bulamadık" copy="Başka bir kelimeyle aramayı dene." />}</> : <><h2>Bugün konuşulanlar</h2><TrendPanel full onSelect={props.setSearch} /><section className="editor-pick"><p>Editörün seçimi</p><button onClick={() => props.onDetail(seedPosts[0])}><span className="editor-ripple"><i /><i /></span><span><b>Şehir nasıl serin kalır?</b><small>İklim ve kamusal alan üzerine açık konuşma</small></span><em aria-hidden="true"><UiIcon name="arrow-right" /></em></button></section></>}</div>; }
function Notifications({ read, setRead, onOpen }: { read: string[]; setRead: (value: string[]) => void; onOpen: (post: Post) => void }) { const [filter, setFilter] = useState<"all" | "unread">("all"); const items = [{ id: "selin", post: seedPosts[0], avatar: <Avatar initials="SU" tone="teal" />, copy: <><b>Selin Uçak</b> seninle aynı serin rota fikrini konuşuyor.</> }, { id: "veri", post: seedPosts[2], avatar: <span className="notification-stack"><Avatar initials="AV" tone="teal" /><Avatar initials="MS" tone="violet" /></span>, copy: <><b>Açık Veri Günlüğü</b> ve 12 kişi kaydettiğin notu beğendi.</> }, { id: "secim", post: seedPosts[1], avatar: <span className="spark"><UiIcon name="spark" /></span>, copy: <><b>NSosyal seçkisine hoş geldin.</b> Takip ettiğin konulardan daha dengeli bir ana sayfa hazırlıyoruz.</> }]; return <div className="notifications-view"><div className="notification-tabs" role="tablist" aria-label="Bildirim filtresi"><button role="tab" aria-selected={filter === "all"} className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>Tümü</button><button role="tab" aria-selected={filter === "unread"} className={filter === "unread" ? "selected" : ""} onClick={() => setFilter("unread")}>Okunmamış</button></div>{items.filter((item) => filter === "all" || !read.includes(item.id)).map((item) => <button key={item.id} className={"notification " + (read.includes(item.id) ? "is-read" : "")} onClick={() => { if (!read.includes(item.id)) setRead([...read, item.id]); onOpen(item.post); }}>{item.avatar}<span>{item.copy}<small>{read.includes(item.id) ? "Okundu" : "Yeni"}</small></span><em aria-hidden="true"><UiIcon name="arrow-right" /></em></button>)}</div>; }
function Messages({ messages, setMessages, target }: { messages: Message[]; setMessages: (next: Message[]) => void; target: Profile | null }) {
  const targetConversation = target?.handle ?? "team";
  const [open, setOpen] = useState(targetConversation);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const contacts = [
    { id: "team", name: "NSosyal Ekibi", handle: "@nsosyalekibi", initials: "YE", tone: "coral", preview: "Bağlam özeti için küçük bir not" },
    { id: "bora", name: "Bora Ekin", handle: "@boraekin", initials: "BE", tone: "violet", preview: "Rota notlarına baktın mı?" },
    { id: "selin", name: "Selin Uçak", handle: "@selinucak", initials: "SU", tone: "teal", preview: "Okul çıkışı için bir fikrim var" },
    ...(target && !["@boraekin", "@selinucak"].includes(target.handle) ? [{ id: target.handle, name: target.name, handle: target.handle, initials: target.initials, tone: "ink", preview: "Yeni konuşma" }] : []),
  ];
  const contact = contacts.find((item) => item.id === open) ?? contacts[0];
  const visibleMessages = messages.filter((message) => message.conversationId === open);
  useEffect(() => { const frame = window.requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }); return () => window.cancelAnimationFrame(frame); }, [open, visibleMessages.length]);
  const send = () => { const body = draft.trim(); if (!body) return; setMessages([...messages, { id: "message-" + Date.now(), conversationId: open, from: "me", body }]); setDraft(""); };
  return <div className="messages-view"><nav className="message-list" aria-label="Konuşmalar">{contacts.map((item) => <button key={item.id} className={open === item.id ? "selected" : ""} onClick={() => setOpen(item.id)} aria-label={item.name + " konuşmasını aç"}><Avatar initials={item.initials} tone={item.tone} /><span><b>{item.name}</b><small>{item.preview}</small></span></button>)}</nav><section className="message-thread"><header><Avatar initials={contact.initials} tone={contact.tone} /><span><b>{contact.name}</b><small>{contact.handle}</small></span></header><div className="message-scroll" ref={scrollRef} role="log" aria-live="polite" aria-label={contact.name + " ile mesajlar"}><p className="message-day">Bugün</p>{visibleMessages.map((message) => <div key={message.id} className={"message-bubble " + message.from}>{message.body}</div>)}{!visibleMessages.length && <div className="message-empty"><Avatar initials={contact.initials} tone={contact.tone} /><b>{contact.name} ile henüz mesajın yok</b><p>İlk cümleyi yaz. Kısa bir &quot;merhaba&quot; gayet yeterli.</p></div>}</div><form className="message-compose" onSubmit={(event) => { event.preventDefault(); send(); }}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={contact.name + " adlı kişiye mesaj yaz"} aria-label="Yeni bir mesaj yaz" /><button aria-label="Gönder" type="submit"><UiIcon name="send" /></button></form></section></div>;
}
function Profile(props: FeedProps & { profile: Profile; isOwn: boolean; points: number; gamification: Gamification; onEdit: () => void; onSettings: () => void; onMessage: (profile: Profile) => void; onPoints: () => void }) {
  const [tab, setTab] = useState<"posts" | "replies" | "likes" | "bookmarks">("posts");
  useEffect(() => {
    const cover = props.profile.cover ?? "/demo/kent-serinligi.png";
    document.documentElement.style.setProperty("--profile-cover-image", "url(" + cover + ")");
  }, [props.profile.cover]);
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
function TrendPanel({ full = false, onSelect }: { full?: boolean; onSelect: (topic: string) => void }) { const trends = [{ meta: "Türkiye’de gündem", tag: "#serinrota", topic: "Gölgelik duraklar ve okul yolu", count: "4.282 gönderi" }, { meta: "Teknoloji · Gündem", tag: "#acikveri", topic: "Belediye verilerinin güncelliği", count: "1.904 gönderi" }, { meta: "Kültür · Gündem", tag: "#sessizsinema", topic: "Yazlık gösterimler ve mahalle salonları", count: "916 gönderi" }, { meta: "İstanbul’da gündem", tag: "#gecekutuphanesi", topic: "Gece açık, güvenli kamusal alanlar", count: "683 gönderi" }, { meta: "Şehir yaşamı", tag: "#kaldirimhakki", topic: "Puset, sandalye ve yaya geçişi", count: "572 gönderi" }, { meta: "İzmir’de gündem", tag: "#sokaksesleri", topic: "Sabahın ses haritası", count: "341 gönderi" }]; return <section className={"trend-panel " + (full ? "full" : "")}><h2>{full ? "Gündem" : "Şu an konuşulanlar"}</h2>{trends.map((trend) => <button key={trend.tag} onClick={() => onSelect(trend.tag)}><span><small>{trend.meta}</small><b>{trend.tag}</b><small className="trend-topic">{trend.topic}</small><small>{trend.count}</small></span><em aria-hidden="true"><UiIcon name="more" /></em></button>)}<p className="show-more">Gündem, örnek verilerle güncellenir.</p></section>; }
function WhoToFollow({ following, onFollow }: { following: string[]; onFollow: (handle: string) => void }) { const people = [{ name: "Sena Ertem", handle: "@senaertem", initials: "SE", tone: "gold" }, { name: "Barış Koral", handle: "@bariskoral", initials: "BK", tone: "violet" }, { name: "Derya Uzun", handle: "@deryauzun", initials: "DU", tone: "teal" }, { name: "Kıvanç Sarı", handle: "@kivancsari", initials: "KS", tone: "ink" }, { name: "Leyla Oruç", handle: "@leylaoruc", initials: "LO", tone: "coral" }, { name: "Yağız Toprak", handle: "@yagiztoprak", initials: "YT", tone: "violet" }]; return <section className="who-panel"><h2>Tanıyor olabileceğin kişiler</h2>{people.map((person) => <div key={person.handle}><Avatar initials={person.initials} tone={person.tone} /><span><b>{person.name}</b><small>{person.handle}</small></span><button className={following.includes(person.handle) ? "outline-button" : "dark-button"} aria-pressed={following.includes(person.handle)} onClick={() => onFollow(person.handle)}>{following.includes(person.handle) ? "Takip Ediliyor" : "Takip et"}</button></div>)}<p className="show-more">Kişi önerileri örnek veriyle sınırlı.</p></section>; }
function MoreMenu({ post, isPinned, followed, onClose, onDelete, onPin, onFollow, onShare, onQuote }: { post: Post; isPinned: boolean; followed: boolean; onClose: () => void; onDelete: (post: Post) => void; onPin: (post: Post) => void; onFollow: (handle: string) => void; onShare: (post: Post) => void; onQuote: (post: Post) => void }) { const dialogRef = useDialogFocus(onClose); return <div className="modal-backdrop"><section ref={dialogRef} className="more-menu" role="dialog" aria-modal="true" aria-label="Gönderi seçenekleri" tabIndex={-1}><button onClick={() => { onShare(post); onClose(); }}><UiIcon name="send" /> Metni paylaş</button><button onClick={() => { onQuote(post); onClose(); }}><UiIcon name="quote" /> Alıntıla</button>{post.own ? <><button aria-pressed={isPinned} onClick={() => onPin(post)}><UiIcon name="pin" /> {isPinned ? "Profilden sabitlemeyi kaldır" : "Profiline sabitle"}</button><button className="danger" onClick={() => onDelete(post)}><UiIcon name="close" /> Gönderiyi sil</button></> : <button aria-pressed={followed} onClick={() => { onFollow(post.handle); onClose(); }}><UiIcon name="profile" /> {followed ? post.handle + " takipten çıkar" : post.handle + " takip et"}</button>}<button onClick={onClose}><UiIcon name="close" /> Vazgeç</button></section></div>; }
function MediaPreview({ post, onClose }: { post: Post; onClose: () => void }) { const dialogRef = useDialogFocus(onClose); return <div className="modal-backdrop"><section ref={dialogRef} className={"media-preview " + (post.image ? "has-photo" : "")} role="dialog" aria-modal="true" aria-label="Medya önizlemesi" tabIndex={-1}>{post.image && <img src={post.image} alt={post.imageAlt ?? ""} />}<button className="modal-close" onClick={onClose} aria-label="Önizlemeyi kapat"><UiIcon name="close" /></button>{!post.image && <span className="media-ripple"><i /><i /><i /></span>}<div className="media-preview-copy"><p>{post.attachment === "note" ? "Mahalle notu" : "Kent notu"}</p><h2>{post.body}</h2><small>NSosyal demosu için hazırlanmış görsel not.</small></div></section></div>; }
function ProfileEditor({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (profile: Profile) => void }) { const [draft, setDraft] = useState(profile); const dialogRef = useDialogFocus<HTMLFormElement>(onClose); return <div className="modal-backdrop"><form ref={dialogRef} className="profile-editor" onSubmit={(event) => { event.preventDefault(); onSave(draft); }} role="dialog" aria-modal="true" aria-label="Profili düzenle" tabIndex={-1}><header><h2>Profili düzenle</h2><button type="button" onClick={onClose} aria-label="Kapat"><UiIcon name="close" /></button></header><label>Adın<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value.slice(0, 36) })} /></label><label>Kısa bio<textarea value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value.slice(0, 160) })} /></label><label>Konum<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value.slice(0, 36) })} /></label><button className="primary-button" type="submit">Kaydet</button></form></div>; }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <section className="empty-state"><span aria-hidden="true"><UiIcon name="spark" /></span><h2>{title}</h2><p>{copy}</p></section>; }
