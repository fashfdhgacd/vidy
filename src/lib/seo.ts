import { findCategory } from "@/lib/catalog/categories";

/** Set at build time. videyy is the default worker; videqsss is a second build. */
export const SITE_ID = import.meta.env.VITE_SITE_ID === "videqsss" ? "videqsss" : "videyy";
export const IS_VIDEQSSS = SITE_ID === "videqsss";

// Domain placeholder — ganti dengan domain asli videy-hub sebelum deploy.
export const SITE_ORIGIN = IS_VIDEQSSS ? "https://videqsss.icu" : "https://videyy.icu";
export const SITE_NAME = IS_VIDEQSSS ? "Videqsss" : "Videy Hub";
/** Nama brand persis seperti yang dicari orang di Google. */
export const BRAND_NAME = SITE_NAME;
/** og:site_name: nama situs di kartu share / sinyal nama situs. */
export const OG_SITE_NAME = SITE_NAME;
/** Suffix judul halaman: domain, contoh "Judul | videyy.icu". */
export const TITLE_SUFFIX = IS_VIDEQSSS ? "videqsss.icu" : "videyy.icu";
/** Kartu share: logo situs. Query v= bust cache Telegram/X. */
export const DEFAULT_OG = `${SITE_ORIGIN}/og-v2.jpg?v=14`;
/** Logo persegi (ikon pinguin pixel 512x512, dilayani middleware brand-icons). */
export const SITE_LOGO = `${SITE_ORIGIN}/icon-512.png`;

/** Snippet beranda: update harian + streaming tanpa VPN (pola growth, teks sendiri). */
export const HOME_DESCRIPTION = IS_VIDEQSSS
  ? "The newest Indonesian amateur videos from IndoAV and UserBokep in one list, updated daily. Stream on your phone, no sign-up. Adults 18+ only."
  : "Nonton video terbaru, update setiap hari, di videyy.icu. Streaming lancar di HP tanpa VPN dan tanpa daftar akun. Khusus dewasa 18+.";

/** Judul beranda. Brand di depan, frasa update harian, tetap di bawah 60 karakter. */
export const HOME_TITLE = IS_VIDEQSSS
  ? "Videqsss - Newest Indonesian Amateur Videos"
  : "Videy Hub - Video Terbaru Update Setiap Hari";

/** H1 beranda, selaras dengan judul tab. */
export const HOME_H1 = IS_VIDEQSSS ? "Newest Indonesian Amateur Videos" : "Video Terbaru Update Setiap Hari";

/** Kalimat pendek di bawah H1 beranda. */
export const HOME_INTRO = IS_VIDEQSSS
  ? "Indonesian videos collected from IndoAV and UserBokep, newest first. Video titles stay in their original Indonesian. Plays right in your phone browser. Adults 18+ only."
  : "Video terbaru di Videy Hub, ditambah setiap hari dari katalog sendiri. Putar langsung di HP tanpa VPN, tanpa aplikasi, dan tanpa login. Konten khusus 18+.";

/** English category names for the English build (videqsss.icu). Hand-written, not machine-translated. */
export const EN_CATEGORY_LABELS: Record<string, string> = {
  jav: "JAV", hentai: "Hentai", "ai-plus": "AI", "ai-gay": "AI Gay", "ai-indo": "Indonesian AI", jilbab: "Hijab",
  tante: "Mature", amatir: "Amateur", viral: "Viral", percakapan: "Dirty Talk", kosan: "Boarding Room", colmek: "Solo",
  istri: "Wife", live: "Live Cam", doggy: "Doggy Style", "open-bo": "Escort", malaysia: "Malay", chindo: "Chinese Indonesian",
  gangbang: "Threesome", selingkuh: "Cheating", barat: "Western", sepong: "Blowjob", tobrut: "Busty", selebgram: "Influencer",
  outdoor: "Outdoor", hotel: "Hotel", "kamar-mandi": "Bathroom", wot: "Cowgirl", "crot-dalam": "Creampie", hamil: "Pregnant",
  ojol: "Ride-Hailing Driver", blunder: "Oops", "kelas-bintang": "Kelas Bintang", tiktok: "TikTok", mantan: "Ex-Girlfriend",
  vcs: "Video Call", kompilasi: "Compilation", tetangga: "Neighbor", kacamata: "Glasses", kantor: "Office", anal: "Anal",
  cantik: "Pretty Girl", lainnya: "Other", videy: "Videy", bokep: "Featured", "teen-18": "Young Adult (18+)", "college-18": "College (18+)",
};

function categoryLabel(slugOrLabel?: string | null): string {
  const key = (slugOrLabel || "").trim().toLowerCase();
  if (!key) return "Indo";
  const cat = findCategory(key) || findCategory(key.replace(/\s+/g, "-"));
  if (IS_VIDEQSSS && cat && EN_CATEGORY_LABELS[cat.slug]) return EN_CATEGORY_LABELS[cat.slug];
  return (cat?.label || slugOrLabel || "Indo").trim();
}


