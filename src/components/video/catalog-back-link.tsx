import { usePublicHref, usePublicText } from "@/lib/public-ui";
import { useEffect, useState } from "react";
import { tr } from "@/lib/ui-lang";
import { backToCatalog, lastCatalogHref } from "@/lib/catalog/last-catalog";
import type { VideoDetail } from "@/lib/catalog/types";

function fallbackHref(_item: VideoDetail): string {
  return "/";
}

export function CatalogBackLink({ item }: { item: VideoDetail }) {
  const publicHref = usePublicHref();
  const tr = usePublicText();
  const fallback = fallbackHref(item);
  const [href, setHref] = useState(fallback);

  useEffect(() => {
    setHref(lastCatalogHref(fallback));
  }, [fallback]);

  return (
    <a
      href={publicHref(href)}
      onClick={(e) => {
        // Same grid page, same scroll: history back when the grid is the previous entry, else a
        // normal load of href that restores the saved scroll position.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        if (backToCatalog(href)) e.preventDefault();
      }}
      className="flex h-12 items-center rounded-xl bg-secondary px-5 text-base text-foreground">
      {tr("Kembali ke katalog", "Back to catalog")}
    </a>
  );
}
