import { useEffect, useState } from "react";
import { tr, UI_EN } from "@/lib/ui-lang";
import { InstallApp } from "@/components/install-app";
import { PushButton } from "@/components/video/push-button";

/**
 * Ajakan untuk pengunjung yang balik lagi (beranda + kategori), dirender di bawah pager supaya tidak
 * menggeser grid/iklan (CLS). Semua murni klien (sessionStorage/localStorage), tanpa tulis server.
 * - Banner "Simpan alamat ini" (sekali, bisa ditutup) + alamat cadangan videyy.icu.
 * - Mulai pageview ke-2 di sesi ini: tombol notifikasi (PushButton, tetap patuh flag tutupnya sendiri)
 *   dan "Pasang aplikasi".
 */
const VIEWS_KEY = "kdp:pv:v1";
const BOOKMARK_KEY = "kdp:bookmark:v1";

function bumpViews(): number {
  try {
    const n = (Number(window.sessionStorage.getItem(VIEWS_KEY)) || 0) + 1;
    window.sessionStorage.setItem(VIEWS_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

export function ReturnVisitor() {
  const [views, setViews] = useState(0);
  const [bookmark, setBookmark] = useState(false);

  useEffect(() => {
    setViews(bumpViews());
    try {
      setBookmark(!window.localStorage.getItem(BOOKMARK_KEY));
    } catch {
      setBookmark(false);
    }
  }, []);

  function closeBookmark() {
    try {
      window.localStorage.setItem(BOOKMARK_KEY, "1");
    } catch {
      /* ignore */
    }
    setBookmark(false);
  }

  if (!views) return null;
  const repeat = views >= 2;
  if (!bookmark && !repeat) return null;

  return (
    <div className="mt-6 space-y-3">
      {bookmark ? (
        <div className="flex items-start justify-between gap-3 rounded-lg border border-teal-400/30 bg-teal-400/[0.06] p-3 text-sm text-zinc-200">
          <p>
            <strong className="text-teal-300">{tr("Simpan alamat ini:", "Save this address:")}</strong>{" "}
            {UI_EN
              ? "videqsss.icu. Press ☆ / Ctrl+D or browser menu → Bookmark so it is easy to find again."
              : "videyy.icu. Tekan ☆ / Ctrl+D atau menu browser → Bookmark supaya mudah dibuka lagi."}
          </p>
          <button
            type="button"
            onClick={closeBookmark}
            aria-label={tr("Tutup", "Close")}
            className="shrink-0 px-1 text-lg leading-none text-zinc-400 hover:text-white"
          >
            ×
          </button>
        </div>
      ) : null}
      {repeat ? (
        <div className="flex flex-wrap items-start gap-4">
          <PushButton />
          <InstallApp />
        </div>
      ) : null}
    </div>
  );
}