/** Jangan amplify kategori yang mengarah ke minor / underage di meta. */
function safeSeoLabel(slugOrLabel?: string | null): string {
  const label = categoryLabel(slugOrLabel);
  if (/\b(abg|teen|underage|bocil|anak|smp|sma|loli|shota|remap)\b/i.test(label)) {
    return IS_VIDEQSSS ? "Adult" : "Dewasa";
  }
  return label;
}

export function categoryKeywords(slugOrLabel?: string | null): string {
  const label = safeSeoLabel(slugOrLabel);
  return `video ${label.toLowerCase()}, ${label} viral, Videy Hub`;
}

export function pageTitle(parts: Array<string | null | undefined>): string {
  const clean = parts.map((p) => (p || "").trim()).filter(Boolean);
  const unique = clean.filter((p, i) => clean.findIndex((x) => x.toLowerCase() === p.toLowerCase()) === i);
  if (!unique.length) return HOME_TITLE;
  const last = unique[unique.length - 1]?.toLowerCase();
  if (last === TITLE_SUFFIX.toLowerCase() || last === SITE_NAME.toLowerCase()) {
    return unique.join(" | ");
  }
  return `${unique.join(" | ")} | ${TITLE_SUFFIX}`;
}

const MINOR_RE =
  /\b(abg|tocil|teen|teens|underage|bocil|anak|smp|sma|smk|loli|lolita|shota|remaja|bocah|pelajar|sekolah|seragam\s+sekolah|perawan\s+kecil|gadis\s+kecil|dedek|adek|adik)\b/i;

/** Hapus suffix branding situs dari judul tampil (data asli tidak diubah). */
export function cleanDisplayTitle(raw?: string | null): string {
  let t = String(raw || "").replace(/_+/g, " ").trim().replace(/\s+/g, " ");
  t = t.replace(/\s*[([]\s*(koleksi\s+)?dr\.?\s*pinguin[^)\]]*[)\]]\s*$/gi, "");
  for (let i = 0; i < 3; i++) {
    t = t.replace(/[\s\-–—|:·,]*\b(koleksi\s+)?dr\.?\s*pinguin\.?\s*$/gi, "");
    t = t.replace(/\s*[-|–—,]\s*M\.?S\.?B\.?\s*$/gi, "");
  }
  // Akhiran domain brand di judul tersimpan (" - koleksidrpinguin.com" / " - videyy.icu").
  t = t.replace(/\s*[-–—|·:]?\s*(?:https?:\/\/)?(?:www\.)?(?:koleksidrpinguin\.(?:com|site)|videyhub\.site|videyy\.icu)\/?\s*$/i, "");
  t = t.replace(/[\s\-–—|:·,]+$/g, "").trim();
  // "TerakotaEpisode 2" -> "Terakota Episode 2" (display only, the stored title is unchanged).
  t = t.replace(/(\p{Ll})(Episode|Eps|Ep|Part|Bagian)(?=\.?\s*#?\s*\d)/gu, "$1 $2");
  return t || String(raw || "").replace(/_+/g, " ").replace(/\s+/g, " ").trim() || "Video";
}

/**
 * Upload bot baru menyimpan judul "Judul - videyy.icu" (keputusan pemilik; tetap tampil
 * di kartu/H1/og:title). Untuk <title> dan kalimat deskripsi, akhiran domain itu dilepas supaya
 * tidak jadi "… - videyy.icu | videyy.icu": pageTitle() memasang domain sekali,
 * dan tetap utuh walau judul panjang dipotong.
 */
export function withoutDomainSuffix(raw?: string | null): string {
  const t = String(raw || "");
  const cut = t
    .replace(/\s*[-–—|·:]?\s*(?:https?:\/\/)?(?:www\.)?(?:koleksidrpinguin\.(?:com|site)|videyhub\.site|videyy\.icu)\/?\s*$/i, "")
    .trim();
  return cut || t.trim();
}

/**
 * Label kategori untuk kalimat/judul SEO halaman tonton. Kategori "bokep" berlabel nama brand
 * ("Koleksi Dr. Pinguin Bokep") dan Videy berlabel "drpinguin videy": di judul dan deskripsi itu
 * jadi "Bokep Koleksi Dr. Pinguin Bokep" / "penggemar Koleksi Dr. Pinguin Bokep", jadi dipetakan
 * ke kata yang dicari orang.
 */
function videoTextLabel(category?: string | null): string {
  const key = (category || "").trim().toLowerCase();
  // Videy first: its label is "drpinguin videy", which the /pinguin/ brand check would turn into "Indo".
  if (key === "videy") return "Videy";
  if (!key || key === "bokep" || key === "lainnya" || /pinguin/i.test(categoryLabel(category))) return IS_VIDEQSSS ? "Indonesian" : "Indo";
  return safeSeoLabel(category);
}

/** Potong di batas kata (tanpa sisa tanda baca/pemisah), tambah "…" hanya kalau benar-benar dipotong. */
function clipWords(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  const head = sp >= Math.floor(max * 0.5) ? cut.slice(0, sp) : cut;
  return `${head.replace(/[\s,.;:·|–—-]+$/, "")}…`;
}

/**
 * Untuk judul yang terlalu panjang saja: "(Koleksi Dr. Pinguin Bokep, M.S.B.)" di tengah judul dilepas
 * sebelum dipotong, supaya hasilnya tidak berhenti di "(Koleksi Dr…". Domain " | videyy.icu"
 * tetap dipasang pageTitle(), dan judul yang muat utuh tidak diubah.
 */
function clipTitleText(s: string, max: number): string {
  if (s.length <= max) return s;
  const compact = s.replace(/\s*[([]\s*(?:koleksi\s+)?dr\.?\s*pinguin[^)\]]*[)\]]/gi, "").replace(/\s+/g, " ").trim();
  return clipWords(compact || s, max);
}

