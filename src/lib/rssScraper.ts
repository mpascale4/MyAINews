import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { rssFeeds } from "../db/schema";
import { generateScraperConfig, scrapeArticlesWithAI } from "./gemini";
import { applyScraperConfig, type ScraperConfig, type ScrapedArticle } from "./scraper";
import { decodeResponseText, cleanHtmlForAI } from "./rssTextUtils";
import { fetchFeedWithFallback } from "./rss";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getFetchProtocols(url: string): string[] {
  const protocols = [url];
  if (url.startsWith('https')) {
    protocols.push(url.replace('https://', 'http://'));
  }
  return protocols;
}

async function tryFetchHtml(targetUrl: string): Promise<string> {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Cache-Control": "no-cache"
    }
  });

  if (!response.ok) {
    console.warn(`Node fetch for ${targetUrl} returned status ${response.status}`);
    return "";
  }

  const responseText = await decodeResponseText(response);
  return responseText.length > 500 ? responseText : "";
}

async function tryCurlHtml(targetUrl: string): Promise<string> {
  const { execSync } = await import('child_process');
  const problematicSites = ['gazzettadilucca.it', 'loschermo.it', 'toscanagol.it'];
  const isVeryProblematic = problematicSites.some(site => targetUrl.includes(site));

  console.log(`Attempting system curl for ${targetUrl} (insecure mode)...`);
  const timeout = isVeryProblematic ? 10 : 20;
  const cmd = `curl -k -L -s -m ${timeout} -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${targetUrl}"`;
  const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 });

  if (output && output.length > 500) {
    console.log(`System curl success for ${targetUrl} (${output.length} bytes)`);
    return output;
  }

  return "";
}

