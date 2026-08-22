import * as cheerio from "cheerio";

/**
 * Ad-hoc extraction rule for a specific HTML source, generated once by AI
 * and reused on subsequent fetch cycles without further AI calls.
 * All selectors except `containerSelector` are evaluated relative to each
 * matched container element.
 */
export type ScraperConfig = {
  containerSelector: string;
  titleSelector: string;
  linkSelector: string;
  linkAttr?: string; // defaults to "href"
  imageSelector?: string;
  imageAttr?: string; // defaults to "src"
  dateSelector?: string;
  snippetSelector?: string;
  generatedAt: string;
};

export type ScrapedArticle = {
  title: string;
  link: string;
  content: string;
  pubDate: string;
  guid: string;
  imageUrl: string | null;
};

function resolveUrl(base: string, href: string | undefined): string {
  if (!href) return "";
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

/**
 * Applies a saved ScraperConfig to raw HTML using cheerio (no AI call).
 * Returns an empty array if the config no longer matches anything, so the
 * caller can trigger a self-healing regeneration.
 */
export function applyScraperConfig(html: string, baseUrl: string, config: ScraperConfig): ScrapedArticle[] {
  const $ = cheerio.load(html);
  const results: ScrapedArticle[] = [];

  $(config.containerSelector).each((_, el) => {
    const $el = $(el);

    const title = config.titleSelector ? $el.find(config.titleSelector).first().text().trim() : "";
    if (!title) return;

    const linkTarget = config.linkSelector ? $el.find(config.linkSelector).first() : $el;
    const rawLink = linkTarget.attr(config.linkAttr || "href") || (linkTarget.is("a") ? linkTarget.attr("href") : undefined);
    const link = resolveUrl(baseUrl, rawLink);
    if (!link || !link.startsWith("http")) return;

    let imageUrl: string | null = null;
    if (config.imageSelector) {
      const imgTarget = $el.find(config.imageSelector).first();
      const rawImg = imgTarget.attr(config.imageAttr || "src");
      imageUrl = rawImg ? resolveUrl(baseUrl, rawImg) : null;
    }

    const snippet = config.snippetSelector ? $el.find(config.snippetSelector).first().text().trim() : "";
    const dateText = config.dateSelector ? $el.find(config.dateSelector).first().text().trim() : "";

    results.push({
      title,
      link,
      content: snippet,
      pubDate: dateText || new Date().toISOString(),
      guid: link,
      imageUrl,
    });
  });

  return results;
}
