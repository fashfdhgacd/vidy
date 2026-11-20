import { useEffect } from "react";
import { SafeBoundary } from "@/components/safe-boundary";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { EmptyState, ErrorState } from "@/components/states/feed-states";
import { CatalogPager } from "@/components/video/catalog-pager";
import { Hero } from "@/components/video/hero";
import { RecentlyWatched } from "@/components/video/recently-watched";
import { VideoGrid, VideoGridSkeleton } from "@/components/video/video-grid";
import { queryCatalog } from "@/lib/catalog/service";
import { DEFAULT_PAGE_SIZE, type VideoCard } from "@/lib/catalog/types";
import { useCatalogFeed } from "../hooks/use-catalog";
import { jsonLdString } from "@/lib/json-ld";
import { homeHref } from "@/lib/catalog/halaman";
import { landingsForSite } from "@/lib/catalog/landing";
import { enHref } from "@/lib/catalog/halaman";
import { enSlugForId, findEnLanding } from "@/lib/catalog/en-landing";
import { fmtNum, tr } from "@/lib/ui-lang";
import { gridAdsOn } from "@/lib/ads/spots";
import { DEFAULT_OG, HOME_CANONICAL, HOME_H1, HOME_INTRO, IS_VIDEQSSS, SITE_NAME, SITE_ORIGIN, TITLE_SUFFIX, homeJsonLd, homeSeo } from "@/lib/seo";
import { ReturnVisitor } from "@/components/return-visitor";

type HomeSearch = {
  q?: string;
  category?: string;
  page?: number;
};

function parsePage(value: unknown): number | undefined {
  const n = Math.floor(Number(value));
  // No upper cap here: a cap made validateSearch rewrite ?page=9999 to ?page=500 (extra 307 hop);
  // the loader sends any page past the end straight to the real last page.
  if (!Number.isSafeInteger(n) || n <= 1) return undefined;
  return n;
}

function isSchemaPlaceholder(q?: string): boolean {
  const t = (q || "").trim().toLowerCase();
  return t === "{search_term_string}" || t === "search_term_string";
}

export async function loadHome({ search }: { search: HomeSearch }) {
  const page = search.page || 1;
  if (search.q) {
    return queryCatalog({ type: "search", q: search.q, page, limit: DEFAULT_PAGE_SIZE });
  }
  return queryCatalog({ type: "home", page, limit: DEFAULT_PAGE_SIZE });
}

function seedFromLoader(loaderData: Awaited<ReturnType<typeof loadHome>>): {
  items: VideoCard[];
  featured: VideoCard[];
  total: number;
  page: number;
  limit: number;
} | null {
  if (!loaderData || !loaderData.ok) return null;
  if (loaderData.type === "home") {
    return {
      items: loaderData.latest.items,
      featured: loaderData.featured,
      total: loaderData.latest.total,
      page: loaderData.latest.page,
      limit: loaderData.latest.limit,
    };
  }
  if (loaderData.type === "search" || loaderData.type === "category" || loaderData.type === "latest") {
    return {
      items: loaderData.items,
      featured: [],
      total: loaderData.total,
      page: loaderData.page,
      limit: loaderData.limit,
    };
  }
  return null;
}