/** Batas panjang bagian judul sebelum " | videyy.icu" (total ±80 karakter). */
const VIDEO_TITLE_HEAD_MAX = 58;

/** Judul tanpa domain dan tanpa "(Koleksi Dr. Pinguin …)" walau keduanya menempel ("… (Koleksi Dr. Pinguin) - videyy.icu"). */
function seoBaseTitle(raw?: string | null): string {
  return withoutDomainSuffix(cleanDisplayTitle(withoutDomainSuffix(raw)));
}

/** Ekor judul tonton per situs: videyy pakai kata kunci "Videy", videqsss pakai "Bokep Indo". */
function siteTitleTails(base: string, label: string, hasLabel: boolean, hasBokep: boolean): string[] {
  if (IS_VIDEQSSS) {
    // English tails: the stored (Indonesian) title stays, the tail tells foreign searchers what it is.
    const hasIndo = /\bindo(nesia|nesian)?\b/i.test(base);
    if (hasIndo) return [" – Indonesian Amateur Video", " – Amateur Video", " – Videqsss"];
    return hasLabel
      ? [" – Indonesian Amateur Video", " – Indonesian Video"]
      : [` – Indonesian ${label} Video`, " – Indonesian Video"];
  }
  const hasVidey = /\bvidey\b/i.test(base);
  if (hasVidey) return hasBokep ? [" – Viral"] : [" – Bokep Viral", " – Viral"];
  return [" – Videy Viral", " – Videy"];
}

