import { createFileRoute, redirect } from "@tanstack/react-router";
import { HOME_CANONICAL } from "@/lib/seo";

/** /kategori/<slug>/halaman/N → home feed. */
export const Route = createFileRoute("/kategori/$slug/halaman/$page")({
  beforeLoad: () => {
    throw redirect({ href: HOME_CANONICAL, statusCode: 301 });
  },
  component: () => null,
});
