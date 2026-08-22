export function extractDefaultTags(title: string, content: string = "", source: string = ""): string[] {
  const text = `${title} ${content} ${source}`.toLowerCase();
  const tags = new Set<string>();

  // AI & ML
  if (/ai\b|artificial intelligence|intelligenza artificiale|openai|chatgpt|gemini|claude|llm|deepmind|robot|machine learning|algorithm/i.test(text)) {
    tags.add("AI");
  }

  // Security
  if (/hack|security|sicurezza|cyber|ransomware|breach|malware|scam|truffa|vulnerability|spyware/i.test(text)) {
    tags.add("Sicurezza");
  }

  // Crypto & Finance
  if (/crypto|bitcoin|ethereum|tax|fisco|hmrc|bank|banca|monzo|finanza|economy|invoicing|fintech|mercati|borsa|startup/i.test(text)) {
    tags.add("Finanza");
  }

  // Tech & Apps
  if (/software|app\b|apple|iphone|android|google|meta|facebook|instagram|tiktok|social|vine|browser|cloud/i.test(text)) {
    tags.add("Tecnologia");
  }

  // Hardware & Devices
  if (/hardware|chip|semiconductor|nvidia|amd|intel|processor|battery|batteria|smartphone|laptop/i.test(text)) {
    tags.add("Hardware");
  }

  // Gaming
  if (/game|gaming|videogiochi|nintendo|playstation|xbox|steam|esports/i.test(text)) {
    tags.add("Gaming");
  }

  // Local / Italian Regional
  if (/toscana|cecina|livorno|pisa|firenze|comune|sindaco|carabinieri|polizia|regione/i.test(text) || /toscana|cecina/i.test(source)) {
    tags.add("Cronaca Locale");
    if (/toscana|cecina|livorno|pisa|firenze/i.test(text) || /toscana|cecina/i.test(source)) {
      tags.add("Toscana");
    }
  }

  // Environment & Science
  if (/climate|clima|ambiente|green|solar|energia|elettrico|science|spazio|scienza/i.test(text)) {
    tags.add("Scienza & Clima");
  }

  // Business & Market
  if (/business|market|azienda|industria|vendite|prezzo|hike|ceo/i.test(text)) {
    tags.add("Business");
  }

  // Fallbacks if no specific category matched
  if (tags.size === 0) {
    if (/the verge|bbc technology|tech/i.test(source)) {
      tags.add("Tecnologia");
      tags.add("Innovazione");
    } else if (/news|notizie/i.test(source)) {
      tags.add("Attualità");
      tags.add("Notizie");
    } else {
      tags.add("News");
    }
  }

  return Array.from(tags).slice(0, 3);
}
