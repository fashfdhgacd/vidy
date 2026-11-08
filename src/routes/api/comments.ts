import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { isOwnerRequest, ownerKeyFrom } from "@/lib/owner-auth";
import { getDetail } from "@/lib/catalog/local";
import { publicIdBeforeBuild } from "@/lib/catalog/local-cache";

/**
 * Komentar user per video (videy-hub).
 *  - GET  ?video=<id>           → komentar publik, terbaru di akhir (max 200)
 *  - POST { video, body }       → wajib session Better Auth (akun)
 *  - DELETE { id }              → moderasi owner (x-online-key)
 *
 * Tidak ada storage error yang di-echo ke client; id video harus video publik
 * di katalog (pola yang sama dengan /api/like).
 */

const BOT_UA = /bot|crawl|spider|slurp|headless|curl\/|wget|python-requests|preview/i;
const MAX_BODY = 600;
const MAX_PER_HOUR = 30;
const PAGE = 200;

const knownIds = new Map<string, { ok: boolean; at: number }>();
const KNOWN_TTL_MS = 10 * 60_000;
const KNOWN_MAX = 5000;

async function isCommentableId(id: string): Promise<boolean> {
  const now = Date.now();
  const hit = knownIds.get(id);
  if (hit && now - hit.at < KNOWN_TTL_MS) return hit.ok;
  let ok = false;
  try {
    const early = await publicIdBeforeBuild(id);
    if (early !== null) ok = early;
    else {
      await getDetail(id);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (knownIds.size >= KNOWN_MAX) knownIds.clear();
  knownIds.set(id, { ok, at: now });
  return ok;
}

function validVideoId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{3,64}$/.test(id);
}

type CommentRow = {
  id: string;
  video_id: string;
  author_name: string;
  body: string;
  created_at: string | Date;
};

function toComment(r: CommentRow) {
  return {
    id: r.id,
    author: r.author_name,
    body: r.body,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

async function sessionUser(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    const u = session?.user as { id?: string; name?: string | null; email?: string | null } | undefined;
    if (!u?.id) return null;
    const name = String(u.name || u.email || "Member").trim().slice(0, 40) || "Member";
    return { id: String(u.id), name };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/comments")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get("video");
        if (!validVideoId(id)) {
          return Response.json({ ok: false, error: "bad video" }, { status: 400 });
        }
        if (!(await isCommentableId(id))) {
          return Response.json({ ok: false, error: "not_found" }, { status: 404 });
        }
        try {
          const sql = await getSql();
          const rows = await sql.query<CommentRow>(
            `select id, video_id, author_name, body, created_at
               from video_comments
              where video_id = $1
              order by created_at desc
              limit $2`,
            [id, PAGE],
          );
          const total = await sql.query<{ n: number }>(
            "select count(*)::int as n from video_comments where video_id = $1",
            [id],
          );
          // desc → asc supaya UI tinggal render berurutan.
          const comments = rows.reverse().map(toComment);
          return Response.json(
            { ok: true, video: id, comments, total: Number(total[0]?.n || comments.length) },
            { headers: { "cache-control": "public, max-age=10, s-maxage=10" } },
          );
        } catch (err) {
          console.error("[comments] GET failed:", err instanceof Error ? err.message.slice(0, 160) : err);
          return Response.json({ ok: false, error: "storage" }, { status: 503 });
        }
      },

      POST: async ({ request }) => {
        const ua = request.headers.get("user-agent") || "";
        if (BOT_UA.test(ua) && !/Mozilla/.test(ua)) {
          return Response.json({ ok: false, error: "bot" }, { status: 403 });
        }
        let body: { video?: unknown; body?: unknown } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ ok: false, error: "bad json" }, { status: 400 });
        }
        const video = body.video;
        if (!validVideoId(video)) {
          return Response.json({ ok: false, error: "bad video" }, { status: 400 });
        }
        const text = String(body.body ?? "")
          .replace(/[<>]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text.length < 2 || text.length > MAX_BODY) {
          return Response.json({ ok: false, error: "bad body" }, { status: 400 });
        }
        if (!(await isCommentableId(video))) {
          return Response.json({ ok: false, error: "not_found" }, { status: 404 });
        }
        const user = await sessionUser(request);
        if (!user) {
          return Response.json({ ok: false, error: "login_required" }, { status: 401 });
        }
        try {
          const sql = await getSql();
          const recent = await sql.query<{ n: number }>(
            `select count(*)::int as n from video_comments
              where user_id = $1 and created_at > now() - interval '1 hour'`,
            [user.id],
          );
          if (Number(recent[0]?.n || 0) >= MAX_PER_HOUR) {
            return Response.json({ ok: false, error: "rate_limited" }, { status: 429 });
          }
          const id = crypto.randomUUID();
          await sql.query(
            `insert into video_comments (id, video_id, user_id, author_name, body)
             values ($1, $2, $3, $4, $5)`,
            [id, video, user.id, user.name, text],
          );
          const row = await sql.query<CommentRow>(
            `select id, video_id, author_name, body, created_at from video_comments where id = $1`,
            [id],
          );
          return Response.json({ ok: true, comment: toComment(row[0]!) }, { status: 201 });
        } catch (err) {
          console.error("[comments] POST failed:", err instanceof Error ? err.message.slice(0, 160) : err);
          return Response.json({ ok: false, error: "storage" }, { status: 503 });
        }
      },

      DELETE: async ({ request }) => {
        let body: { id?: unknown; key?: unknown } = {};
        try {
          body = (await request.json().catch(() => ({}))) as typeof body;
        } catch {
          body = {};
        }
        const key = ownerKeyFrom(request, body.key);
        if (!(await isOwnerRequest(request, key))) {
          return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
        }
        const id = String(body.id || "").trim();
        if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
          return Response.json({ ok: false, error: "bad id" }, { status: 400 });
        }
        try {
          const sql = await getSql();
          await sql.query("delete from video_comments where id = $1", [id]);
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[comments] DELETE failed:", err instanceof Error ? err.message.slice(0, 160) : err);
          return Response.json({ ok: false, error: "storage" }, { status: 503 });
        }
      },
    },
  },
});
