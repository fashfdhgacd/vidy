import { createFileRoute, redirect } from "@tanstack/react-router";
import { HOME_CANONICAL } from "@/lib/seo";

export const Route = createFileRoute("/campur")({
  beforeLoad: () => {
    throw redirect({ href: HOME_CANONICAL, replace: true, statusCode: 301 });
  },
  component: () => null,
});
