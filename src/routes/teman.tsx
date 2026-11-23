import { usePublicHref, usePublicLanguage, usePublicText } from "@/lib/public-ui";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { EN_LEGAL, FriendsEn, legalHeadEn } from "@/components/legal-en";
import { UI_EN } from "@/lib/ui-lang";
import { jsonLdString } from "@/lib/json-ld";
import { DEFAULT_OG, HOME_CANONICAL, SITE_NAME, SITE_ORIGIN, breadcrumbJsonLd } from "@/lib/seo";

const URL_TEMAN = `${SITE_ORIGIN}/teman`;
const TITLE = `Situs Teman & Direktori | ${SITE_NAME}`;
const DESCRIPTION =
  "Daftar situs teman dan direktori situs dewasa yang mencantumkan Videy Hub (videyy.icu). Khusus 18+.";

/** Reciprocal links for adult-site directories that list videyy.icu. */
export const TEMAN_LINKS = [
  {
    name: "Porn Whitelist: Indonesian Porn Sites",
    href: "https://pornwhitelist.com/indonesian-porn-sites/",
    note: "Direktori situs bokep Indonesia yang sudah dicek.",
  },
  {
    name: "MrPornGeek",
    href: "https://mrporngeek.com/",
    note: "Ulasan dan daftar situs dewasa terbaik.",
  },
  {
    name: "The Porn List: Indonesian",
    href: "https://thepornlist.net/indonesian/",
    note: "Kumpulan situs video Indonesia.",
  },
] as const;

export const Route = createFileRoute("/teman")({
  head: () =>
    UI_EN
      ? legalHeadEn("/teman", EN_LEGAL.friends.title, EN_LEGAL.friends.description, "Friend Sites")
      : {
          meta: [
            { title: TITLE },
            { name: "description", content: DESCRIPTION },
            { property: "og:title", content: TITLE },
            { property: "og:description", content: DESCRIPTION },
            { property: "og:url", content: URL_TEMAN },
            { property: "og:type", content: "website" },
            { property: "og:image", content: DEFAULT_OG },
            { name: "robots", content: "index,follow" },
          ],
          links: [{ rel: "canonical", href: URL_TEMAN }],
          scripts: [
            {
              type: "application/ld+json",
              children: jsonLdString(
                breadcrumbJsonLd([
                  { name: SITE_NAME, url: HOME_CANONICAL },
                  { name: "Situs Teman", url: URL_TEMAN },
                ]),
              ),
            },
          ],
        },
  component: function LocalizedPage() {
    return usePublicLanguage() === "en" ? <FriendsEn links={TEMAN_LINKS} /> : <Page />;
  },
});

function Page() {
  const publicHref = usePublicHref();
  const localText = usePublicText();
  return (
    <LegalPage title={localText("Situs Teman & Direktori")}>
      <p>
        Situs dan direktori di bawah ini mencantumkan <strong>videyy.icu</strong>{localText(". Semuanya khusus untuk pengunjung 18+.")}
      </p>
      <ul className="space-y-3">
        {TEMAN_LINKS.map((l) => (
          <li key={l.href} className="border border-white/15 p-3">
            <a
              className="font-semibold text-teal-400 underline-offset-2 hover:underline"
              href={publicHref(l.href)}
              target="_blank"
              rel="noopener"
            >
              {l.name}
            </a>
            <p className="text-xs text-white/65">{l.note}</p>
          </li>
        ))}
      </ul>
      <p>
        {localText("Punya situs dewasa dan mau tukar link? Hubungi kami lewat halaman")}{" "}
        <a className="underline" href={publicHref("/kontak")}>
          {localText("Kontak")}
        </a>
        .
      </p>
    </LegalPage>
  );
}