async function tryFetchProtocol(targetUrl: string, isFallbackProtocol: boolean): Promise<string> {
  if (isFallbackProtocol) {
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  try {
    const fetchedHtml = await tryFetchHtml(targetUrl);
    if (fetchedHtml) {
      return fetchedHtml;
    }
  } catch (e: unknown) {
    console.warn(`Node fetch failed for ${targetUrl}: ${getErrorMessage(e)}`);
    throw e;
  }

  try {
    return await tryCurlHtml(targetUrl);
  } catch {
    console.warn(`Curl execution failed for ${targetUrl} (likely timeout or block)`);
    return "";
  }
}

function isScrapeableHtmlDocument(html: string): boolean {
  const trimmed = html.trim();
  return Boolean(trimmed) && (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html') || trimmed.toLowerCase().includes('<html'));
}

async function createScraperConfigFromHtml(url: string, html: string, sourceName: string) {
  const cleanedHtml = cleanHtmlForAI(html);
  const config = await generateScraperConfig(url, cleanedHtml, sourceName);
  if (!config) {
    return null;
  }

  const items = applyScraperConfig(html, url, config);
  return items.length > 0 ? { config, items } : null;
}

async function saveScraperConfig(feedId: number, config: ScraperConfig) {
  await db.update(rssFeeds).set({ scraperConfig: config, scraperFailCount: 0 }).where(eq(rssFeeds.id, feedId));
}

/**
 * Robust HTML fetch (node fetch with http/https fallback + system curl fallback),
 * used both by the AI-based scraper and by the ad-hoc CSS-selector scraper.
 */
export async function fetchHtmlWithFallback(url: string): Promise<string> {
  const protocols = getFetchProtocols(url);

  let lastError = null;

  for (const [index, targetUrl] of protocols.entries()) {
    try {
      const html = await tryFetchProtocol(targetUrl, index > 0);
      if (html) {
        return html;
      }
    } catch (e: unknown) {
      lastError = e;
    }
  }
  throw lastError || new Error("All fetch methods failed");
}

/**
 * Ad-hoc scraper strategy for a source whose RSS feed is empty/unavailable.
 *
 * 1. If the feed already has a saved ScraperConfig (CSS selectors), apply it
 *    with cheerio (no AI call). This is the cheap, reusable path.
 * 2. If there's no saved config, or the saved one now yields 0 articles
 *    (self-healing: the site layout probably changed), ask the AI to
 *    (re)generate a ScraperConfig from the current HTML and persist it.
 * 3. If a working config still can't be produced, fall back to the generic
 *    one-shot AI scraper (scrapeArticlesWithAI) so we still get articles this
 *    cycle, without saving any reusable config.
 */
export async function scrapeSourceWithAdHocTransformer(feed: { id: number; url: string; name: string; scraperConfig: ScraperConfig | null }): Promise<ScrapedArticle[]> {
  const html = await fetchHtmlWithFallback(feed.url);
  console.log(`Fetched ${html.length} bytes of HTML for ${feed.name}`);

  if (feed.scraperConfig) {
    try {
      const items = applyScraperConfig(html, feed.url, feed.scraperConfig);
      if (items.length > 0) {
        console.log(`Extracted ${items.length} items for ${feed.name} via saved ad-hoc transformer`);
        return items;
      }
      console.log(`Saved ad-hoc transformer for ${feed.name} returned 0 articles, regenerating (self-healing)...`);
    } catch (e: unknown) {
      console.warn(`Saved ad-hoc transformer failed for ${feed.name}, regenerating:`, getErrorMessage(e));
    }
  }

  const cleanedHtml = cleanHtmlForAI(html);
  const newConfig = await generateScraperConfig(feed.url, cleanedHtml, feed.name);
  if (newConfig) {
    try {
      const items = applyScraperConfig(html, feed.url, newConfig);
      if (items.length > 0) {
        await db.update(rssFeeds).set({ scraperConfig: newConfig, scraperFailCount: 0 }).where(eq(rssFeeds.id, feed.id));
        console.log(`Generated and saved new ad-hoc transformer for ${feed.name} (${items.length} items)`);
        return items;
      }
    } catch (e: unknown) {
      console.warn(`Newly generated ad-hoc transformer failed for ${feed.name}:`, getErrorMessage(e));
    }
  }

  // Last resort: generic one-shot AI extraction, without a reusable config.
  console.log(`Falling back to generic AI scraper for ${feed.name}...`);
  await db.update(rssFeeds).set({ scraperFailCount: sql`${rssFeeds.scraperFailCount} + 1` }).where(eq(rssFeeds.id, feed.id));
  return await scrapeArticlesWithAI(feed.url, cleanedHtml, feed.name);
}

/**
 * Tries to set up an ad-hoc scraper config for a feed whose RSS turns out to
 * be invalid but whose HTML is scrapeable. Returns a summary of what happened
 * so callers can give the user feedback; also safe to call fire-and-forget.
 */
export async function ensureScraperConfigForFeed(feedId: number, url: string, sourceName: string): Promise<{
  createdTransformer: boolean;
  validRss: boolean;
  itemCount: number;
  reason?: string;
}> {
  try {
    const parsedFeed = await fetchFeedWithFallback(url, sourceName);
    if (parsedFeed) {
      return { createdTransformer: false, validRss: true, itemCount: (parsedFeed.items || []).length };
    }

    const html = await fetchHtmlWithFallback(url);
    if (!isScrapeableHtmlDocument(html)) {
      return { createdTransformer: false, validRss: false, itemCount: 0, reason: "Pagina non analizzabile (né RSS valido né HTML scrapeabile)." };
    }

    const generated = await createScraperConfigFromHtml(url, html, sourceName);
    if (!generated) {
      return { createdTransformer: false, validRss: false, itemCount: 0, reason: "L'AI non è riuscita a generare un trasformatore per questa pagina." };
    }

    await saveScraperConfig(feedId, generated.config);
    console.log(`Ad-hoc transformer created for ${sourceName} (${generated.items.length} items)`);
    return { createdTransformer: true, validRss: false, itemCount: generated.items.length };
  } catch (e: unknown) {
    console.warn(`Could not create ad-hoc transformer for ${sourceName}:`, getErrorMessage(e));
    return { createdTransformer: false, validRss: false, itemCount: 0, reason: getErrorMessage(e) || "Errore imprevisto." };
  }
}
