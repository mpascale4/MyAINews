import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildProcessArticlePrompt(title: string, content: string): string {
  return `Sei un giornalista, curatore ed analista di notizie esperto. Il tuo compito è redigere un riassunto a DOPPIO LIVELLO (prima versione breve/sintetica, poi versione approfondita/estesa) in lingua ITALIANA della seguente notizia.

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
}

type ArticleAIResult = {
  summary: string;
  relevance: number;
  tags: string[];
};

async function generateArticleSummary(
  gemini: GoogleGenAI,
  prompt: string,
): Promise<ArticleAIResult | null> {
  const response = await gemini.models.generateContent({
    model: "gemini-3.1-flash-lite",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  });

  if (!response.text) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    console.warn("JSON parse fallback for summary");
    return null;
  }

  if (!parsed || !parsed.summary) {
    return null;
  }

  return {
    summary: parsed.summary,
    relevance: typeof parsed.relevance === 'number' ? parsed.relevance : 50,
    tags: Array.isArray(parsed.tags) ? parsed.tags : []
  };
}

function buildArticleFallback(title: string, content: string): ArticleAIResult {
  const cleanSnippet = content ? content.substring(0, 300) : title;
  return {
    summary: `### SINTESI RAPIDA\n**${title}**\n\n${cleanSnippet}${cleanSnippet.length >= 300 ? '...' : ''}\n\n### QUADRO DETTAGLIATO\n${content || title}`,
    relevance: 50,
    tags: ["Notizia"]
  };
}

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

export async function processArticleWithAI(title: string, content: string) {
  const gemini = getGemini();
  if (!gemini) {
    return { summary: "AI Summary non disponibile (Chiave API non configurata).", relevance: 50, tags: [] };
  }

  const prompt = buildProcessArticlePrompt(title, content);

  try {
    const generated = await generateArticleSummary(gemini, prompt);
    if (generated) {
      return generated;
    }
  } catch (err: unknown) {
    console.warn("Gemini API warning:", getErrorMessage(err));
  }

  return buildArticleFallback(title, content);
}

// Re-exported for backward compatibility: callers historically imported these
// from "./gemini" even though the implementations now live in dedicated modules.
export { generateFeedsWithAI, runProfileInterview, type AIFeedSuggestion } from "./geminiFeedGeneration";
export { searchFeedsByKeyword } from "./geminiFeedSearch";
export { scrapeArticlesWithAI, generateScraperConfig } from "./geminiScraper";
