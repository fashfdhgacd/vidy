import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { prefetchCatalog } from "@/lib/catalog/client";
import { DEFAULT_PAGE_SIZE } from "@/lib/catalog/types";

const QUICK_CATS = [
  { slug: "bokep", label: "Video Unggulan" },
  { slug: "paling-ditonton", label: "Paling Banyak Ditonton" },
  { slug: "jav", label: "Jav" },
  { slug: "hentai", label: "Hentai" },
  { slug: "ai-plus", label: "AI+" },
  { slug: "videy", label: "Videy" },
  { slug: "paling-disukai", label: "Paling Banyak Disukai" },
] as const;

function BrandMark() {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        className="size-9 rounded-xl bg-gradient-to-br from-[#9d8cff] to-[#6d5ef0] shadow-[0_0_18px_-4px_#9d8cff88] sm:size-10"
        aria-hidden="true"
      >
        <path d="M12 9.5v13l11-6.5z" fill="#0b0b14" />
      </svg>
      <span className="font-display text-[13px] font-bold leading-none tracking-[0.08em] text-foreground sm:text-sm">
        VIDEY<span className="text-primary">HUB</span>
      </span>
      <span className="rounded-md border border-primary/50 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
        18+
      </span>
    </span>
  );
}

export function Header({
  query,
  category,
}: {
  query?: string;
  category?: string;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onCategoriesPage = pathname === "/kategori" || pathname.startsWith("/kategori/");
  const [draft, setDraft] = useState(query ?? "");
  const debounced = useDebounce(draft, 400);
  const quickActive = Boolean(category && QUICK_CATS.some((c) => c.slug === category));

  useEffect(() => {
    setDraft(query ?? "");
  }, [query]);

  useEffect(() => {
    const next = debounced.trim();
    const current = (query ?? "").trim();
    if (next === current) return;
    if (next.length === 1) return;
    void navigate({
      to: "/",
      search: (prev) => {
        if ((prev.q ?? "").trim() === next) return prev;
        return {
          ...prev,
          q: next || undefined,
          category: undefined,
          page: undefined,
        };
      },
    });
  }, [debounced, navigate, query]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2.5 px-3 sm:h-16 sm:gap-3 sm:px-6">
        <Link
          to="/"
          search={{ q: undefined, category: undefined }}
          aria-label="Videy Hub (beranda)"
          className="flex shrink-0 items-center"
        >
          <BrandMark />
        </Link>

        <form
          className="relative min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const next = draft.trim();
            void navigate({
              to: "/",
              search: next ? { q: next, category: undefined } : { q: undefined, category: undefined },
            });
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Cari judul…"
            className="h-10 rounded-full border-border bg-surface-2/80 pl-10 pr-9 text-sm shadow-none backdrop-blur transition-colors placeholder:text-muted focus-visible:border-primary/60 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary/25 sm:h-11"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label="Cari judul"
          />
          {draft ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-foreground"
              onClick={() => setDraft("")}
              aria-label="Hapus pencarian"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </form>

        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label="Semua kategori"
          className="size-10 shrink-0 rounded-full border border-border bg-surface-2/60 hover:border-primary/50 hover:bg-surface-2 sm:size-11"
        >
          <Link to="/kategori">
            <LayoutGrid className="size-5" />
          </Link>
        </Button>
      </div>

      <nav className="mx-auto max-w-[1600px] px-3 sm:px-6" aria-label="Navigasi cepat">
        <ul className="-mx-3 flex gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
          <li className="shrink-0">
            <Link
              to="/"
              search={{ q: undefined, category: undefined }}
              className={chipClass(!query && !category && !onCategoriesPage)}
            >
              Terbaru
            </Link>
          </li>
          {QUICK_CATS.map((cat) => (
            <li key={cat.slug} className="shrink-0">
              <Link
                to="/kategori/$slug"
                params={{ slug: cat.slug }}
                className={chipClass(category === cat.slug && !query)}
                onMouseEnter={() =>
                  prefetchCatalog({
                    type: "category",
                    category: cat.slug,
                    page: 1,
                    limit: DEFAULT_PAGE_SIZE,
                  })
                }
                onFocus={() =>
                  prefetchCatalog({
                    type: "category",
                    category: cat.slug,
                    page: 1,
                    limit: DEFAULT_PAGE_SIZE,
                  })
                }
              >
                {cat.label}
              </Link>
            </li>
          ))}
          <li className="shrink-0">
            <Link to="/kategori" className={chipClass(onCategoriesPage && !quickActive)}>
              Kategori
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}

function chipClass(active: boolean) {
  return cn(
    "inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-all duration-150",
    active
      ? "border-primary bg-primary text-primary-foreground shadow-[0_0_16px_-4px_#9d8cff99]"
      : "border-border bg-surface/60 text-muted hover:border-primary/40 hover:text-foreground",
  );
}
