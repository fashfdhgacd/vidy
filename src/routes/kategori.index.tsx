import { createFileRoute, redirect } from "@tanstack/react-router";
import { HOME_CANONICAL } from "@/lib/seo";

export const Route = createFileRoute("/kategori/")({
  beforeLoad: () => {
    throw redirect({ href: HOME_CANONICAL, statusCode: 301 });
  },
  component: () => null,
});
