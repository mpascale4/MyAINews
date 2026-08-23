import { GoogleGenAI } from "@google/genai";
import type { ScraperConfig } from "./scraper";

let aiClient: GoogleGenAI | null = null;

export function getGemini() {
  if (!aiClient) {
    if (process.env.GEMINI_API_KEY) {
       aiClient = new GoogleGenAI({ 
         apiKey: process.env.GEMINI_API_KEY,
         httpOptions: {
           headers: {
             'User-Agent': 'aistudio-build',
           }
         }
       });
    } else {
       console.warn("GEMINI_API_KEY is not set. AI features will be disabled.");
    }
  }
  return aiClient;
}

export async function processArticleWithAI(title: string, content: string, interests: { keyword: string, type: string, weight: number }[] = []) {
  const gemini = getGemini();
  if (!gemini) {
    return { summary: "AI Summary non disponibile (Chiave API non configurata).", relevance: 50 };
  }

  const prompt = `Sei un giornalista, curatore ed analista di notizie esperto. Il tuo compito è redigere un riassunto a DOPPIO LIVELLO (prima versione breve/sintetica, poi versione approfondita/estesa) in lingua ITALIANA della seguente notizia.

REGOLE CRITICHE DI EVIDENZIAZIONE:
- Evidenzia le parole chiave, nomi di enti/persone rilevanti, dati numerici cruciali e concetti di forte interesse racchiudendoli tra doppi asterischi (es. **Intelligenza Artificiale**, **15 miliardi di euro**, **Mario Draghi**, **nuove normative europee**).

Titolo Notizia: ${title}
Testo o estratto dell'articolo:
${content ? content.substring(0, 4000) : title}

Compiti da eseguire:
1. STRUTTURA DEL SUMMARY IN ITALIANO (Formato preciso a 2 sezioni):
   
   ### ⚡ SINTESI RAPIDA (Versione Breve)
   Scrivi una sintesi rapida di 2-3 frasi o punti che riassuma istantaneamente il nocciolo della notizia. Evidenzia con **grassetto** i concetti cardine.
   
   ### 📖 QUADRO DETTAGLIATO (Versione Approfondita)
   Scrivi un'analisi completa, esaustiva e ricca di dettagli:
   - **Contesto ed Evento**: chi, cosa, dove, quando e perché.
   - **Dettagli e Numeri**: cifre, dichiarazioni ufficiali, misure adottate.
   - **Impatti e Prospettive Future**: conseguenze economiche, sociali o tecnologiche e prossimi sviluppi.
   Evidenzia con **grassetto** le parole chiave e i punti salienti.

2. PUNTEGGIO DI RILEVANZA (0 - 100):
   Assegna un punteggio di rilevanza generale da 50 a 100 in base all'importanza e all'attualità oggettiva della notizia.

3. TAG TEMATICI (2 - 5 tag sintetici in ITALIANO):
   Estrai le tematiche chiave (es. "Tecnologia", "Intelligenza Artificiale", "Economia", "Politica", "Ambiente", "Cronaca").

Rispondi ESCLUSIVAMENTE con un JSON valido nel seguente formato:
{
  "summary": "### ⚡ SINTESI RAPIDA\n**Concetto chiave** riassunto breve...\n\n### 📖 QUADRO DETTAGLIATO\nParagrafi approfonditi con **parole chiave** ed evidenziazioni...",
  "relevance": 85,
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

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
      let parsed;
      try {
        parsed = JSON.parse(response.text);
      } catch (e: any) {
        console.warn("JSON parse fallback for summary");
      }
      if (parsed && parsed.summary) {
        return {
          summary: parsed.summary,
          relevance: typeof parsed.relevance === 'number' ? parsed.relevance : 50,
          tags: Array.isArray(parsed.tags) ? parsed.tags : []
        };
      }
    }
  } catch (err: any) {
    console.warn("Gemini API warning:", err?.message || String(err));
  }

  // Graceful fallback if Gemini API is unavailable or quota is exceeded
  const cleanSnippet = content ? content.substring(0, 300) : title;
  return {
    summary: `### SINTESI RAPIDA\n**${title}**\n\n${cleanSnippet}${cleanSnippet.length >= 300 ? '...' : ''}\n\n### QUADRO DETTAGLIATO\n${content || title}`,
    relevance: 50,
    tags: ["Notizia"]
  };
}

