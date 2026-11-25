import { useEffect, useState } from "react";
import { useTr } from "@/lib/ui-lang";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { LanguageSwitcher } from "./language-switcher";
import { showKirimNav } from "@/lib/kirim-videy";
import { IS_VIDEQSSS, SITE_NAME } from "@/lib/seo";

function BrandMark() {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <svg
        viewBox="0 0 32 32"
        className={
          IS_VIDEQSSS
            ? "size-9 rounded-md bg-gradient-to-br from-[#f4b942] to-[#0f766e] shadow-[0_0_18px_-4px_#f4b94288] sm:size-10"
            : "size-9 rounded-xl bg-gradient-to-br from-[#9d8cff] to-[#6d5ef0] shadow-[0_0_18px_-4px_#9d8cff88] sm:size-10"
        }
        aria-hidden="true"
      >
        <path d="M12 9.5v13l11-6.5z" fill="#0b0b14" />
      </svg>
      <span className="font-display text-[13px] font-bold leading-none tracking-[0.08em] text-foreground sm:text-sm">
        {IS_VIDEQSSS ? "VIDEQ" : "VIDEY"}
        <span className={IS_VIDEQSSS ? "text-[#f4b942]" : "text-primary"}>{IS_VIDEQSSS ? "SSS" : "HUB"}</span>
      </span>
      <span className="rounded-md border border-primary/50 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
        18+
      </span>
    </span>
  );
}


export function Header({ query }: { query?: string }) {
  const tr = useTr();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [draft, setDraft] = useState(query ?? "");
  const debounced = useDebounce(draft, 400);

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
          aria-label={tr(`${SITE_NAME} (beranda)`, `${SITE_NAME} (home)`)}
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
            placeholder={tr("Cari judul…", "Search titles…")}
            className="h-10 rounded-full border-border bg-surface-2/80 pl-10 pr-9 text-sm shadow-none backdrop-blur transition-colors placeholder:text-muted focus-visible:border-primary/60 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-primary/25 sm:h-11"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            aria-label={tr("Cari judul", "Search titles")}
          />
          {draft ? (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-foreground"
              onClick={() => setDraft("")}
              aria-label={tr("Hapus pencarian", "Clear search")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </form>
        {showKirimNav(pathname, IS_VIDEQSSS) ? (
          <Link
            to="/kirim"
            className="hidden shrink-0 whitespace-nowrap text-xs font-semibold text-primary underline-offset-2 hover:underline sm:inline sm:text-sm"
          >
            {tr("Kirim Video", "Submit a video")}
          </Link>
        ) : null}
        {/* videqsss.icu is English site-wide: no ID/EN switch there. */}
        <LanguageSwitcher />
      </div>
      {showKirimNav(pathname, IS_VIDEQSSS) ? (
        <div className="border-t border-border/60 px-3 py-2 sm:hidden">
          <Link to="/kirim" className="text-sm font-semibold text-primary underline-offset-2 hover:underline">
            {tr("Kirim Video", "Submit a video")}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
