import type { SuggestedFeed } from "../types";
import { getGemini } from "./gemini";

type FeedSearchCandidate = {
  name?: string;
  url?: string;
  type?: string;
  verified?: boolean;
  confidence?: number;
  reason?: string;
  category?: string;
};

const CATEGORY_FEEDS: { keywords: string[]; category: string; feeds: SuggestedFeed[] }[] = [
  {
    keywords: ["sport", "calcio", "football", "basket", "tennis", "formula 1", "f1", "motori", "ciclismo"],
    category: "Sport",
    feeds: [
      { name: "Gazzetta dello Sport", url: "https://www.gazzetta.it/rss/home.xml", reason: "Principale quotidiano sportivo italiano, aggiornamenti in tempo reale." },
      { name: "Corriere dello Sport", url: "https://www.corrieredellosport.it/rss/homepage", reason: "Notizie sportive nazionali su calcio e altri sport." },
      { name: "Tuttosport", url: "https://www.tuttosport.com/rss/home", reason: "Quotidiano sportivo, focus su calcio e motori." },
      { name: "ANSA Sport", url: "https://www.ansa.it/sito/notizie/sport/sport_rss.xml", reason: "Notizie sportive dall'agenzia di stampa ANSA." },
    ],
  },
  {
    keywords: ["tecnologia", "tech", "informatica", "hi-tech", "hitech", "gadget", "intelligenza artificiale", "ai"],
    category: "Tecnologia",
    feeds: [{ name: "ANSA Tecnologia", url: "https://www.ansa.it/sito/notizie/tecnologia/tecnologia_rss.xml", reason: "Notizie di tecnologia e innovazione dall'agenzia ANSA." }],
  },
];

function buildGoogleNewsFallback(cleanKeyword: string, encoded: string): SuggestedFeed {
  return {
    name: `Google News: ${cleanKeyword}`,
    url: `https://news.google.com/rss/search?q=${encoded}&hl=it&gl=IT&ceid=IT:it`,
    reason: `Feed di ricerca Google News in tempo reale per "${cleanKeyword}".`,
    category: "Ricerca mirata",
  };
}

function buildCuratedFallback(normalizedKeyword: string): SuggestedFeed[] {
  const matchedCategory = CATEGORY_FEEDS.find((category) => category.keywords.some((keyword) => normalizedKeyword.includes(keyword)));
  return matchedCategory ? matchedCategory.feeds.map((feed) => ({ ...feed, category: matchedCategory.category })) : [];
}

function buildSearchPrompt(cleanKeyword: string): string {
  return `Sei un esperto curatore di feed RSS italiani.
L'utente cerca sorgenti RSS sul tema "${cleanKeyword}".

Regole:
- Restituisci solo JSON valido.
- Proponi fino a 10 feed o pagine notizie reali.
- Non inventare URL.
- Includi sempre anche feed Google News mirati.

Formato:
{"feeds":[{"name":"...","url":"https://...","reason":"...","category":"..."}]}`;
}

function parseSearchResults(responseText: string): SuggestedFeed[] {
  const parsed = JSON.parse(responseText) as { feeds?: FeedSearchCandidate[] };
  if (!Array.isArray(parsed.feeds)) {
    return [];
  }

  return parsed.feeds
    .map((feed) => ({
      name: String(feed.name || "Feed"),
      url: String(feed.url || "").trim(),
      reason: String(feed.reason || ""),
      category: String(feed.category || "Generale"),
    }))
    .filter((feed) => feed.url.startsWith("http"));
}

export async function searchFeedsByKeyword(keyword: string): Promise<SuggestedFeed[]> {
  const cleanKeyword = keyword.trim();
  const encoded = encodeURIComponent(cleanKeyword);
  const curatedFallback = buildCuratedFallback(cleanKeyword.toLowerCase());
  const fallback = [...curatedFallback, buildGoogleNewsFallback(cleanKeyword, encoded)];
  const gemini = getGemini();

  if (!gemini || !cleanKeyword) {
    return fallback.filter((feed) => feed.url);
  }

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: buildSearchPrompt(cleanKeyword),
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    if (response.text) {
      const results = parseSearchResults(response.text);
      if (results.length > 0) {
        const curatedUrls = new Set(curatedFallback.map((feed) => feed.url));
        return [...curatedFallback, ...results.filter((feed) => !curatedUrls.has(feed.url))];
      }
    }
  } catch (error) {
    console.warn("Error searching feeds by keyword with AI:", error);
  }

  return fallback.filter((feed) => feed.url);
}
