import { Outlet, createFileRoute } from "@tanstack/react-router";

/** /en: English keyword landings on videqsss. videyy 404s these routes. */
export const Route = createFileRoute("/en")({
  component: () => <Outlet />,
});
