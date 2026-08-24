const TAG_RULES: Array<{ tag: string; pattern: RegExp }> = [
  { tag: "AI", pattern: /ai\b|artificial intelligence|intelligenza artificiale|openai|chatgpt|gemini|claude|llm|deepmind|robot|machine learning|algorithm/i },
  { tag: "Sicurezza", pattern: /hack|security|sicurezza|cyber|ransomware|breach|malware|scam|truffa|vulnerability|spyware/i },
  { tag: "Finanza", pattern: /crypto|bitcoin|ethereum|tax|fisco|hmrc|bank|banca|monzo|finanza|economy|invoicing|fintech|mercati|borsa|startup/i },
  { tag: "Tecnologia", pattern: /software|app\b|apple|iphone|android|google|meta|facebook|instagram|tiktok|social|vine|browser|cloud/i },
  { tag: "Hardware", pattern: /hardware|chip|semiconductor|nvidia|amd|intel|processor|battery|batteria|smartphone|laptop/i },
  { tag: "Gaming", pattern: /game|gaming|videogiochi|nintendo|playstation|xbox|steam|esports/i },
  { tag: "Scienza & Clima", pattern: /climate|clima|ambiente|green|solar|energia|elettrico|science|spazio|scienza/i },
  { tag: "Business", pattern: /business|market|azienda|industria|vendite|prezzo|hike|ceo/i },
];

function addMatchingTags(text: string, tags: Set<string>) {
  for (const rule of TAG_RULES) {
    if (rule.pattern.test(text)) {
      tags.add(rule.tag);
    }
  }
}

function addLocalTags(text: string, source: string, tags: Set<string>) {
  const localPattern = /toscana|cecina|livorno|pisa|firenze|comune|sindaco|carabinieri|polizia|regione/i;
  const tuscanyPattern = /toscana|cecina|livorno|pisa|firenze/i;
  const sourceLocalPattern = /toscana|cecina/i;

  if (!localPattern.test(text) && !sourceLocalPattern.test(source)) {
    return;
  }

  tags.add("Cronaca Locale");
  if (tuscanyPattern.test(text) || sourceLocalPattern.test(source)) {
    tags.add("Toscana");
  }
}

function addFallbackTags(source: string, tags: Set<string>) {
  if (tags.size > 0) {
    return;
  }

  if (/the verge|bbc technology|tech/i.test(source)) {
    tags.add("Tecnologia");
    tags.add("Innovazione");
    return;
  }

  if (/news|notizie/i.test(source)) {
    tags.add("Attualità");
    tags.add("Notizie");
    return;
  }

  tags.add("News");
}

export function extractDefaultTags(title: string, content: string = "", source: string = ""): string[] {
  const text = `${title} ${content} ${source}`.toLowerCase();
  const tags = new Set<string>();

  addMatchingTags(text, tags);
  addLocalTags(text, source, tags);
  addFallbackTags(source, tags);

  return Array.from(tags).slice(0, 3);
}
