import { getGemini } from "./gemini";
import type { ScraperConfig } from "./scraper";

type ScrapedArticleCandidate = {
  title?: string;
  link?: string;
  snippet?: string;
  pubDate?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildScrapeArticlesPrompt(url: string, htmlSnippet: string, sourceName: string): string {
  return `Sei un analista di siti web e curatore di notizie esperto.
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
}

function mapScrapedArticles(parsedArticles: ScrapedArticleCandidate[]) {
  return parsedArticles
    .map((a: ScrapedArticleCandidate) => ({
      title: String(a.title || "No Title"),
      link: String(a.link || ""),
      content: String(a.snippet || ""),
      pubDate: a.pubDate || new Date().toISOString(),
      guid: a.link || `ai-${Math.random().toString(36).substring(7)}`,
      imageUrl: null,
    }))
    .filter((a: { link: string }) => a.link && a.link.startsWith("http"));
}

function buildScraperConfigPrompt(url: string, htmlSnippet: string, sourceName: string): string {
  return `Sei un ingegnere esperto di web scraping. Analizza l'HTML della homepage del sito di news "${sourceName}" (URL: ${url}) e produci una regola di estrazione RIUTILIZZABILE basata su selettori CSS, così che un programma possa estrarre gli articoli da questo stesso sito in futuro senza intervento umano o AI.

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
}

function parseScraperConfigCandidate(parsed: Record<string, unknown>): ScraperConfig | null {
  if (parsed.unsupported) {
    return null;
  }

  if (!parsed.containerSelector || !parsed.titleSelector || !parsed.linkSelector) {
    return null;
  }

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

export async function scrapeArticlesWithAI(url: string, htmlSnippet: string, sourceName: string) {
  const gemini = getGemini();
  if (!gemini) {
    return [];
  }

  const prompt = buildScrapeArticlesPrompt(url, htmlSnippet, sourceName);

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
        return mapScrapedArticles(parsed.articles);
      }
    }
  } catch (err: unknown) {
    console.warn(`AI Scraping error for ${sourceName}:`, getErrorMessage(err) || "Unknown error");
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

  const prompt = buildScraperConfigPrompt(url, htmlSnippet, sourceName);

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
      const parsed = JSON.parse(response.text) as Record<string, unknown>;
      return parseScraperConfigCandidate(parsed);
    }
  } catch (err: unknown) {
    console.warn(`AI ScraperConfig generation error for ${sourceName}:`, getErrorMessage(err) || "Unknown error");
  }

  return null;
}
