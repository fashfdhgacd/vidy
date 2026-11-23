import { usePublicText } from "@/lib/public-ui";
import { useState, type FormEvent } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  KIRIM_ENDPOINT,
  KIRIM_MSG,
  KIRIM_SITE,
  KIRIM_TITLE_MAX,
  kirimMessage,
  normalizeVideyLink,
} from "@/lib/kirim-videy";
import { IS_VIDEQSSS, SITE_ORIGIN, TITLE_SUFFIX } from "@/lib/seo";

const HELPER = "Video akan dicek admin dulu sebelum tayang; hanya link videy.co.";

export const Route = createFileRoute("/kirim")({
  beforeLoad: () => {
    if (IS_VIDEQSSS) throw notFound();
  },
  head: () => {
    if (IS_VIDEQSSS) {
      return {
        meta: [
          { title: `Halaman Tidak Ditemukan | ${TITLE_SUFFIX}` },
          { name: "robots", content: "noindex,follow" },
        ],
      };
    }
    const title = `Kirim Video | ${TITLE_SUFFIX}`;
    const url = `${SITE_ORIGIN}/kirim`;
    return {
      meta: [
        { title },
        { name: "description", content: HELPER },
        { property: "og:title", content: title },
        { property: "og:description", content: HELPER },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: KirimPage,
});

function KirimPage() {
  return (
    <Shell>
      <article className="mx-auto max-w-xl space-y-4">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">Kirim Video</h1>
        <p className="text-sm leading-relaxed text-muted">{HELPER}</p>
        <KirimForm />
      </article>
    </Shell>
  );
}

function KirimForm() {
  const localText = usePublicText();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [hp, setHp] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const link = normalizeVideyLink(url);
    if (!link) {
      setMessage(KIRIM_MSG.invalid);
      return;
    }
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(KIRIM_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          url: link,
          title: title.trim().slice(0, KIRIM_TITLE_MAX),
          site: KIRIM_SITE,
          hp,
        }),
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      setMessage(kirimMessage(res.status, body));
    } catch {
      setMessage(KIRIM_MSG.retry);
    } finally {
      setSending(false);
    }
  }

  const ok = message === KIRIM_MSG.pending || message === KIRIM_MSG.duplicate;

  return (
    <form onSubmit={onSubmit} className="relative space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="kirim-url" className="text-sm font-medium text-foreground">
          Link Videy
        </label>
        <Input
          id="kirim-url"
          name="url"
          type="url"
          required
          inputMode="url"
          autoComplete="off"
          placeholder="https://videy.co/v?id=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          maxLength={2048}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="kirim-title" className="text-sm font-medium text-foreground">
          Judul <span className="font-normal text-muted">(opsional)</span>
        </label>
        <Input
          id="kirim-title"
          name="title"
          type="text"
          maxLength={KIRIM_TITLE_MAX}
          autoComplete="off"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div aria-hidden="true" className="sr-only">
        <label htmlFor="hp">Jangan diisi</label>
        <input
          id="hp"
          name="hp"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={sending}>
        {sending ? localText("Mengirim…") : "Kirim"}
      </Button>
      {message ? (
        <p role="status" className={ok ? "text-sm text-foreground" : "text-sm text-red-400"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
