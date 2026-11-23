import { usePublicHref, usePublicLanguage } from "@/lib/public-ui";
import { collectionLabel } from "@/lib/page-copy";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { keywordHref } from "@/lib/catalog/halaman";
import { landingsForSite } from "@/lib/catalog/landing";
import { jsonLdString } from "@/lib/json-ld";
import { hreflangLinks } from "@/lib/catalog/en-landing";
import { DEFAULT_OG, HOME_CANONICAL, IS_VIDEQSSS, SITE_NAME, SITE_ORIGIN, breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo";

const TITLE = "Genre Video IndoAV dan UserBokep | videqsss.icu";
const DESCRIPTION =
  "Daftar genre di Videqsss: jilbab, STW, amatir, Malaysia, dan lainnya. Hanya IndoAV dan UserBokep, khusus 18+.";

export const Route = createFileRoute("/genre/")({
  beforeLoad: () => {
    if (!IS_VIDEQSSS) throw redirect({ href: `${SITE_ORIGIN}/cari`, statusCode: 301 });
    // videqsss is English site-wide: the Indonesian genre hub moves to /en.
  },
  head: () => {
    const url = `${SITE_ORIGIN}/genre`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:image", content: DEFAULT_OG },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangLinks("/genre", "/en", SITE_ORIGIN)],
      scripts: [
        { type: "application/ld+json", children: jsonLdString(collectionPageJsonLd({ name: TITLE, url, description: DESCRIPTION })) },
        {
          type: "application/ld+json",
          children: jsonLdString(
            breadcrumbJsonLd([
              { name: SITE_NAME, url: HOME_CANONICAL },
              { name: "Genre", url },
            ]),
          ),
        },
      ],
    };
  },
  component: GenreIndex,
});

function GenreIndex() {
  const publicHref = usePublicHref();
  const language = usePublicLanguage();
  const pages = landingsForSite("videqsss");
  return (
    <Shell>
      <section className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-100">Genre</h1>
        <p className="max-w-2xl text-sm text-zinc-400">{DESCRIPTION}</p>
        <p className="text-sm text-zinc-500">
          English collections:{" "}
          <a href="/en" hrefLang="en" className="text-[#f4b942] underline-offset-2 hover:underline">
            /en
          </a>
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {pages.map((l) => (
            <li key={l.slug}>
              <a href={publicHref(keywordHref(l.slug, 1))} className="text-[#f4b942] underline-offset-2 hover:underline">
                {language === "id" ? l.h1 : collectionLabel(l.slug, language)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
