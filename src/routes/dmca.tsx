import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";
import { EN_LEGAL, DmcaEn, legalHeadEn } from "@/components/legal-en";
import { UI_EN } from "@/lib/ui-lang";
import { SITE_ORIGIN } from "@/lib/seo";

export const Route = createFileRoute("/dmca")({
  head: () =>
    UI_EN
      ? legalHeadEn("/dmca", EN_LEGAL.dmca.title, EN_LEGAL.dmca.description, "DMCA")
      : {
          meta: [
            { title: "Prosedur DMCA dan Penghapusan Konten | Videy Hub" },
            {
              name: "description",
              content:
                "Cara pemegang hak mengajukan pemberitahuan DMCA ke Videy Hub: URL halaman, bukti kepemilikan, dan pernyataan itikad baik.",
            },
            { property: "og:title", content: "Prosedur DMCA dan Penghapusan Konten | Videy Hub" },
            { property: "og:url", content: `${SITE_ORIGIN}/dmca` },
            { property: "og:type", content: "website" },
            { name: "robots", content: "index,follow" },
          ],
          links: [{ rel: "canonical", href: `${SITE_ORIGIN}/dmca` }],
        },
  component: UI_EN ? DmcaEn : Page,
});

function Page() {
  return (
    <LegalPage title="DMCA">
      <p>
        Jika Anda pemegang hak dan ingin judul dihapus dari katalog, kirim pemberitahuan ke halaman
        Kontak dengan URL watch, bukti kepemilikan, dan pernyataan itikad baik.
      </p>
      <p>
        Kami meninjau laporan yang lengkap dan menghapus entri katalog yang sah tanpa meng-host
        ulang berkas video.
      </p>
    </LegalPage>
  );
}
