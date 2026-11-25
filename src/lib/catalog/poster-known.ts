/**
 * Poster URLs already checked (data/poster-probe.json). The daily sync HEADs only ids that are
 * missing from `ok` (never checked, or last seen failing). A visit never calls upstream.
 */
import probeFile from "../../../data/poster-probe.json";
import { posterKeyOf } from "./poster-status";

type ProbeFile = { ok?: Record<string, number>; miss?: Record<string, string> };

const OK = new Set(Object.keys((probeFile as ProbeFile).ok || {}));

export function posterProbeOk(id: string): boolean {
  const key = posterKeyOf(id);
  return Boolean(key) && OK.has(key);
}