export interface AIFeedSuggestion {
  name: string;
  url: string;
  reason: string;
  category: string;
  type?: 'rss' | 'atom' | 'html' | 'sitemap';
  verified?: boolean;
  confidence?: number;
}

export async function generateFeedsWithAI(
  interests: { keyword: string, type: string, weight?: number }[],
  existingFeeds: { url: string, name: string }[] = []
): Promise<AIFeedSuggestion[]> {
  const gemini = getGemini();

  const positiveInterests = interests.filter(i => i.type === 'positive');
  const negativeInterests = interests.filter(i => i.type === 'negative');

  // Build fallback suggestions based on keywords and standard Italian & tech feeds
  const fallbackSuggestions: AIFeedSuggestion[] = [
    {
      name: "ANSA Notizie",
      url: "https://www.ansa.it/sito/ansait_rss.xml",
      reason: "Principale agenzia di stampa italiana per notizie e attualità in tempo reale.",
      category: "Attualità",
      type: "rss",
      verified: true,
      confidence: 1.0
    },
    {
      name: "Il Post",
      url: "https://www.ilpost.it/feed",
      reason: "Approfondimenti e spiegazioni chiare su notizie nazionali ed estere.",
      category: "Attualità",
      type: "rss",
      verified: true,
      confidence: 1.0
    }
  ];

  for (const pos of positiveInterests) {
    const encoded = encodeURIComponent(pos.keyword);
    fallbackSuggestions.push({
      name: `Google News: ${pos.keyword}`,
      url: `https://news.google.com/rss/search?q=${encoded}&hl=it&gl=IT&ceid=IT:it`,
      reason: `Feed aggregato su misura per l'argomento "${pos.keyword}".`,
      category: "Personalizzato",
      type: "rss",
      verified: true,
      confidence: 0.9
    });
  }

  if (!gemini) {
    return fallbackSuggestions;
  }

  const prompt = `Sei un esperto curatore di notizie e feed RSS in italiano.
L'utente desidera arricchire il proprio aggregatore di notizie con feed RSS pertinenti e di alta qualità.

REGOLE CRITICHE DI VALIDAZIONE:
1. Non inventare MAI URL di feed RSS.
2. Restituisci un feed RSS solo se è verificato e contiene notizie.
3. Se non esiste un feed RSS verificato, restituisci l'URL della pagina delle notizie del sito e contrassegna il tipo come "html".
4. Classifica le sorgenti come: rss, atom, html, sitemap.
5. Preferisci fonti verificate rispetto a fonti ipotizzate.
6. La confidenza deve essere inferiore a 0.5 quando l'esistenza del feed non può essere verificata con certezza.

Profilo degli interessi dell'utente:
Argomenti desiderati (+):
${positiveInterests.length > 0 ? positiveInterests.map(i => `- ${i.keyword}`).join('\n') : '- Notizie generali, Tecnologia, Attualità'}

Argomenti da evitare (-):
${negativeInterests.length > 0 ? negativeInterests.map(i => `- ${i.keyword}`).join('\n') : '- Nessuno'}

Feed già presenti nel suo lettore (evita di duplicare gli stessi URL esatti):
${existingFeeds.map(f => `- ${f.name} (${f.url})`).join('\n')}

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido nel seguente formato:
{
  "feeds": [
    {
      "name": "Nome della Fonte",
      "type": "rss | atom | html | sitemap",
      "url": "https://url-della-sorgente",
      "verified": true,
      "confidence": 0.9,
      "reason": "Spiegazione breve in italiano del perché è ideale per l'utente",
      "category": "Tecnologia / Finanza / Locale / Attualità"
    }
  ]
}`;

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
      try {
        const parsed = JSON.parse(response.text);
        if (Array.isArray(parsed.feeds) && parsed.feeds.length > 0) {
          return parsed.feeds.map((f: any) => ({
            name: String(f.name || "Fonte Notizie"),
            url: String(f.url || "").trim(),
            type: f.type || 'rss',
            verified: f.verified !== undefined ? Boolean(f.verified) : false,
            confidence: typeof f.confidence === 'number' ? f.confidence : 0.0,
            reason: String(f.reason || "Consigliato dall'AI in base ai tuoi interessi."),
            category: String(f.category || "Generale")
          })).filter((f: any) => f.url && f.url.startsWith("http"));
        }
      } catch (err: any) {
        console.warn("Could not parse AI feed suggestion JSON:", err.message);
      }
    }
  } catch (err: any) {
    console.warn("Gemini API warning during feed generation:", err.message || "Unknown error");
  }

  return fallbackSuggestions;
}