export function videoSeoTitle(title: string, category?: string | null): string {
  const base = seoBaseTitle(title);
  const label = videoTextLabel(category);
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasLabel = new RegExp(`(?:^|[^\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "iu").test(base);
  const hasBokep = /\bbokep\b/i.test(base);
  // Kategori hanya ditempel kalau muat utuh; tidak pernah jadi potongan seperti "– Bo…".
  // Ekor judul beda per situs supaya judul satelit tidak identik dengan koleksidrpinguin.com.
  const tails = siteTitleTails(base, label, hasLabel, hasBokep);
  for (const tail of tails) {
    if (base.length + tail.length <= VIDEO_TITLE_HEAD_MAX) return pageTitle([`${base}${tail}`]);
  }
  // Judul panjang: potong judul supaya ekor situs tetap muat (judul tetap beda dari situs utama).
  const last = tails[tails.length - 1];
  if (last) return pageTitle([`${clipTitleText(base, VIDEO_TITLE_HEAD_MAX - last.length)}${last}`]);
  return pageTitle([clipTitleText(base, VIDEO_TITLE_HEAD_MAX)]);
}

/** Hash stabil biar deskripsi meta tidak berubah tiap load. */
function stablePick(seed: string, n: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return Math.abs(h | 0) % n;
}

function clipAtWord(s: string, max: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 48 ? cut.slice(0, sp) : cut).trimEnd().replace(/[,.;:·—-]+$/, "")}…`;
}

/** Catatan internal/dev yang tidak boleh tampil ke pengunjung. */
const INTERNAL_NOTE_RE =
  /[\s.,·—-]*(deskripsi natural,?\s*bukan spam(\s+kata(\s+kunci)?)?|bukan spam kata(\s+kunci)?|halaman tonton lengkap biar gampang ketemu di pencarian|todo:?[^.]*|seo:?[^.]*)\.?/gi;

export function stripInternalNotes(s?: string | null): string {
  return String(s || "").replace(INTERNAL_NOTE_RE, ". ").replace(/\s*\.\s*(\.\s*)+/g, ". ").replace(/\s+/g, " ").replace(/^\.\s*/, "").trim();
}

function durationPhrase(sec?: number | null): string {
  const s = Number(sec || 0);
  if (!s || s < 30) return "";
  const m = Math.round(s / 60);
  if (m < 1) return "";
  if (IS_VIDEQSSS) {
    if (m < 60) return `${m} min`;
    const hh = Math.floor(m / 60);
    const rr = m % 60;
    return rr ? `${hh} h ${rr} min` : `${hh} h`;
  }
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} jam ${r} menit` : `${h} jam`;
}

/** Panjang maksimum deskripsi manual pemilik (owner-tools "edit-video"). */
export const MANUAL_DESCRIPTION_MAX = 1000;

/** Teks bawaan katalog lama yang artinya "tidak ada deskripsi". */
const EMPTY_DESCRIPTION_RE = /^(tidak ada sinopsis|no description)\.?$/i;

/**
 * Filter keamanan deskripsi manual: kata terlarang (minor/sekolah) tidak pernah tampil.
 * Server memakai ini juga saat menyimpan, jadi deskripsi yang ditolak tidak diam-diam hilang.
 */
export function isSafeManualDescription(s?: string | null): boolean {
  const t = String(s || "").trim();
  return Boolean(t) && !MINOR_RE.test(t);
}

/**
 * Deskripsi manual pemilik (field `description`), sudah dibersihkan dari catatan internal.
 * "" = kosong atau tidak lolos filter keamanan → pakai deskripsi otomatis.
 */
export function manualDescription(item: Pick<SeoVideoInput, "description">): string {
  const t = stripInternalNotes(item.description).slice(0, MANUAL_DESCRIPTION_MAX).trim();
  if (!t || EMPTY_DESCRIPTION_RE.test(t)) return "";
  return isSafeManualDescription(t) ? t : "";
}

/**
 * Deskripsi publik halaman tonton: deskripsi manual pemilik kalau ada; kalau kosong, otomatis dari
 * judul + kategori + durasi, unik per video. Dipakai meta, teks halaman, VideoObject, dan sitemap.
 */
export function publicWatchDescription(item: SeoVideoInput, max = 0): string {
  const manual = manualDescription(item);
  if (manual) return max > 0 ? clipAtWord(manual, max) : manual;
  const title = seoBaseTitle(item.title);
  const label = videoTextLabel(item.category);
  const dur = durationPhrase(item.duration);
  const name = title ? `“${clipTitleText(title, 80)}”` : IS_VIDEQSSS ? "This video" : "Koleksi ini";
  const durBit = dur ? (IS_VIDEQSSS ? `, ${dur} long` : `, durasi ${dur}`) : "";
  // Template per situs: meta satelit tidak sama persis dengan koleksidrpinguin.com (konten duplikat).
  const text = IS_VIDEQSSS
    ? `${name}: an Indonesian ${label.toLowerCase()} video${durBit} on Videqsss. Newest IndoAV & UserBokep uploads, stream free with no sign-up at videqsss.icu. 18+.`
    : `Nonton ${name} di Videy Hub, video ${label}${durBit}. Videy viral update tiap hari, tanpa VPN di videyy.icu. 18+.`;
  return max > 0 ? clipAtWord(text, max) : text;
}

export type SeoVideoInput = {
  id?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  creator?: string | null;
  source?: string | null;
  duration?: number | null;
  year?: string | null;
  quality?: string | null;
  subjects?: string[] | null;
};

function safeTags(item: SeoVideoInput, label: string): string[] {
  const out: string[] = [];
  for (const raw of item.subjects || []) {
    const t = String(raw || "").trim();
    if (!t || t.length > 24 || MINOR_RE.test(t) || /pinguin/i.test(t)) continue;
    if (t.toLowerCase() === label.toLowerCase()) continue;
    if (out.some((x) => x.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
    if (out.length >= 2) break;
  }
  return out;
}

/**
 * Deskripsi unik per video. Varian template dipilih stabil dari hash id,
 * memakai judul, kategori, tag, durasi, sumber, tahun. Target 140–160 karakter.
 */
function buildSentences(item: SeoVideoInput): { lead: string; detail: string; close: string } {
  const label = videoTextLabel(item.category);
  const rawTitle = seoBaseTitle(item.title);
  const titleOk = !MINOR_RE.test(rawTitle);
  const t = titleOk ? clipTitleText(rawTitle, 60) : "";
  const src0 = String(item.creator || item.source || "").trim();
  const src = src0 && !MINOR_RE.test(src0) && src0.toLowerCase() !== label.toLowerCase() ? src0 : "";
  const dur = durationPhrase(item.duration);
  const year = (item.year || "").trim();
  const tags = safeTags(item, label);
  const tagTxt = tags.length ? tags.join(" & ") : "";
  const seed = `${SITE_ID}|${item.id || ""}|${rawTitle}`;
  const pick = <T,>(arr: T[], salt: string) => arr[stablePick(seed + salt, arr.length)]!;

  if (IS_VIDEQSSS) {
    const subjEn = t ? `“${t}”` : "this video";
    const lab = label.toLowerCase();
    const leadsEn = [
      `${subjEn} is an Indonesian ${lab} video${dur ? ` running about ${dur}` : ""}.`,
      `Watch ${subjEn}, an Indonesian ${lab} clip${dur ? ` of about ${dur}` : ""}.`,
      `${subjEn} is part of the Indonesian ${lab} collection${year ? ` from ${year}` : ""}${dur ? `, about ${dur} long` : ""}.`,
      `Stream ${subjEn} online, an Indonesian ${lab} video${dur ? ` (${dur})` : ""} with no sign-up.`,
    ];
    const detailsEn = [
      src ? `Collected from ${src}${tagTxt ? `, tagged ${tagTxt}` : ""}.` : "Plays through an embed from a third-party host.",
      src ? `Source: ${src}. Works on phone and desktop.` : "Works on phone and desktop.",
      tagTxt ? `For fans of ${tagTxt}.` : `For fans of Indonesian ${lab} videos.`,
      "The title is kept in its original Indonesian.",
    ];
    const closesEn = ["Adults 18+ only.", "For viewers 18 and over.", "Adult content, 18+ only."];
    const l = pick(leadsEn, "L");
    return { lead: l.charAt(0).toUpperCase() + l.slice(1), detail: pick(detailsEn, "D"), close: pick(closesEn, "C") };
  }
  const subj = t ? `“${t}”` : "video ini";
  const leads = [
    `${subj} adalah video kategori ${label}${dur ? ` berdurasi sekitar ${dur}` : ""}.`,
    `${subj} masuk koleksi ${label}${year ? ` tahun ${year}` : ""}${dur ? `, panjangnya kurang lebih ${dur}` : ""}.`,
    `Tonton ${subj}, salah satu video ${label}${dur ? ` dengan durasi ${dur}` : ""}.`,
    `Video ${label} ${subj}${dur ? ` berjalan sekitar ${dur}` : " siap diputar"}.`,
    `${subj} hadir di rak ${label}${year ? ` (${year})` : ""}${dur ? `, durasi ${dur}` : ""}.`,
    `Nonton streaming ${subj} online, video ${label}${dur ? ` ${dur}` : ""} terbaru tanpa daftar.`,
    `Streaming ${subj} gratis di koleksi ${label}${dur ? `, durasi ${dur}` : ""}.`,
  ];
  const details = [
    src ? `Diunggah lewat ${src}${tagTxt ? `, bertema ${tagTxt}` : ""}.` : tagTxt ? `Temanya seputar ${tagTxt}.` : "Diputar lewat embed dari hoster pihak ketiga.",
    tagTxt ? `Nuansanya ${tagTxt}${src ? `, sumber dari ${src}` : ""}.` : src ? `Sumber video dari ${src}.` : "Bisa langsung diputar tanpa daftar akun.",
    src ? `Streaming via ${src}, bisa dibuka di HP maupun desktop.` : "Bisa dibuka nyaman di HP maupun desktop.",
    tagTxt ? `Cocok buat penggemar ${tagTxt}.` : `Cocok buat penggemar ${label}.`,
  ];
  const closes = [
    "Khusus penonton 18+.",
    "Hanya untuk usia 18 tahun ke atas.",
    "Konten dewasa, 18+ saja.",
    "Tersedia untuk pengunjung dewasa 18+.",
  ];
  const lead0 = pick(leads, "L");
  return { lead: lead0.charAt(0).toUpperCase() + lead0.slice(1), detail: pick(details, "D"), close: pick(closes, "C") };
}

function fitLength(parts: string[], min: number, max: number): string {
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > max && out.length >= min - 30) break;
    out = next;
  }
  if (out.length < min) {
    const pad = IS_VIDEQSSS
      ? ["Updated regularly.", "Plays instantly.", "Free, no account needed.", "Enjoy the video."]
      : ["Update koleksi berkala.", "Putar langsung tanpa ribet.", "Gratis, tanpa daftar akun.", "Selamat menonton."];
    for (const p of pad) {
      if (out.length >= min) break;
      if (`${out} ${p}`.length <= max) out = `${out} ${p}`;
    }
  }
  return clipAtWord(out, max);
}

export function videoSeoDescription(
  title: string | SeoVideoInput,
  category?: string | null,
  extra?: { creator?: string | null; source?: string | null },
): string {
  const item: SeoVideoInput =
    typeof title === "string" ? { title, category, creator: extra?.creator, source: extra?.source } : title;
  const { lead, detail, close } = buildSentences(item);
  return fitLength([lead, detail, close], 140, 160);
}

/** Paragraf tampil di halaman tonton (1–2 kalimat + penutup). */
export function videoBodyDescription(item: SeoVideoInput): string {
  const { lead, detail, close } = buildSentences(item);
  return `${lead} ${detail} ${close}`;
}

function rawLooksWeak(item: SeoVideoInput, raw: string): boolean {
  const title = String(item.title || "").trim();
  return (
    !raw ||
    raw.length < 60 ||
    raw.toLowerCase() === title.toLowerCase() ||
    /^nonton\s+/i.test(raw) ||
    /streaming amatir, jilbab/i.test(raw) ||
    /pinguin/i.test(raw) ||
    MINOR_RE.test(raw) ||
    (title.length > 8 && raw.toLowerCase().startsWith(title.toLowerCase()) && raw.length < title.length + 40)
  );
}

export function cleanRawDescription(item: SeoVideoInput): string {
  const raw = stripInternalNotes(item.description);
  return rawLooksWeak(item, raw) ? "" : raw;
}

/** Deskripsi manual pemilik dulu; lalu deskripsi katalog kalau cukup bagus; kalau tipis/ulang judul → generator. */
export function resolveVideoSeoDescription(item: SeoVideoInput): string {
  const manual = manualDescription(item);
  if (manual) return clipAtWord(manual, 158);
  const raw = cleanRawDescription(item);
  if (raw) return clipAtWord(raw, 158);
  return videoSeoDescription(item);
}

export function absoluteThumb(thumbnail?: string | null): string {
  const raw = String(thumbnail || "").trim();
  if (!raw) return DEFAULT_OG;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return DEFAULT_OG;
}

/** True if URL looks like JPEG/PNG Google Video accepts (not webp/avif/svg). */
export function isGoogleVideoThumbFormat(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  if (/\.(webp|avif|svg|gif|bmp|ico)($|\/)/i.test(path)) return false;
  if (/\.(jpe?g|png)($|\/)/i.test(path)) return true;
  // same-origin OG/proxy endpoints that we force to JPEG
  if (/\/api\/og(\?|$)/i.test(url) || /\/og\/[A-Za-z0-9_-]+(?:\.jpe?g)?(\?|$)/i.test(url) || /\/og(-v2)?\.jpg(\?|$)/i.test(url) || /\/brand-poster(-v2)?\.jpg(\?|$)/i.test(url)) {
    return true;
  }
  return false;
}

/**
 * Thumbnail for VideoObject / GSC video indexing.
 * Prefer same-origin /og/<id>.jpg (JPEG) so bots are not sent unreachable .webp hosters.
 */
export function seoVideoThumbnail(id?: string | null, thumbnail?: string | null): string {
  const idClean = (id || "").trim();
  if (idClean && /^[A-Za-z0-9_-]{3,64}$/.test(idClean)) {
    return `${SITE_ORIGIN}/og/${encodeURIComponent(idClean)}.jpg`;
  }
  const raw = String(thumbnail || "").trim();
  if (raw && isGoogleVideoThumbFormat(raw)) {
    return absoluteThumb(raw);
  }
  return DEFAULT_OG;
}

/** Canonical homepage URL — must match sitemap loc trailing slash. */
export const HOME_CANONICAL = `${SITE_ORIGIN}/`;

export function homeSeo(q?: string, category?: string) {
  if (q) {
    return {
      title: pageTitle([IS_VIDEQSSS ? `Search “${q}”` : `Cari “${q}”`]),
      description: IS_VIDEQSSS ? `Search results for “${q}” on ${SITE_NAME}. Adults 18+ only.` : `Hasil pencarian “${q}” di ${SITE_NAME}. Konten 18+.`,
      keywords: `${q}, ${SITE_NAME}`,
    };
  }
  const cat = findCategory(category);
  if (cat) {
    const label = safeSeoLabel(cat.slug || cat.label);
    return {
      title: pageTitle([IS_VIDEQSSS ? `Indonesian ${label} Videos` : `Bokep ${label}`]),
      description: IS_VIDEQSSS
        ? `Indonesian ${label.toLowerCase()} videos on ${SITE_NAME}, adults 18+ only. Embedded streaming, updated regularly.`
        : `Katalog bokep ${label} 18+ di ${SITE_NAME}. Streaming embed, update berkala.`,
      keywords: categoryKeywords(cat.slug),
    };
  }
  return {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    keywords: IS_VIDEQSSS
      ? "indonesian amateur, indonesian porn videos, indoav, userbokep, indo viral, videqsss"
      : "videy hub, bokep indo, bokep viral, video 18+, nonton bokep",
  };
}

function normalizeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (/indoav|userbokep|puterin|putarin|streamtape|strcloud|lulu/i.test(`${u.hostname}${u.pathname}`)) {
      u.pathname = u.pathname.replace(/\/(?:v|d|watch)\//, "/e/");
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** createdAt (detik/ms/ISO) -> ISO 8601 dengan zona WIB; undefined kalau tidak valid. */
function realUploadDate(raw?: string | number | null): string | undefined {
  if (raw == null || raw === "") return undefined;
  let ms: number;
  if (typeof raw === "number") ms = raw < 1e12 ? raw * 1000 : raw;
  else if (/^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    ms = n < 1e12 ? n * 1000 : n;
  } else ms = Date.parse(raw);
  if (!Number.isFinite(ms) || ms < Date.UTC(2015, 0, 1) || ms > Date.now() + 86_400_000) return undefined;
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function uploadDateFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const day = (Math.abs(h) % 28) + 1;
  const month = (Math.abs(h >> 5) % 12) + 1;
  const year = 2025 + (Math.abs(h >> 9) % 2);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+07:00`;
}

