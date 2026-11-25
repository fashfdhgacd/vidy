import { Outlet, createFileRoute } from "@tanstack/react-router";

/** /genre: keyword landings on videqsss. videyy sends these to /cari. */
export const Route = createFileRoute("/genre")({
  component: () => <Outlet />,
});
