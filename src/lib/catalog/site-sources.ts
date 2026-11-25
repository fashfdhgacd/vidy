/** Which catalog sources a site build keeps. Read from the committed sync config, not per visit. */

export type SiteSyncConfig = {
  sites?: Record<string, { enabled?: boolean; sources?: "all" | string[]; exclude?: string[]; folderUrl?: string; panelMarker?: string }>;
};

export type VideqsssCatalogFile = {
  folderUrl?: string;
  importedAt?: string | null;
  items?: unknown[];
};

/** After the one-time folder import, videqsss serves that file instead of the shared catalog. */
export function videqsssUsesOwnCatalog(catalog: VideqsssCatalogFile | null | undefined, siteId: string): boolean {
  return siteId === "videqsss" && Boolean(catalog?.importedAt);
}

export function siteIdFromEnv(raw: string | undefined): "videyy" | "videqsss" {
  return raw === "videqsss" ? "videqsss" : "videyy";
}

const SOURCE_RE: Record<string, RegExp> = {
  indoav: /indoav/i,
  userbokep: /userbokep/i,
  // Videy: its own mp4 files (cdn.videy.co or the aceimg mirror) or the "Videy" source label.
  videy: /(^|[^a-z])videy([^a-z]|$)|cdn\.videy\.co|aceimg\.com/i,
  // LuluStream and its player domains (lplaygo.com, luluvdo, ...).
  lulu: /lulu|lplaygo/i,
};

/** True when this video may ship on `siteId`. "all" keeps every source except `exclude`. */
export function allowsSource(
  item: { embed?: string; source?: string; direct?: string },
  siteId: string,
  config: SiteSyncConfig,
): boolean {
  const rule = config.sites?.[siteId];
  if (rule?.enabled === false) return false;
  const sources = rule?.sources ?? "all";
  const blob = `${item.embed || ""} ${item.source || ""} ${item.direct || ""}`;
  if ((rule?.exclude || []).some((name) => SOURCE_RE[name]?.test(blob))) return false;
  if (sources === "all") return true;
  return sources.some((name) => Boolean(SOURCE_RE[name]?.test(blob)));
}