export async function runProfileInterview(
  messages: { role: 'user' | 'assistant', content: string }[],
  currentInterests: { keyword: string, type: string, weight: number }[] = []
) {
  const gemini = getGemini();
  if (!gemini) {
    return {
      reply: "Funzionalità AI non disponibile (chiave API non configurata).",
      extractedInterests: [],
      suggestedFeeds: []
    };
  }

  const prompt = `Sei l'assistente IA esperto di ricerca sorgenti notizie (feed RSS) per un aggregatore intelligente in italiano.
Il tuo compito è condurre una conversazione e intervista interattiva con l'utente per scoprire i suoi argomenti preferiti e TROVARE FEED RSS/GOOGLE NEWS PERTINENTI (specialmente per città/località come "Lucca", "Toscana" o settori specifici come "Formula 1", "IA", "Economia").

Cronologia della conversazione finora:
${messages.map(m => `${m.role === 'user' ? 'Utente' : 'Assistente'}: ${m.content}`).join('\n')}

Istruzioni:
1. Fai una conversazione naturale, cordiale e stimolante in ITALIANO.
2. Identifica le passioni o gli argomenti emersi e le eventuali località o città menzionate.
3. Se l'utente menziona argomenti o località (es. "Lucca", "Formula 1", "Finanza"), TROVA e SUGGERISCI fino a 4 feed RSS reali o feed Google News dedicati ("https://news.google.com/rss/search?q={ARGOMENTO_O_CITTA_CODIFICATA}&hl=it&gl=IT&ceid=IT:it").
4. Rispondi ESCLUSIVAMENTE con un JSON valido nel seguente formato:
{
  "reply": "Il tuo messaggio di risposta amichevole...",
  "extractedInterests": [],
  "suggestedFeeds": [
    {
      "name": "Google News: Lucca",
      "url": "https://news.google.com/rss/search?q=Lucca&hl=it&gl=IT&ceid=IT:it",
      "reason": "Sorgente RSS per notizie e aggiornamenti in tempo reale su Lucca",
      "category": "Locale"
    }
  ]
}`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      return {
        reply: parsed.reply || "Come posso aiutarti ad aggiornare i tuoi interessi e trovare i feed migliori?",
        extractedInterests: Array.isArray(parsed.extractedInterests) ? parsed.extractedInterests : [],
        suggestedFeeds: Array.isArray(parsed.suggestedFeeds) ? parsed.suggestedFeeds : []
      };
    }
  } catch (e) {
    console.error("Error in profile interview AI:", e);
  }

  return {
    reply: "Ciao! Dimmi quali argomenti ti appassionano di più o quali città/notizie vorresti seguire con l'AI.",
    extractedInterests: [],
    suggestedFeeds: []
  };
}

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

