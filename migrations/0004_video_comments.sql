-- Komentar user per video (fitur baru videy-hub).
-- Wajib akun: user_id = id user Better Auth ("user"."id", text).
-- Author name di-snapshot saat komen supaya ganti nama tidak mengubah komentar lama.

create table if not exists video_comments (
  id text primary key,
  video_id text not null,
  user_id text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists video_comments_video on video_comments (video_id, created_at desc);
create index if not exists video_comments_user on video_comments (user_id, created_at desc);
