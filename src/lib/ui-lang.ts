import { createContext, useContext } from "react";
import { findCategory } from "@/lib/catalog/categories";
import { EN_CATEGORY_LABELS } from "@/lib/seo";

/**
 * Interface language per build (owner decision 2026-11-20): videqsss.icu is a full English site,
 * videyy.icu stays Indonesian (with separate /en keyword pages). Set at build time from VITE_SITE_ID,
 * so it costs nothing per request and both builds keep their own static strings.
 */
export const UI_EN = import.meta.env.VITE_SITE_ID === "videqsss";
export const UI_LANG: "en" | "id" = UI_EN ? "en" : "id";
export const UI_LOCALE = UI_EN ? "en-US" : "id-ID";

/** Pick the Indonesian or English text for the current build. */
export function tr(id: string, en: string): string {
  return UI_EN ? en : id;
}

/** Number formatting in the build's locale (1.234 vs 1,234). */
export function fmtNum(n: number): string {
  return n.toLocaleString(UI_LOCALE);
}

/** Category name as shown in the UI: English label on the English build, else unchanged. */
export function uiCategory(slugOrLabel: string): string {
  if (!UI_EN) return slugOrLabel;
  const key = slugOrLabel.trim().toLowerCase();
  const cat = findCategory(key) || findCategory(key.replace(/\s+/g, "-"));
  return (cat && EN_CATEGORY_LABELS[cat.slug]) || slugOrLabel;
}

/**
 * Per-page language for shared chrome (header, footer, cards). videyy keeps Indonesian chrome
 * except under its /en pages, which wrap their Shell in <UiLangProvider value="en">.
 */
const UiLangContext = createContext<"id" | "en">(UI_LANG);
export const UiLangProvider = UiLangContext.Provider;

/** `tr` bound to the page language (falls back to the build language). */
export function useTr(): (id: string, en: string) => string {
  const en = useContext(UiLangContext) === "en";
  return (id, enText) => (en ? enText : id);
}