export async function searchFeedsByKeyword(keyword: string): Promise<AIFeedSuggestion[]> {
  const gemini = getGemini();
  const cleanKeyword = (keyword || "").trim();
  const encoded = encodeURIComponent(cleanKeyword);
  const normalizedKeyword = cleanKeyword.toLowerCase();

  const googleNewsFallback: AIFeedSuggestion = {
    name: `Google News: ${cleanKeyword}`,
    url: `https://news.google.com/rss/search?q=${encoded}&hl=it&gl=IT&ceid=IT:it`,
    reason: `Feed di ricerca Google News in tempo reale per "${cleanKeyword}".`,
    category: "Ricerca mirata",
    type: "rss",
    verified: true,
    confidence: 1.0
  };

  // Match the keyword against known categories (e.g. "sport", "tecnologia") to enrich
  // the fallback with real, manually-verified sources beyond the generic Google News feed.
  const matchedCategory = CATEGORY_FEEDS.find(c => c.keywords.some(k => normalizedKeyword.includes(k)));
  const curatedFallback: AIFeedSuggestion[] = matchedCategory
    ? matchedCategory.feeds.map(f => ({
        name: f.name,
        url: f.url,
        reason: f.reason,
        category: matchedCategory.category,
        type: "rss" as const,
        verified: true,
        confidence: 1.0
      }))
    : [];

  const fallback: AIFeedSuggestion[] = [...curatedFallback, googleNewsFallback];

  if (!gemini || !cleanKeyword) {
    return fallback;
  }

  const prompt = `Sei un esperto curatore di notizie e feed RSS in italiano.
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
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.feeds) && parsed.feeds.length > 0) {
        const aiResults: AIFeedSuggestion[] = parsed.feeds.map((f: any) => ({
          name: String(f.name || cleanKeyword),
          url: String(f.url || "").trim(),
          type: f.type || 'rss',
          verified: f.verified !== undefined ? Boolean(f.verified) : false,
          confidence: typeof f.confidence === 'number' ? f.confidence : 0.0,
          reason: String(f.reason || `Feed trovato per "${cleanKeyword}"`),
          category: String(f.category || "Generale")
        })).filter((f: any) => f.url && f.url.startsWith("http"));

        // Prepend our manually-verified curated feeds (e.g. Serie A highlights) when the
        // keyword matches a known category, so a real verified source is always offered
        // instead of relying solely on the AI's (sometimes unverified) suggestions.
        const curatedUrls = new Set(curatedFallback.map(f => f.url));
        return [...curatedFallback, ...aiResults.filter(f => !curatedUrls.has(f.url))];
      }
    }
  } catch (e) {
    console.warn("Error searching feeds by keyword with AI:", e);
  }

  return fallback;
}

export async function scrapeArticlesWithAI(url: string, htmlSnippet: string, sourceName: string) {
  const gemini = getGemini();
  if (!gemini) {
    return [];
  }

  const prompt = `Sei un analista di siti web e curatore di notizie esperto.
Il tuo compito è analizzare il codice HTML della homepage di un quotidiano online chiamato "${sourceName}" e trasformarlo in un elenco strutturato di notizie.

Sito URL: ${url}

ISTRUZIONI DI TRASFORMAZIONE:
1. Identifica i blocchi di contenuto che rappresentano notizie reali (articoli in evidenza, cronaca recente, ultim'ora).
2. Estrai ESCLUSIVAMENTE:
   - Titolo (Title): Il titolo dell'articolo.
   - Link: L'URL completo dell'articolo (risolvi i link relativi usando ${url}).
   - Estratto (Snippet): Una breve anteprima del contenuto (se presente).
   - Data/Ora: Cerca indicatori temporali (es. "1 ora fa", "Oggi", date ISO) e convertili nel formato ISO 8601 più vicino.

REGOLE DI FILTRO:
- Ignora menu di navigazione, link ai social, pubblicità, sezioni "chi siamo", meteo o widget tecnici.
- Concentrati sulla "testata" (above the fold) e sulle sezioni principali della cronaca.
- Restituisci un massimo di 15 articoli, ordinati dal più recente al meno recente trovato.

Rispondi ESCLUSIVAMENTE con un JSON valido nel seguente formato:
{
  "articles": [
    {
      "title": "Stringa",
      "link": "Stringa URL assoluto",
      "snippet": "Stringa anteprima",
      "pubDate": "Stringa ISO Date"
    }
  ]
}

ESTRATTO HTML DA ANALIZZARE:
${htmlSnippet.substring(0, 15000)}`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed.articles)) {
        return parsed.articles.map((a: any) => ({
          title: String(a.title || "No Title"),
          link: String(a.link || ""),
          content: String(a.snippet || ""),
          pubDate: a.pubDate || new Date().toISOString(),
          guid: a.link || `ai-${Math.random().toString(36).substring(7)}`
        })).filter((a: any) => a.link && a.link.startsWith("http"));
      }
    }
  } catch (err: any) {
    console.warn(`AI Scraping error for ${sourceName}:`, err.message || "Unknown error");
  }

  return [];
}

/**
 * Analyzes the raw HTML of a source once and asks the AI to produce a reusable
 * CSS selector-based extraction rule (ScraperConfig), so subsequent fetches can
 * scrape new articles from that source with cheerio, without further AI calls.
 */
export async function generateScraperConfig(url: string, htmlSnippet: string, sourceName: string): Promise<ScraperConfig | null> {
  const gemini = getGemini();
  if (!gemini) {
    return null;
  }

  const prompt = `Sei un ingegnere esperto di web scraping. Analizza l'HTML della homepage del sito di news "${sourceName}" (URL: ${url}) e produci una regola di estrazione RIUTILIZZABILE basata su selettori CSS, così che un programma possa estrarre gli articoli da questo stesso sito in futuro senza intervento umano o AI.

ISTRUZIONI:
1. Individua il selettore CSS del blocco/contenitore HTML che si ripete per ogni notizia in homepage (es. "article.card", "div.news-item", ecc.). Deve matchare SOLO blocchi di notizie reali, non menu/pubblicità/footer.
2. Per ognuno di quei selettori, fornisci i selettori CSS RELATIVI (cercati dentro al contenitore) per: titolo, link (e l'attributo da leggere, di solito "href"), immagine (e l'attributo, di solito "src" o "data-src"), data/orario pubblicazione (se presente), breve estratto (se presente).
3. I selettori devono essere il più possibile stabili e generici (basati su tag/classi strutturali), non su indici numerici fragili.
4. Se non riesci a identificare un pattern ripetuto affidabile, rispondi con {"unsupported": true}.

Rispondi ESCLUSIVAMENTE con un JSON valido in uno di questi due formati:
{
  "containerSelector": "string",
  "titleSelector": "string",
  "linkSelector": "string",
  "linkAttr": "string",
  "imageSelector": "string",
  "imageAttr": "string",
  "dateSelector": "string",
  "snippetSelector": "string"
}
oppure
{ "unsupported": true }

ESTRATTO HTML DA ANALIZZARE:
${htmlSnippet.substring(0, 15000)}`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (parsed.unsupported) return null;
      if (parsed.containerSelector && parsed.titleSelector && parsed.linkSelector) {
        return {
          containerSelector: String(parsed.containerSelector),
          titleSelector: String(parsed.titleSelector),
          linkSelector: String(parsed.linkSelector),
          linkAttr: parsed.linkAttr ? String(parsed.linkAttr) : undefined,
          imageSelector: parsed.imageSelector ? String(parsed.imageSelector) : undefined,
          imageAttr: parsed.imageAttr ? String(parsed.imageAttr) : undefined,
          dateSelector: parsed.dateSelector ? String(parsed.dateSelector) : undefined,
          snippetSelector: parsed.snippetSelector ? String(parsed.snippetSelector) : undefined,
          generatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err: any) {
    console.warn(`AI ScraperConfig generation error for ${sourceName}:`, err.message || "Unknown error");
  }

  return null;
}