export function videoJsonLd(input: {
  id: string;
  title: string;
  description: string;
  thumbnail?: string | null;
  category?: string | null;
  embedUrl?: string | null;
  contentUrl?: string | null;
  durationSec?: number | null;
  /** Tanggal unggah asli (createdAt/date katalog). Bukti originalitas: tanggal kita lebih awal dari situs penyalin. */
  uploadDate?: string | number | null;
}) {
  const embed = (input.embedUrl || "").trim();
  const content = (input.contentUrl || "").trim();
  const thumb = seoVideoThumbnail(input.id, input.thumbnail);
  const pageUrl = `${SITE_ORIGIN}/watch/${input.id}`;
  const label = videoTextLabel(input.category);

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: String(input.title || "Video").trim(),
    description: (input.description || "").trim().slice(0, 300),
    thumbnailUrl: thumb,
    uploadDate: realUploadDate(input.uploadDate) || uploadDateFromId(input.id),
    inLanguage: IS_VIDEQSSS ? "en" : "id",
    isPartOf: { "@id": `${HOME_CANONICAL}#website` },
    copyrightHolder: { "@id": `${HOME_CANONICAL}#organization` },
    publisher: {
      "@type": "Organization",
      "@id": `${HOME_CANONICAL}#organization`,
      name: BRAND_NAME,
      url: HOME_CANONICAL,
      logo: {
        "@type": "ImageObject",
        url: SITE_LOGO,
        width: 512,
        height: 512,
      },
    },
    genre: label,
    isFamilyFriendly: false,
    url: pageUrl,
    mainEntityOfPage: pageUrl,
    potentialAction: {
      "@type": "WatchAction",
      target: pageUrl,
    },
    ...(embed ? { embedUrl: normalizeEmbedUrl(embed) } : {}),
    ...(content ? { contentUrl: content } : {}),
    ...(input.durationSec && input.durationSec > 0
      ? { duration: `PT${Math.round(input.durationSec)}S` }
      : {}),
  };
}

