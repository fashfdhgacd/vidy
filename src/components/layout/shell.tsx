import { usePublicHref } from "@/lib/public-ui";
import type { ReactNode } from "react";
import { useTr } from "@/lib/ui-lang";
import { Link, useRouterState } from "@tanstack/react-router";
import { AgeGate } from "@/components/age-gate";
import { InPagePush, VideoSlider } from "@/components/ad-slot";
import { ExoPagePopunder } from "@/components/exo-page-popunder";
import { showKirimNav } from "@/lib/kirim-videy";
import { IS_VIDEQSSS, SITE_NAME, TITLE_SUFFIX } from "@/lib/seo";
import { Header } from "./header";

export function Shell({
  children,
  query,
}: {
  children: ReactNode;
  query?: string;
}) {
  const publicHref = usePublicHref();
  const tr = useTr();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const kirim = showKirimNav(pathname, IS_VIDEQSSS);
  return (
    <AgeGate>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <ExoPagePopunder />
        <InPagePush />
        <VideoSlider />
        <Header query={query} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 pt-4 sm:px-6 sm:pb-14 sm:pt-6">
          {children}
        </main>
        <footer className="mt-auto border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-7 text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-9">
            <div className="space-y-2">
              <p className="font-display text-sm font-bold tracking-[0.08em] text-foreground sm:text-lg">
                {SITE_NAME} ·{" "}
                <a href={publicHref(`https://${TITLE_SUFFIX}`)} className="underline-offset-2 hover:text-foreground hover:underline">
                  {TITLE_SUFFIX}
                </a>{" "}
                · 18+
              </p>
              <p className="text-xs text-foreground/80 sm:text-sm">{SITE_NAME} — {tr("streaming video tanpa ribet", "hassle-free video streaming")}</p>
              <p className="text-[11px] text-muted sm:text-xs">
                {tr(
                  "Koleksi ini dimaksudkan untuk pengguna dewasa. Pastikan Anda berusia 18+ sebelum melanjutkan.",
                  "This collection is meant for adults. Make sure you are 18 or older before you continue.",
                )}
              </p>
              <p className="text-[11px] text-muted sm:text-xs">
                {tr(
                  "Konten dan gambar disediakan oleh pihak ketiga. Kami tidak bertanggung jawab atas materi eksternal.",
                  "Videos and images are provided by third parties. We are not responsible for external material.",
                )}
              </p>
            </div>
            <div className="flex items-center justify-between gap-6 sm:justify-end sm:gap-8">
              <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Legal">
                <Link to="/tentang" className="hover:text-foreground hover:underline">
                  {tr("Tentang", "About")}
                </Link>
                <Link to="/2257" className="hover:text-foreground hover:underline">
                  2257
                </Link>
                <Link to="/privasi" className="hover:text-foreground hover:underline">
                  {tr("Privasi", "Privacy")}
                </Link>
                <Link to="/syarat" className="hover:text-foreground hover:underline">
                  {tr("Syarat", "Terms")}
                </Link>
                <Link to="/dmca" className="hover:text-foreground hover:underline">
                  DMCA
                </Link>
                <Link to="/kontak" className="hover:text-foreground hover:underline">
                  {tr("Kontak", "Contact")}
                </Link>
                <Link to="/teman" className="hover:text-foreground hover:underline">
                  {tr("Teman", "Friends")}
                </Link>
                {kirim ? (
                  <Link to="/kirim" className="hover:text-foreground hover:underline">
                    Kirim Video
                  </Link>
                ) : null}
                {IS_VIDEQSSS ? null : (
                  <a href="/en" hrefLang="en" lang="en" className="hover:text-foreground hover:underline">
                    English
                  </a>
                )}
              </nav>
              <a
                href="https://www.rtalabel.org/"
                target="_blank"
                rel="noopener noreferrer"
                title="Restricted To Adults (RTA)"
                aria-label="RTA: Restricted To Adults"
                className="flex shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-surface px-2 py-1.5 text-foreground/85 transition-colors hover:border-primary/60"
              >
                <span className="font-display text-lg font-bold leading-none tracking-wider sm:text-xl">RTA</span>
                <span className="mt-1 text-[7px] font-semibold uppercase leading-[1.15] tracking-wide">
                  Restricted
                  <br />
                  To Adults
                </span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </AgeGate>
  );
}
