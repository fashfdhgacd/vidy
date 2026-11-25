import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { parseHalamanParam } from "@/lib/catalog/halaman";
import { findLanding } from "@/lib/catalog/landing";
import { englishTargetForIdLanding } from "@/lib/catalog/en-landing";
import { IS_VIDEQSSS, SITE_ORIGIN } from "@/lib/seo";
import { CariExperience, landingHead, loadLanding } from "./cari.$slug";

/** /genre/<slug>/halaman/N */
export const Route = createFileRoute("/genre/$slug/halaman/$page")({
  beforeLoad: ({ params }) => {
    if (!findLanding(params.slug) || findLanding(params.slug)?.category === "videy") throw notFound();
    if (!IS_VIDEQSSS) {
      const page = parseHalamanParam(params.page);
      const path = page ? `/cari/${encodeURIComponent(params.slug)}/halaman/${page}` : `/cari/${encodeURIComponent(params.slug)}`;
      throw redirect({ href: `${SITE_ORIGIN}${path}`, statusCode: 301 });
    }
    if (!parseHalamanParam(params.page) && params.page !== "1") throw notFound();
    // videqsss is English site-wide: same page number on the English keyword page.
    const n = parseHalamanParam(params.page) || 1;
  },
  loader: ({ params }) => loadLanding(params.slug, parseHalamanParam(params.page) || 2),
  head: ({ params, loaderData }) => landingHead(params.slug, parseHalamanParam(params.page) || 2, loaderData),
  component: GenreHalaman,
});

function GenreHalaman() {
  const { slug, page: raw } = Route.useParams();
  const page = parseHalamanParam(raw) || 2;
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: "/genre/$slug/halaman/$page" });
  return (
    <CariExperience
      slug={slug}
      data={data}
      onPage={(next) => {
        if (next <= 1) navigate({ to: "/genre/$slug", params: { slug } });
        else if (next !== page) navigate({ to: "/genre/$slug/halaman/$page", params: { slug, page: String(next) } });
      }}
    />
  );
}
