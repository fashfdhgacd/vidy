import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AgeGate } from "@/components/age-gate";
import { Banner300x100, InPagePush, VideoSlider } from "@/components/ad-slot";
import { onPagePopClick } from "@/components/card-popunder";
import { SITE_NAME, TITLE_SUFFIX } from "@/lib/seo";
import { Header } from "./header";

export function Shell({
  children,
  query,
}: {
  children: ReactNode;
  query?: string;
}) {
  return (
    <AgeGate>
      <div className="flex min-h-dvh flex-col bg-background text-foreground" onClickCapture={onPagePopClick}>
        <InPagePush />
        <VideoSlider />
        <Header query={query} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-16 pt-4 sm:px-6 sm:pb-14 sm:pt-6">
          <Banner300x100 className="mx-auto mb-4 w-[300px] max-w-full" />
          {children}
        </main>
        <footer className="mt-auto border-t border-border/60 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-7 text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-9">
            <div className="space-y-2">
              <p className="font-display text-sm font-bold tracking-[0.08em] text-foreground sm:text-lg">
                {SITE_NAME} ·{" "}
                <a href={`https://${TITLE_SUFFIX}`} className="underline-offset-2 hover:text-foreground hover:underline">
                  {TITLE_SUFFIX}
                </a>{" "}
                · 18+
              </p>
              <p className="text-xs text-foreground/80 sm:text-sm">{SITE_NAME} — streaming video tanpa ribet</p>
              <p className="text-[11px] text-muted sm:text-xs">
                Koleksi ini dimaksudkan untuk pengguna dewasa. Pastikan Anda berusia 18+ sebelum melanjutkan.
              </p>
              <p className="text-[11px] text-muted sm:text-xs">
                Konten dan gambar disediakan oleh pihak ketiga. Kami tidak bertanggung jawab atas materi eksternal.
              </p>
            </div>
            <div className="flex items-center justify-between gap-6 sm:justify-end sm:gap-8">
              <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" aria-label="Legal">
                <Link to="/tentang" className="hover:text-foreground hover:underline">
                  Tentang
                </Link>
                <Link to="/2257" className="hover:text-foreground hover:underline">
                  2257
                </Link>
                <Link to="/privasi" className="hover:text-foreground hover:underline">
                  Privasi
                </Link>
                <Link to="/syarat" className="hover:text-foreground hover:underline">
                  Syarat
                </Link>
                <Link to="/dmca" className="hover:text-foreground hover:underline">
                  DMCA
                </Link>
                <Link to="/kontak" className="hover:text-foreground hover:underline">
                  Kontak
                </Link>
                <Link to="/teman" className="hover:text-foreground hover:underline">
                  Teman
                </Link>
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