const BRAND_ALT_NAMES = [
  "Videy Hub",
  "videyy.icu",
  "videy hub",
];

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${HOME_CANONICAL}#website`,
    name: BRAND_NAME,
    alternateName: BRAND_ALT_NAMES,
    url: HOME_CANONICAL,
    inLanguage: IS_VIDEQSSS ? "en" : "id",
    description: HOME_DESCRIPTION,
    publisher: { "@id": `${HOME_CANONICAL}#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_ORIGIN}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": `${HOME_CANONICAL}#organization`,
    name: BRAND_NAME,
    alternateName: BRAND_ALT_NAMES,
    url: HOME_CANONICAL,
    logo: {
      "@type": "ImageObject",
      url: SITE_LOGO,
      width: 512,
      height: 512,
    },
    email: "dmca@videyy.icu",
    foundingLocation: "Indonesia",
  };
}

/** BreadcrumbList untuk halaman non-watch (kategori, tentang). */
export function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

/** CollectionPage untuk halaman kategori, terhubung ke WebSite brand. */
export type JsonLdListItem = { id: string; title: string };

/** First grid page items for ItemList (watch URLs). Drops excluded/blank titles. */
export function listItemsFrom(items: ReadonlyArray<{ id: string; title?: string | null }> | undefined | null): JsonLdListItem[] {
  return (items || [])
    .map((v) => ({ id: String(v.id || ""), title: cleanDisplayTitle(String(v.title || "")) }))
    .filter((v) => v.id && v.title && !/andini\s*permata/i.test(v.title));
}

