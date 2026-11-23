import { usePublicText } from "@/lib/public-ui";
import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { EN_LEGAL, ContactEn, legalHeadEn } from "@/components/legal-en";
import { UI_EN } from "@/lib/ui-lang";
import { SITE_ORIGIN } from "@/lib/seo";

export const Route = createFileRoute("/kontak")({
  head: () =>
    UI_EN
      ? legalHeadEn("/kontak", EN_LEGAL.contact.title, EN_LEGAL.contact.description, "Contact")
      : {
          meta: [
            { title: "Kontak Pengelola | Videy Hub" },
            {
              name: "description",
              content:
                "Hubungi pengelola Videy Hub untuk laporan DMCA, permintaan penghapusan, pertanyaan privasi, atau tautan video yang rusak.",
            },
            { property: "og:title", content: "Kontak Pengelola | Videy Hub" },
            { property: "og:url", content: `${SITE_ORIGIN}/kontak` },
            { property: "og:type", content: "website" },
            { name: "robots", content: "index,follow" },
          ],
          links: [{ rel: "canonical", href: `${SITE_ORIGIN}/kontak` }],
        },
  component: UI_EN ? ContactEn : Page,
});

function Page() {
  const localText = usePublicText();
  return (
    <LegalPage title={localText("Kontak")}>
      <p>{localText("Untuk DMCA, privasi, atau laporan tautan rusak, tulis ke:")}</p>
      <p>
        <a className="underline" href="mailto:dmca@videyy.icu">
          dmca@videyy.icu
        </a>
      </p>
      <p>{localText("Sertakan URL halaman dan ringkasan singkat. Jangan kirim berkas video.")}</p>
    </LegalPage>
  );
}
