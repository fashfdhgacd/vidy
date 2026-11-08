import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

/**
 * Better Auth handler — semua endpoint /api/auth/* (sign-up, sign-in, get-session, dst).
 * Satu splat route; `auth.handler` adalah fetch-style handler bawaan Better Auth.
 */
async function handle(request: Request) {
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      POST: ({ request }) => handle(request),
    },
  },
});
