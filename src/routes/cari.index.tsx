import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { LANDINGS } from "@/lib/catalog/landing";
import { jsonLdString } from "@/lib/json-ld";
import { DEFAULT_OG, HOME_CANONICAL, IS_VIDEQSSS, SITE_NAME, SITE_ORIGIN, breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/seo";

const TITLE = "Pencarian Populer Video Indo 18+ | videyy.icu";
const DESCRIPTION =
  "Daftar pencarian populer di Videy Hub: videy indo, STW, amatir, jilbab, threesome dan lainnya. Pilih topik, lalu tonton gratis di HP tanpa login.";

/** /cari: hub linking every hand-reviewed search landing page (internal links for crawlers and visitors). */
export const Route = createFileRoute("/cari/")({
  beforeLoad: () => {
    if (IS_VIDEQSSS) throw redirect({ href: `${SITE_ORIGIN}/genre`, statusCode: 301 });
  },
  head: () => {
    const url = `${SITE_ORIGIN}/cari`;
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
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: jsonLdString(collectionPageJsonLd({ name: TITLE, url, description: DESCRIPTION })) },
        {
          type: "application/ld+json",
          children: jsonLdString(
            breadcrumbJsonLd([
              { name: SITE_NAME, url: HOME_CANONICAL },
              { name: "Pencarian Populer", url },
            ]),
          ),
        },
      ],
    };
  },
  component: SearchHub,
});

function SearchHub() {
  return (
    <Shell>
      <section className="space-y-4">
        <h1 className="font-display text-4xl leading-none text-foreground sm:text-6xl">Pencarian Populer</h1>
        <p className="text-sm text-zinc-400">
          Topik yang paling sering dicari pengunjung. Semua konten khusus dewasa 18+; video yang belum terverifikasi tidak ditampilkan.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LANDINGS.map((l) => (
            <li key={l.slug} className="rounded-lg border border-white/10 p-3">
              <a href={`/cari/${l.slug}`} className="text-base font-semibold text-teal-200 hover:underline">
                {l.h1}
              </a>
              <p className="mt-1 line-clamp-2 text-[13px] text-zinc-400">{l.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