/** Halaman paginasi di atas ini: noindex,follow (link video tetap di-crawl). */
const DEEP_PAGE_NOINDEX = 5;

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
    category:
      typeof search.category === "string" && search.category.trim()
        ? search.category.trim()
        : undefined,
    page: parsePage(search.page),
  }),
  beforeLoad: ({ search }) => {
    if (isSchemaPlaceholder(search.q)) {
      throw redirect({ href: HOME_CANONICAL, statusCode: 301 });
    }
    if (search.category) {
      throw redirect({ href: HOME_CANONICAL, statusCode: 301 });
    }
  },
  loader: async ({ location }) => {
    const raw = location.search as Record<string, unknown>;
    const search: HomeSearch = {
      q: typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined,
      category:
        typeof raw.category === "string" && raw.category.trim() ? raw.category.trim() : undefined,
      page: parsePage(raw.page),
    };
    if (isSchemaPlaceholder(search.q) || search.category) {
      throw redirect({ href: HOME_CANONICAL, statusCode: 301 });
    }
    const res = await loadHome({ search });
    // Past the last page (e.g. ?page=9999): redirect to the real last page instead of an empty grid.
    const page = search.page || 1;
    if (page > 1 && res && res.ok) {
      const total = res.type === "home" ? res.latest.total : res.type === "search" ? res.total : 0;
      const limit = (res.type === "home" ? res.latest.limit : res.type === "search" ? res.limit : 0) || DEFAULT_PAGE_SIZE;
      const last = Math.max(1, Math.ceil(total / limit));
      if (total > 0 && page > last) {
        throw redirect({
          href: search.q
            ? `${HOME_CANONICAL}?${new URLSearchParams({ q: search.q, ...(last > 1 ? { page: String(last) } : {}) }).toString()}`
            : `${SITE_ORIGIN}${homeHref(last)}`,
          statusCode: 302,
        });
      }
    }
    return res;
  },
  head: ({ match }) => {
    const q = typeof match.search.q === "string" ? match.search.q : undefined;
    const page = typeof match.search.page === "number" ? match.search.page : 1;
    const seo = homeSeo(q);
    const title =
      !q && page > 1
        ? tr(`Bokep Indo Terbaru Halaman ${page} | ${SITE_NAME}`, `Newest Indonesian Amateur Videos – Page ${page} | ${SITE_NAME}`)
        : seo.title;
    const description =
      !q && page > 1
        ? tr(
            `Halaman ${page}: bokep indo terbaru, update setiap hari, streaming di ${TITLE_SUFFIX}. Khusus 18+.`,
            `Page ${page}: the newest Indonesian amateur videos, updated daily, streaming on ${TITLE_SUFFIX}. Adults 18+ only.`,
          )
        : seo.description;
    const url = q ? HOME_CANONICAL : `${SITE_ORIGIN}${homeHref(page)}`;
    const indexable = !q && page <= DEEP_PAGE_NOINDEX;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: indexable ? "index,follow" : "noindex,follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:image", content: DEFAULT_OG },
        { name: "twitter:card", content: "summary_large_image" },
        ...(!indexable ? [{ name: "googlebot", content: "noindex,follow" }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: q
        ? []
        : [{ type: "application/ld+json", children: jsonLdString(homeJsonLd()) }],
    };
  },
  component: HomePage,
});

