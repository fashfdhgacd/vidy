import { Outlet, createFileRoute, notFound, redirect, useMatches, useNavigate } from "@tanstack/react-router";
import { findLanding } from "@/lib/catalog/landing";
import { IS_VIDEQSSS, SITE_ORIGIN } from "@/lib/seo";
import { CariExperience, landingHead, loadLanding } from "./cari.$slug";

/** /genre/<slug>: canonical keyword page on videqsss. videyy 301s to /cari. */
export const Route = createFileRoute("/genre/$slug")({
  beforeLoad: ({ params }) => {
    if (!findLanding(params.slug)) throw notFound();
    if (!IS_VIDEQSSS) {
      throw redirect({ href: `${SITE_ORIGIN}/cari/${encodeURIComponent(params.slug)}`, statusCode: 301 });
    }
    if (params.slug && findLanding(params.slug)?.category === "videy") throw notFound();
  },
  loader: ({ params }) => loadLanding(params.slug, 1),
  head: ({ params, loaderData, matches }) => {
    if (matches?.some((m) => String(m.routeId).includes("halaman"))) return { meta: [], links: [] };
    return landingHead(params.slug, 1, loaderData);
  },
  component: GenrePage,
});

function GenrePage() {
  const matches = useMatches();
  const { slug } = Route.useParams();
  const data = Route.useLoaderData();
  const navigate = useNavigate({ from: "/genre/$slug" });
  if (matches.some((m) => String(m.routeId).includes("halaman"))) return <Outlet />;
  return (
    <CariExperience
      slug={slug}
      data={data}
      onPage={(next) => {
        if (next <= 1) navigate({ to: "/genre/$slug", params: { slug } });
        else navigate({ to: "/genre/$slug/halaman/$page", params: { slug, page: String(next) } });
      }}
    />
  );
}
