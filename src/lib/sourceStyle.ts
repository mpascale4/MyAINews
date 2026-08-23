// Deterministic per-source visual identity: a favicon (from the article's own domain)
// plus a stable accent color derived from the source name, so each news source is
// visually distinguishable without needing any manual configuration.

const ACCENT_PALETTE = [
  { bg: "bg-rose-100 dark:bg-rose-950", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-800" },
  { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-800" },
  { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-800" },
  { bg: "bg-sky-100 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200 dark:ring-sky-800" },
  { bg: "bg-violet-100 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200 dark:ring-violet-800" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-950", text: "text-fuchsia-700 dark:text-fuchsia-300", ring: "ring-fuchsia-200 dark:ring-fuchsia-800" },
  { bg: "bg-cyan-100 dark:bg-cyan-950", text: "text-cyan-700 dark:text-cyan-300", ring: "ring-cyan-200 dark:ring-cyan-800" },
  { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200 dark:ring-orange-800" },
];

// Hand-picked "brand" colors for well-known sources, so their icon background
// matches their real-world identity (e.g. Gazzetta dello Sport = pink).
// Matching is done on a normalized (lowercased) substring of the source name,
// so both "Gazzetta dello Sport" and any future variant containing it still match.
const BRAND_ACCENTS: { match: string; accent: typeof ACCENT_PALETTE[number] }[] = [
  { match: "gazzetta dello sport", accent: { bg: "bg-pink-100 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-300", ring: "ring-pink-200 dark:ring-pink-800" } },
  { match: "tuttosport", accent: { bg: "bg-violet-100 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200 dark:ring-violet-800" } },
  { match: "ansa", accent: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", ring: "ring-blue-200 dark:ring-blue-800" } },
  { match: "il sole 24 ore", accent: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-800 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-800" } },
  { match: "microsoft", accent: { bg: "bg-sky-100 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200 dark:ring-sky-800" } },
  { match: "zdnet", accent: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", ring: "ring-red-200 dark:ring-red-800" } },
  { match: "youtube", accent: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", ring: "ring-red-200 dark:ring-red-800" } },
  { match: "medium", accent: { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-200", ring: "ring-slate-200 dark:ring-slate-700" } },
  { match: "startupitalia", accent: { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200 dark:ring-orange-800" } },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getSourceAccent(source: string | null | undefined) {
  const key = (source || "?").trim().toLowerCase();
  const brand = BRAND_ACCENTS.find(b => key.includes(b.match));
  if (brand) return brand.accent;
  return ACCENT_PALETTE[hashString(key) % ACCENT_PALETTE.length];
}

export function getSourceInitial(source: string | null | undefined): string {
  const trimmed = (source || "?").trim();
  return trimmed.charAt(0).toUpperCase() || "?";
}

// Derives a favicon URL from the article's own link, so every source gets a real
// icon without maintaining a manual per-source mapping.
export function getSourceFaviconUrl(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    const { hostname } = new URL(link);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return null;
  }
}
