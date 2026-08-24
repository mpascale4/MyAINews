import type { AIFeedSuggestion } from "./geminiFeedGeneration";
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

// Static, manually-verified RSS feeds for common Italian news categories, used as a
// richer fallback when the AI (GEMINI_API_KEY) is unavailable, so common searches like
// "sport" or "tecnologia" don't return only a single generic Google News feed.
const CATEGORY_FEEDS: { keywords: string[]; category: string; feeds: { name: string; url: string; reason: string }[] }[] = [
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
    feeds: [
      { name: "ANSA Tecnologia", url: "https://www.ansa.it/sito/notizie/tecnologia/tecnologia_rss.xml", reason: "Notizie di tecnologia e innovazione dall'agenzia ANSA." },
    ],
  },
  {
    keywords: ["economia", "finanza", "borsa", "mercati", "lavoro"],
    category: "Economia",
    feeds: [
      { name: "ANSA Economia", url: "https://www.ansa.it/sito/notizie/economia/economia_rss.xml", reason: "Notizie di economia e finanza dall'agenzia ANSA." },
    ],
  },
  {
    keywords: ["cultura", "cinema", "musica", "arte", "spettacolo", "libri"],
    category: "Cultura",
    feeds: [
      { name: "ANSA Cultura", url: "https://www.ansa.it/sito/notizie/cultura/cultura_rss.xml", reason: "Notizie di cultura e spettacolo dall'agenzia ANSA." },
    ],
  },
  {
    keywords: ["politica", "governo", "elezioni", "parlamento"],
    category: "Politica",
    feeds: [
      { name: "ANSA Politica", url: "https://www.ansa.it/sito/notizie/politica/politica_rss.xml", reason: "Notizie di politica italiana dall'agenzia ANSA." },
    ],
  },
  {
    keywords: ["cronaca", "attualità", "attualita"],
    category: "Cronaca",
    feeds: [
      { name: "ANSA Cronaca", url: "https://www.ansa.it/sito/notizie/cronaca/cronaca_rss.xml", reason: "Notizie di cronaca italiana dall'agenzia ANSA." },
    ],
  },
  {
    keywords: ["highlights", "serie a", "sintesi partite", "gol serie a"],
    category: "Sport",
    feeds: [
      { name: "Serie A - Highlights (YouTube)", url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCBJeMCIeLQos7wacox4hmLQ", reason: "Canale YouTube ufficiale della Lega Serie A con gli highlights di ogni partita." },
    ],
  },
];

function buildGoogleNewsFallback(cleanKeyword: string, encoded: string): AIFeedSuggestion {
  return {
    name: `Google News: ${cleanKeyword}`,
    url: `https://news.google.com/rss/search?q=${encoded}&hl=it&gl=IT&ceid=IT:it`,
    reason: `Feed di ricerca Google News in tempo reale per "${cleanKeyword}".`,
    category: "Ricerca mirata",
    type: "rss",
    verified: true,
    confidence: 1.0
  };
}

function buildCuratedFallback(normalizedKeyword: string): AIFeedSuggestion[] {
  const matchedCategory = CATEGORY_FEEDS.find(c => c.keywords.some(k => normalizedKeyword.includes(k)));
  if (!matchedCategory) {
    return [];
  }

  return matchedCategory.feeds.map(f => ({
    name: f.name,
    url: f.url,
    reason: f.reason,
    category: matchedCategory.category,
    type: "rss" as const,
    verified: true,
    confidence: 1.0
  }));
}

function buildSearchPrompt(cleanKeyword: string): string {
  return `Sei un esperto curatore di notizie e feed RSS in italiano.
L'utente sta cercando sorgenti e feed RSS relativi alla parola chiave o tema: "${cleanKeyword}".

REGOLE CRITICHE:
1. Trova ESATTAMENTE 10 portali o fonti di notizie rilevanti.
2. Non inventare MAI URL di feed RSS.
3. Se non esiste un feed RSS verificato, restituisci l'URL della pagina delle notizie del sito e contrassegna il tipo come "html".
4. Includi testate locali (se applicabile), nazionali e specializzate.
5. Includi sempre almeno 2-3 feed Google News mirati (es. "https://news.google.com/rss/search?q={query}&hl=it&gl=IT&ceid=IT:it").

Rispondi ESCLUSIVAMENTE con un oggetto JSON nel formato:
{
  "feeds": [
    {
      "name": "Nome della Fonte",
      "type": "rss | atom | html | sitemap",
      "url": "https://url-della-sorgente",
      "verified": true,
      "confidence": 0.9,
      "reason": "Spiegazione breve in italiano del perché è utile per ${cleanKeyword}",
      "category": "Locale / Notizie / Sport / Cultura / Tecnologia"
    }
  ]
}`;
}

function parseSearchResults(responseText: string, cleanKeyword: string): AIFeedSuggestion[] {
  const parsed = JSON.parse(responseText);
  if (!Array.isArray(parsed.feeds) || parsed.feeds.length === 0) {
    return [];
  }

  return parsed.feeds.map((f: FeedSearchCandidate) => ({
    name: String(f.name || cleanKeyword),
    url: String(f.url || "").trim(),
    type: f.type || 'rss',
    verified: f.verified !== undefined ? Boolean(f.verified) : false,
    confidence: typeof f.confidence === 'number' ? f.confidence : 0.0,
    reason: String(f.reason || `Feed trovato per "${cleanKeyword}"`),
    category: String(f.category || "Generale")
  })).filter((f: AIFeedSuggestion) => f.url && f.url.startsWith("http"));
}

export async function searchFeedsByKeyword(keyword: string): Promise<AIFeedSuggestion[]> {
  const gemini = getGemini();
  const cleanKeyword = (keyword || "").trim();
  const encoded = encodeURIComponent(cleanKeyword);
  const normalizedKeyword = cleanKeyword.toLowerCase();
  const googleNewsFallback = buildGoogleNewsFallback(cleanKeyword, encoded);
  const curatedFallback = buildCuratedFallback(normalizedKeyword);

  const fallback: AIFeedSuggestion[] = [...curatedFallback, googleNewsFallback];

  if (!gemini || !cleanKeyword) {
    return fallback;
  }

  const prompt = buildSearchPrompt(cleanKeyword);

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    if (response.text) {
      const aiResults = parseSearchResults(response.text, cleanKeyword);
      if (aiResults.length > 0) {
        const curatedUrls = new Set(curatedFallback.map(f => f.url));
        return [...curatedFallback, ...aiResults.filter(f => !curatedUrls.has(f.url))];
      }
    }
  } catch (e) {
    console.warn("Error searching feeds by keyword with AI:", e);
  }

  return fallback;
}
