import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { enHref, keywordRoot } from "@/lib/catalog/halaman";
import { EN_LANDINGS, LANDING_MIN_VIDEOS, hreflangLinks } from "@/lib/catalog/en-landing";
import { enLandingCounts } from "@/lib/catalog/en-landing-query";
import { jsonLdString } from "@/lib/json-ld";
import { UiLangProvider } from "@/lib/ui-lang";
import {
  DEFAULT_OG,
  HOME_CANONICAL,
  IS_VIDEQSSS,
  SITE_NAME,
  SITE_ORIGIN,
  TITLE_SUFFIX,
  breadcrumbJsonLd,
  collectionPageJsonLd,
} from "@/lib/seo";

const TITLE = IS_VIDEQSSS
  ? `Indonesian Video Categories | ${TITLE_SUFFIX}`
  : `English Indonesian Video Collections | ${TITLE_SUFFIX}`;
const H1 = IS_VIDEQSSS ? "Video categories" : "English collections";
const DESCRIPTION = IS_VIDEQSSS
  ? `Browse Indonesian amateur videos on ${TITLE_SUFFIX} by category: hijab, couples, homemade, Malay, and more. IndoAV and UserBokep videos only, 18+.`
  : `English-language collections of Indonesian amateur videos on ${TITLE_SUFFIX}: hijab, couples, homemade, Malay, and more. 18+ only.`;

export const Route = createFileRoute("/en/")({
  loader: async () => {
    const counts = await enLandingCounts();
    return {
      pages: EN_LANDINGS.filter((l) => (counts.get(l.slug) || 0) >= LANDING_MIN_VIDEOS).map(
        (l) => ({
          slug: l.slug,
          h1: l.h1,
          count: counts.get(l.slug) || 0,
        }),
      ),
    };
  },
  head: () => {
    const url = `${SITE_ORIGIN}/en`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "en_US" },
        { property: "og:image", content: DEFAULT_OG },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "index,follow" },
      ],
      links: [
        { rel: "canonical", href: url },
        ...(IS_VIDEQSSS ? [] : hreflangLinks(`/${keywordRoot()}`, "/en", SITE_ORIGIN)),
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: jsonLdString(
            collectionPageJsonLd({ name: TITLE, url, description: DESCRIPTION, lang: "en" }),
          ),
        },
        {
          type: "application/ld+json",
          children: jsonLdString(
            breadcrumbJsonLd([
              { name: SITE_NAME, url: HOME_CANONICAL },
              { name: IS_VIDEQSSS ? "Categories" : "English", url },
            ]),
          ),
        },
      ],
    };
  },
  component: EnIndex,
});

function EnIndex() {
  const { pages } = Route.useLoaderData();
  return (
    <UiLangProvider value="en">
      <Shell>
        <section className="space-y-4">
          <h1 className="text-xl font-semibold text-zinc-100">{H1}</h1>
          <p className="max-w-2xl text-sm text-zinc-400">{DESCRIPTION}</p>
          {IS_VIDEQSSS ? null : (
            <p className="text-sm text-zinc-500">
              Looking for the Indonesian pages?{" "}
              <a
                href={`/${keywordRoot()}`}
                hrefLang="id"
                className="text-[#f4b942] underline-offset-2 hover:underline"
              >
                Open the Indonesian keyword list
              </a>
              .
            </p>
          )}
          <ul className="grid gap-2 sm:grid-cols-2">
            {pages.map((l) => (
              <li key={l.slug}>
                <a
                  href={enHref(l.slug, 1)}
                  className="text-[#f4b942] underline-offset-2 hover:underline"
                >
                  {l.h1}
                </a>
                <span className="ml-2 text-xs text-zinc-500">
                  {l.count.toLocaleString("en")} videos
                </span>
              </li>
            ))}
          </ul>
        </section>
      </Shell>
    </UiLangProvider>
  );
}
