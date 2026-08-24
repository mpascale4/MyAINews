import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

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

function extractTitle($el: cheerio.Cheerio<AnyNode>, config: ScraperConfig): string {
  return config.titleSelector ? $el.find(config.titleSelector).first().text().trim() : "";
}

function extractLink($el: cheerio.Cheerio<AnyNode>, baseUrl: string, config: ScraperConfig): string {
  const linkTarget = config.linkSelector ? $el.find(config.linkSelector).first() : $el;
  const rawLink = linkTarget.attr(config.linkAttr || "href") || (linkTarget.is("a") ? linkTarget.attr("href") : undefined);
  return resolveUrl(baseUrl, rawLink);
}

function extractImage($el: cheerio.Cheerio<AnyNode>, baseUrl: string, config: ScraperConfig): string | null {
  if (!config.imageSelector) {
    return null;
  }

  const imgTarget = $el.find(config.imageSelector).first();
  const rawImg = imgTarget.attr(config.imageAttr || "src");
  return rawImg ? resolveUrl(baseUrl, rawImg) : null;
}

function extractSnippet($el: cheerio.Cheerio<AnyNode>, config: ScraperConfig): string {
  return config.snippetSelector ? $el.find(config.snippetSelector).first().text().trim() : "";
}

function extractPubDate($el: cheerio.Cheerio<AnyNode>, config: ScraperConfig): string {
  const dateText = config.dateSelector ? $el.find(config.dateSelector).first().text().trim() : "";
  return dateText || new Date().toISOString();
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

    const title = extractTitle($el, config);
    if (!title) return;

    const link = extractLink($el, baseUrl, config);
    if (!link || !link.startsWith("http")) return;

    results.push({
      title,
      link,
      content: extractSnippet($el, config),
      pubDate: extractPubDate($el, config),
      guid: link,
      imageUrl: extractImage($el, baseUrl, config),
    });
  });

  return results;
}
