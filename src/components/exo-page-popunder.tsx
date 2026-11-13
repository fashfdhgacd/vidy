// Arms the ExoClick page popunder after each navigation. The embed is not in the
// HTML: it is added only when the Jakarta-day cap still allows a pop and this page
// is not an IndoAV watch page.
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { installExoPagePopunder } from "@/lib/ads/exo-popunder-dom";

export function ExoPagePopunder() {
  const href = useRouterState({ select: (s) => s.location.href });
  useEffect(() => {
    installExoPagePopunder();
  }, [href]);
  return null;
}
