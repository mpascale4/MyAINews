import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function truncateContent(content: string) {
  return content.trim().slice(0, 4000);
}

function buildSummaryPrompt(title: string, content: string) {
  return `Sei un giornalista esperto. Scrivi un riassunto in italiano dell'articolo seguente.

Regole:
- Rispondi solo con JSON valido.
- Mantieni due sezioni markdown: "### ⚡ Sintesi rapida" e "### 📖 Quadro dettagliato".
- Evidenzia in **grassetto** i concetti chiave.
- Non inventare dettagli assenti nel testo.

Titolo: ${title}
Contenuto:
${truncateContent(content) || title}

Formato JSON: {"summary":"..."}`;
}

function parseSummaryResponse(text: string) {
  const parsed = JSON.parse(text) as { summary?: unknown };
  return typeof parsed.summary === "string" ? parsed.summary : null;
}

function buildFallbackSummary(title: string, content: string) {
  const snippet = truncateContent(content) || title;
  return `### ⚡ Sintesi rapida
**${title}**

### 📖 Quadro dettagliato
${snippet}`;
}

export function getGemini() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });
  }

  return aiClient;
}

export async function generateArticleSummary(title: string, content: string) {
  const gemini = getGemini();
  if (!gemini) {
    return buildFallbackSummary(title, content);
  }

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: buildSummaryPrompt(title, content),
      config: { responseMimeType: "application/json", temperature: 0.2 },
    });

    if (response.text) {
      const summary = parseSummaryResponse(response.text);
      if (summary) {
        return summary;
      }
    }
  } catch (error) {
    console.warn("Gemini summary fallback:", error);
  }

  return buildFallbackSummary(title, content);
}

export { searchFeedsByKeyword } from "./geminiFeedSearch";
export { generateScraperConfig, scrapeArticlesWithAI } from "./geminiScraper";
