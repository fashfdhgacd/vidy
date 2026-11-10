/** Which catalog sources a site build keeps. Read from the committed sync config, not per visit. */

export type SiteSyncConfig = {
  sites?: Record<string, { enabled?: boolean; sources?: "all" | string[] }>;
};

export function siteIdFromEnv(raw: string | undefined): "videyy" | "videqsss" {
  return raw === "videqsss" ? "videqsss" : "videyy";
}

/** True when this video may ship on `siteId`. "all" keeps every source. */
export function allowsSource(
  item: { embed?: string; source?: string; direct?: string },
  siteId: string,
  config: SiteSyncConfig,
): boolean {
  const rule = config.sites?.[siteId];
  if (rule?.enabled === false) return false;
  const sources = rule?.sources ?? "all";
  if (sources === "all") return true;
  const blob = `${item.embed || ""} ${item.source || ""} ${item.direct || ""}`;
  return sources.some((name) => {
    if (name === "indoav") return /indoav/i.test(blob);
    if (name === "userbokep") return /userbokep/i.test(blob);
    return false;
  });
}