export function collectionPageJsonLd(input: {
  name: string;
  url: string;
  description: string;
  lang?: "id" | "en";
  items?: JsonLdListItem[];
  startPosition?: number;
}) {
  const items = input.items || [];
  const start = input.startPosition || 1;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    url: input.url,
    description: input.description,
    inLanguage: input.lang || (IS_VIDEQSSS ? "en" : "id"),
    isPartOf: { "@id": `${HOME_CANONICAL}#website` },
    publisher: { "@id": `${HOME_CANONICAL}#organization` },
    ...(items.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: items.length,
            itemListElement: items.map((v, i) => ({
              "@type": "ListItem",
              position: start + i,
              url: `${SITE_ORIGIN}/watch/${encodeURIComponent(v.id)}`,
              name: v.title,
            })),
          },
        }
      : {}),
  };
}

export const ABOUT_TITLE = IS_VIDEQSSS ? `About ${SITE_NAME} - Official videqsss.icu` : `Tentang ${SITE_NAME} - Situs Resmi videyy.icu`;
export const ABOUT_DESCRIPTION = IS_VIDEQSSS
  ? "About Videqsss: the official videqsss.icu, a curated 18+ catalog of Indonesian videos. How to recognise the real site and how to reach us."
  : "Tentang Videy Hub: situs resmi videyy.icu, katalog video dewasa 18+ yang dikurasi sendiri. Cara mengenali situs asli dan kontak.";

export function websiteJsonLd() {
  return { "@context": "https://schema.org", ...websiteNode() };
}

export function organizationJsonLd() {
  return { "@context": "https://schema.org", ...organizationNode() };
}

/** Satu blok JSON-LD beranda (WebSite + Organization). Hanya dipasang di beranda, bukan di root. */
export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [websiteNode(), organizationNode()],
  };
}

