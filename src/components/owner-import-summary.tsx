"use client";

import { useCallback, useEffect, useState } from "react";
import { fmt } from "@/components/owner-dashboard-shared";

/**
 * Ringkasan tab: Auto Import Queue stats — active queue, processing now,
 * imported/failed today, needs review. Loads once per panel open (reloadKey),
 * no interval polling (owner panel cost rule).
 */

type Summary = {
  active: number;
  processing: number;
  doneToday: number;
  failedToday: number;
  review: number;
  duplicateToday: number;
};

export function OwnerImportSummary({
  secret,
  reloadKey,
  onOpen,
}: {
  secret: string;
  reloadKey?: number;
  onOpen?: () => void;
}) {
  const [s, setS] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    if (!secret) return;
    try {
      const res = await fetch("/api/import-queue", {
        method: "POST",
        headers: { "content-type": "application/json", "x-online-key": secret },
        body: JSON.stringify({ action: "summary" }),
        cache: "no-store",
      });
      const d = (await res.json().catch(() => null)) as { ok?: boolean; summary?: Summary } | null;
      if (d?.ok && d.summary) setS(d.summary);
    } catch {
      /* keep last value */
    }
  }, [secret]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  const items: { label: string; value: number; tone: string }[] = [
    { label: "Antrean aktif", value: s?.active ?? 0, tone: "text-zinc-50" },
    { label: "Sedang diproses", value: s?.processing ?? 0, tone: "text-sky-300" },
    { label: "Berhasil hari ini", value: s?.doneToday ?? 0, tone: "text-emerald-300" },
    { label: "Gagal hari ini", value: s?.failedToday ?? 0, tone: "text-red-300" },
    { label: "Perlu pemeriksaan", value: s?.review ?? 0, tone: "text-violet-300" },
  ];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-xl border border-white/[0.07] bg-[#101214] p-4 text-left transition hover:border-[#2dd4bf]/30"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Auto Import Queue</p>
        <span className="text-[12px] text-[#5eead4]">Buka Impor ›</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map((k) => (
          <div key={k.label}>
            <p className="truncate text-[10px] text-zinc-500">{k.label}</p>
            <p className={`text-lg font-semibold tabular-nums leading-tight ${k.tone}`}>{fmt(k.value)}</p>
          </div>
        ))}
      </div>
    </button>
  );
}
