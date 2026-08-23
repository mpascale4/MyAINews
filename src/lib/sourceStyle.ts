// Deterministic per-source visual identity: a favicon (from the article's own domain)
// plus a stable accent color per source, so each news source is visually
// distinguishable. Uniqueness is guaranteed (not just "probable" via hashing):
// a small set of well-known sources get hand-picked brand colors, and every
// other source is assigned a color from a large palette via a persistent
// registry that hands out a different, never-repeated color per source name
// (as long as the number of known sources stays within the palette size).

type Accent = { bg: string; text: string; ring: string };

const ACCENT_PALETTE: Accent[] = [
  { bg: "bg-rose-100 dark:bg-rose-950", text: "text-rose-700 dark:text-rose-300", ring: "ring-rose-200 dark:ring-rose-800" },
  { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-800" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-950", text: "text-fuchsia-700 dark:text-fuchsia-300", ring: "ring-fuchsia-200 dark:ring-fuchsia-800" },
  { bg: "bg-cyan-100 dark:bg-cyan-950", text: "text-cyan-700 dark:text-cyan-300", ring: "ring-cyan-200 dark:ring-cyan-800" },
  { bg: "bg-lime-100 dark:bg-lime-950", text: "text-lime-700 dark:text-lime-300", ring: "ring-lime-200 dark:ring-lime-800" },
  { bg: "bg-teal-100 dark:bg-teal-950", text: "text-teal-700 dark:text-teal-300", ring: "ring-teal-200 dark:ring-teal-800" },
  { bg: "bg-indigo-100 dark:bg-indigo-950", text: "text-indigo-700 dark:text-indigo-300", ring: "ring-indigo-200 dark:ring-indigo-800" },
  { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", ring: "ring-purple-200 dark:ring-purple-800" },
  { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", ring: "ring-yellow-200 dark:ring-yellow-800" },
  { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", ring: "ring-green-200 dark:ring-green-800" },
  { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", ring: "ring-red-200 dark:ring-red-800" },
  { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-700 dark:text-slate-200", ring: "ring-slate-200 dark:ring-slate-700" },
  { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", ring: "ring-orange-200 dark:ring-orange-800" },
  { bg: "bg-sky-100 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300", ring: "ring-sky-200 dark:ring-sky-800" },
  { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-700 dark:text-zinc-200", ring: "ring-zinc-200 dark:ring-zinc-700" },
  { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", ring: "ring-blue-200 dark:ring-blue-800" },
];

// Hand-picked "brand" colors for the handful of sources whose real-world color
// identity is unmistakable (e.g. Gazzetta dello Sport = pink). Each brand color
// is unique and reserved: it is never handed out to any other source by the
// registry below. Matching is done on a normalized (lowercased) substring of
// the source name. Order matters: more specific keywords must come before
// broader ones that could also match a different source's name.
const BRAND_ACCENTS: { match: string; accent: Accent }[] = [
  { match: "gazzetta dello sport", accent: { bg: "bg-pink-100 dark:bg-pink-950", text: "text-pink-700 dark:text-pink-300", ring: "ring-pink-200 dark:ring-pink-800" } },
  { match: "tuttosport", accent: { bg: "bg-violet-100 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", ring: "ring-violet-200 dark:ring-violet-800" } },
  { match: "ansa", accent: { bg: "bg-amber-100 dark:bg-amber-950", text: "text-amber-800 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-800" } },
  { match: "il sole 24 ore", accent: { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-800 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-800" } },
];

const REGISTRY_STORAGE_KEY = "myainews:source-color-registry";

// Registry: assigns each source name a unique palette index, in first-seen
// order, persisted so the mapping stays stable across reloads. Brand-matched
// sources never enter the registry (they always resolve to their fixed color).
let sourceRegistry: Map<string, number> = new Map();

function loadRegistry() {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(REGISTRY_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>;
      sourceRegistry = new Map(Object.entries(parsed));
    }
  } catch {
    sourceRegistry = new Map();
  }
}
loadRegistry();

function persistRegistry() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(Object.fromEntries(sourceRegistry)));
    }
  } catch {
    // Ignore storage errors (e.g. private browsing quota) — colors just won't persist across reloads.
  }
}

function isBrandMatched(key: string): boolean {
  return BRAND_ACCENTS.some(b => key.includes(b.match));
}

// Registers a batch of known source names (e.g. the full list of configured
// feeds) so each one is guaranteed a distinct color, assigned deterministically
// in the order provided. Call this whenever the full/current source list is
// available (feed list fetch), so per-source colors stay stable and unique.
export function registerSourceNames(names: (string | null | undefined)[]) {
  let changed = false;
  const usedIndexes = new Set(sourceRegistry.values());
  for (const raw of names) {
    const key = (raw || "?").trim().toLowerCase();
    if (!key || key === "?" || isBrandMatched(key) || sourceRegistry.has(key)) continue;
    // Find the next palette index not already assigned to another source.
    let idx = 0;
    while (usedIndexes.has(idx % ACCENT_PALETTE.length) && usedIndexes.size < ACCENT_PALETTE.length) {
      idx++;
    }
    idx = idx % ACCENT_PALETTE.length;
    sourceRegistry.set(key, idx);
    usedIndexes.add(idx);
    changed = true;
  }
  if (changed) persistRegistry();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getSourceAccent(source: string | null | undefined): Accent {
  const key = (source || "?").trim().toLowerCase();
  const brand = BRAND_ACCENTS.find(b => key.includes(b.match));
  if (brand) return brand.accent;
  const registered = sourceRegistry.get(key);
  if (registered !== undefined) return ACCENT_PALETTE[registered];
  // Not registered yet (e.g. first paint before the feed list loads): fall back
  // to a hash-based color so something reasonable shows immediately.
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