/**
 * SEO title for watch pages whose stored title says nothing to a searcher: bot placeholders
 * ("Koleksi Dr. Pinguin Bokep 18"), bare "videy"/"video N" names, or titles that are mostly
 * non-Latin (Chinese Byse uploads). Only <title>, meta description and og/twitter title use it; the
 * visible H1/card title and the data files keep the stored title. Deterministic per video id, so
 * every page gets a stable, (practically) unique title. No minor-related words, ever.
 */
const WEAK_TITLE_RES = [
  /^(?:(?:koleksi\s+)?dr\.?\s*pinguin|videy\s+hub)(?:\s+bokep)?\s*#?\d*$/i,
  /^(?:drpinguin\s+)?videy(?:\s+koleksidrpinguin(?:\.com)?)?\s*#?\d*$/i,
  /^(?:video|vid|bokep|untitled|tanpa\s+judul)\s*#?\d*$/i,
  /^[\w-]{0,3}$/,
];

function mostlyNonLatin(s: string): boolean {
  const letters = s.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (!letters) return false;
  const latin = (letters.match(/[A-Za-z\u00C0-\u024F]/g) || []).length;
  return latin / letters.length < 0.5;
}

export function isWeakVideoTitle(raw?: string | null): boolean {
  const t = withoutDomainSuffix(cleanDisplayTitle(raw)).trim();
  if (!t || t === "Video") return true;
  if (WEAK_TITLE_RES.some((re) => re.test(t))) return true;
  return mostlyNonLatin(t);
}

function generatedPhrases(raw: string, category?: string | null): string[] {
  const t = String(raw || "");
  const cjk = /[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(t);
  const key = (category || "").trim().toLowerCase();
  if (IS_VIDEQSSS) {
    if (cjk) return ["Chinese AI Short Drama Video", "Chinese Adult Short Film", "Asian Adult Video"];
    const lab = safeSeoLabel(category);
    return !key || key === "bokep" || key === "lainnya"
      ? ["Indonesian Amateur Video", "New Indonesian Viral Video", "Indonesian Homemade Video"]
      : [`Indonesian ${lab} Video`, `New Indonesian ${lab} Video`, `Indonesian ${lab} Clip`];
  }
  if (cjk && /(ai短剧|短剧|\bai\b|ＡＩ)/i.test(t)) {
    return [
      "Bokep AI China Short Drama Terbaru",
      "Video AI China Short Drama Hot",
      "Film Pendek AI China Dewasa Terbaru",
      "Bokep AI China Viral Terbaru",
    ];
  }
  if (cjk) return ["Bokep China Terbaru", "Video Bokep China Viral", "Bokep Asia China Hot Terbaru"];
  if (key === "videy") return ["Video Viral Videy Terbaru", "Bokep Videy Viral Terbaru", "Video Videy Indo Viral"];
  if (!key || key === "bokep" || key === "lainnya") {
    return ["Bokep Indo Viral Terbaru", "Video Bokep Indo Terbaru", "Bokep Indo Hot Viral", "Koleksi Bokep Indo Terbaru"];
  }
  const label = safeSeoLabel(category);
  return [`Bokep ${label} Terbaru`, `Video Bokep ${label} Viral`, `Bokep ${label} Indo Terbaru`];
}

export type GeneratedVideoSeo = { title: string; ogTitle: string; description: string };

export function generatedVideoSeo(item: { id?: string | null; title: string; category?: string | null }): GeneratedVideoSeo | null {
  if (!isWeakVideoTitle(item.title)) return null;
  const id = String(item.id || item.title || "");
  const phrases = generatedPhrases(item.title, item.category);
  const phrase = phrases[stablePick(`${id}|p`, phrases.length)]!;
  const n = 100 + stablePick(`${id}|n`, 9900);
  const ogTitle = `${phrase} #${n}`;
  const title = `${ogTitle} | ${SITE_NAME}`;
  const leads = IS_VIDEQSSS ? [
    `Watch ${phrase} #${n} free on your phone, no sign-up.`,
    `${phrase} #${n}: smooth streaming on phone and desktop.`,
    `Stream ${phrase} #${n}, new uploads daily on ${SITE_NAME}.`,
  ] : [
    `Nonton ${phrase} #${n} gratis di HP, langsung putar tanpa daftar.`,
    `${phrase} #${n}: streaming lancar di HP maupun desktop, tanpa ribet.`,
    `Tonton ${phrase} #${n}, update koleksi tiap hari di ${SITE_NAME}.`,
  ];
  const closes = IS_VIDEQSSS
    ? ["Adults 18+ only.", "For viewers 18 and over.", "Adult content, 18+ only."]
    : ["Khusus penonton 18+.", "Hanya untuk usia 18 tahun ke atas.", "Konten dewasa, 18+ saja."];
  const description = clipAtWord(
    `${leads[stablePick(`${id}|l`, leads.length)]} ${IS_VIDEQSSS ? `Latest picks from ${SITE_NAME}.` : `Pilihan terbaru dari ${SITE_NAME}.`} ${closes[stablePick(`${id}|c`, closes.length)]}`,
    158,
  );
  return { title, ogTitle, description };
}
