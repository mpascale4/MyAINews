import { getGemini } from "./gemini";

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