export function HomeExperience({
  q,
  page,
  loaderData,
  onPage,
}: {
  q?: string;
  page: number;
  loaderData: Awaited<ReturnType<typeof loadHome>>;
  onPage: (next: number) => void;
}) {
  const seed = seedFromLoader(loaderData);
  const mode = q ? "search" : "home";
  const feed = useCatalogFeed({ mode, q, page }, seed);
  const heroVideos = !q && page === 1 ? feed.featured : [];
  const heroIds = new Set(heroVideos.map((v) => v.id));
  const gridItems = heroIds.size ? feed.items.filter((item) => !heroIds.has(item.id)) : feed.items;

  const title = q ? tr(`Hasil untuk “${q}”`, `Results for “${q}”`) : HOME_H1;
  const subtitle = q
    ? feed.loading && !feed.items.length
      ? tr("Mencari…", "Searching…")
      : `${fmtNum(gridItems.length ? feed.total : 0)} ${tr("hasil", "results")}`
    : feed.total
    ? `${fmtNum(feed.total)} ${tr("judul", "videos")} · ${TITLE_SUFFIX}`
    : TITLE_SUFFIX;
  const intro =
    q
      ? tr(`Hasil pencarian “${q}” di katalog Videy Hub. Konten dewasa 18+.`, `Search results for “${q}” in the ${SITE_NAME} catalog. Adults 18+ only.`)
      : HOME_INTRO;

  // Search result pages past the end (e.g. stale ?page=N kept in the URL) jump back to page 1,
  // so the count and the grid always come from the same result array.
  const searchLastPage = q && feed.total > 0 ? Math.max(1, Math.ceil(feed.total / Math.max(1, feed.limit))) : 0;
  useEffect(() => {
    if (q && searchLastPage && page > searchLastPage) onPage(1);
  }, [q, page, searchLastPage, onPage]);

  function setPage(next: number) {
    if (next === page) {
      feed.retry();
      return;
    }
    onPage(next);
  }

  if (loaderData && !loaderData.ok) {
    return (
      <Shell>
        <ErrorState
          message={(loaderData as { error?: string }).error || tr("Gagal memuat", "Could not load")}
          onRetry={() => feed.retry()}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {heroVideos.length ? (
          <SafeBoundary>
            <Hero videos={heroVideos} />
          </SafeBoundary>
        ) : null}

        {mode === "home" && page === 1 ? (
          <SafeBoundary>
            <RecentlyWatched />
          </SafeBoundary>
        ) : null}

        <section>
          <div className="mb-3">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600">{intro}</p>
            {!IS_VIDEQSSS && !q && page === 1 ? (
              <p className="mt-3 text-sm text-zinc-400">
                Punya link Videy?{" "}
                <Link to="/kirim" className="font-medium text-primary underline-offset-2 hover:underline">
                  Kirim Video
                </Link>
              </p>
            ) : null}
            {IS_VIDEQSSS && !q ? (
              <nav aria-label="Categories" className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {landingsForSite("videqsss").map((l) => {
                  const en = findEnLanding(enSlugForId(l.slug));
                  return en ? (
                    <a key={en.slug} href={enHref(en.slug, 1)} className="text-[#f4b942] underline-offset-2 hover:underline">
                      {en.h1}
                    </a>
                  ) : null;
                })}
                <a href="/en" className="text-[#f4b942] underline-offset-2 hover:underline">
                  All categories →
                </a>
              </nav>
            ) : null}
          </div>

          {feed.loading && !feed.items.length ? (
            <VideoGridSkeleton count={12} ads />
          ) : feed.error && !feed.items.length ? (
            <ErrorState message={feed.error} onRetry={feed.retry} />
          ) : !gridItems.length ? (
            <EmptyState
              title={q ? tr(`Belum ada video untuk “${q}”`, `No videos for “${q}” yet`) : tr("Kosong", "Empty")}
              description={
                q
                  ? tr("Coba kata kunci yang lebih pendek atau umum, misalnya “jilbab”, “indo”, atau “jav”.", "Try a shorter or more general keyword, for example “hijab”, “indo”, or “jav”.")
                  : tr("Belum ada video.", "No videos yet.")
              }
            />
          ) : (
            <SafeBoundary>
              <VideoGrid items={gridItems} ads={gridAdsOn()} />
            </SafeBoundary>
          )}

          <CatalogPager
            pageHref={(n) =>
              q
                ? `/?${new URLSearchParams({ q, ...(n > 1 ? { page: String(n) } : {}) }).toString()}`
                : homeHref(n)
            }
            page={page}
            total={feed.total}
            limit={feed.limit}
            loading={feed.loading}
            hasMore={feed.hasMore}
            onPage={setPage}
          />
          <SafeBoundary>
            <ReturnVisitor key={page} />
          </SafeBoundary>
        </section>
      </div>
    </Shell>
  );
}

function HomePage() {
  const { q, page: pageSearch } = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const navigate = useNavigate({ from: "/" });
  const page = pageSearch || 1;
  return (
    <HomeExperience
      q={q}
      page={page}
      loaderData={loaderData}
      onPage={(next) => {
        if (q) {
          navigate({ search: (prev: HomeSearch) => ({ ...prev, page: next > 1 ? next : undefined }) });
          return;
        }
        if (next <= 1) navigate({ to: "/", search: { q: undefined, category: undefined, page: undefined } });
        else navigate({ to: "/halaman/$page", params: { page: String(next) } });
      }}
    />
  );
}
