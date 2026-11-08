"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";

type Comment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};

function timeLabel(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Komentar per video — wajib akun (email/password Better Auth).
 * GET publik; POST butuh session; server menolak non-akun dengan 401.
 */
export function VideoComments({ videoId }: { videoId: string }) {
  const { user, isPending } = useCurrentUserState();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?video=${encodeURIComponent(videoId)}`, { cache: "no-store" });
      const d = (await res.json().catch(() => null)) as
        | { ok?: boolean; comments?: Comment[]; total?: number }
        | null;
      if (d?.ok) {
        setComments(d.comments || []);
        setTotal(Number(d.total || 0));
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    }
  }, [videoId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ video: videoId, body }),
      });
      const d = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; comment?: Comment } | null;
      if (res.status === 401) {
        setError("login_required");
      } else if (d?.ok && d.comment) {
        setComments((prev) => [...(prev || []), d.comment!]);
        setTotal((t) => t + 1);
        setDraft("");
      } else {
        setError(d?.error || "gagal");
      }
    } catch {
      setError("gagal");
    } finally {
      setBusy(false);
    }
  }

  async function submitAuth() {
    if (!email.trim() || password.length < 8 || authBusy) return;
    setAuthBusy(true);
    setAuthError("");
    try {
      const fn =
        mode === "signup"
          ? () => authClient.signUp.email({ email: email.trim(), password, name: email.trim().split("@")[0] })
          : () => authClient.signIn.email({ email: email.trim(), password });
      const { error } = await fn();
      if (error) {
        setAuthError(error.message || "gagal");
        return;
      }
      await authClient.getSession();
    } catch {
      setAuthError("gagal terhubung");
    } finally {
      setAuthBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-[#2dd4bf]/50 focus:outline-none";

  return (
    <section className="mt-8 max-w-3xl space-y-4" aria-label="Komentar">
      <h2 className="font-display text-xl text-foreground">
        Komentar{total ? ` (${total})` : ""}
      </h2>

      {isPending ? null : user ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              Masuk sebagai <span className="text-zinc-300">{user.displayName || user.primaryEmail || "Member"}</span>
            </p>
            <button
              type="button"
              className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
              onClick={() => void signOut("/watch/" + videoId)}
            >
              Keluar
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={600}
            placeholder="Tulis komentar…"
            className={inputCls}
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-600">{draft.length}/600</span>
            <button
              type="button"
              disabled={busy || draft.trim().length < 2}
              onClick={() => void submit()}
              className="rounded-lg border border-[#2dd4bf] bg-[#2dd4bf] px-4 py-1.5 text-[13px] font-medium text-zinc-950 hover:bg-[#5eead4] disabled:opacity-50"
            >
              {busy ? "Kirim…" : "Kirim"}
            </button>
          </div>
          {error && error !== "login_required" ? (
            <p className="text-[12px] text-red-300">{error === "rate_limited" ? "Terlalu banyak komentar, coba lagi nanti." : "Komentar gagal dikirim."}</p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-sm text-zinc-300">Masuk untuk berkomentar.</p>
          <div className="mt-1 flex gap-2 text-[12px]">
            <button
              type="button"
              className={mode === "signup" ? "text-[#5eead4] underline" : "text-zinc-500 hover:text-zinc-300"}
              onClick={() => setMode("signup")}
            >
              Daftar
            </button>
            <span className="text-zinc-700">·</span>
            <button
              type="button"
              className={mode === "login" ? "text-[#5eead4] underline" : "text-zinc-500 hover:text-zinc-300"}
              onClick={() => setMode("login")}
            >
              Masuk
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              className={inputCls}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitAuth();
              }}
              placeholder="Password (min. 8 karakter)"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className={inputCls}
            />
            <button
              type="button"
              disabled={authBusy || !email.trim() || password.length < 8}
              onClick={() => void submitAuth()}
              className="rounded-lg border border-white/[0.15] bg-white/[0.06] px-4 py-1.5 text-[13px] font-medium text-zinc-100 hover:bg-white/[0.1] disabled:opacity-50"
            >
              {authBusy ? "…" : mode === "signup" ? "Buat Akun" : "Masuk"}
            </button>
            {authError ? <p className="text-[12px] text-red-300">{authError}</p> : null}
          </div>
        </div>
      )}

      {comments === null ? (
        <p className="text-[13px] text-zinc-500">Memuat komentar…</p>
      ) : comments.length === 0 ? (
        <p className="text-[13px] text-zinc-500">Belum ada komentar. Jadilah yang pertama.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-zinc-200">{c.author}</span>
                <span className="shrink-0 text-[11px] text-zinc-600">{timeLabel(c.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-zinc-300">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
