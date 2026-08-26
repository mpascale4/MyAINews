import Parser from "rss-parser";
import { applyScraperConfig } from "./scraper";
import { generateScraperConfig } from "./gemini";
import {
  cleanHtmlForAI,
  decodeResponseText,
  DEFAULT_HEADERS,
  type FeedUrlTestResult,
  getErrorMessage,
  isLikelyXmlFeed,
  parser,
  type ParserItem,
} from "./rssShared";

function buildCandidateFeedUrls(url: string, feedName: string): string[] {
  const candidateUrls = [url];

  if (url.endsWith("/")) {
    candidateUrls.push(url.slice(0, -1));
  } else if (!url.endsWith(".xml") && !url.includes("?")) {
    candidateUrls.push(`${url}/`);
  }

  const problematicSites = ["loschermo.it", "gazzettadilucca.it", "toscanagol.it", "tuttocampo.it", "iltirreno.it"];
  const isProblematic = problematicSites.some((site) => url.includes(site));
  if (!isProblematic) {
    return Array.from(new Set(candidateUrls));
  }

  const hostname = new URL(url).hostname.replace("www.", "");
  const siteQuery = url.includes("iltirreno.it") ? "site:iltirreno.it+lucca" : `site:${hostname}`;
  const nameQuery = encodeURIComponent(feedName.replace("RSS", "").trim());
  candidateUrls.unshift(`https://news.google.com/rss/search?q=${siteQuery}+when:1d&hl=it&gl=IT&ceid=IT:it`);
  candidateUrls.push(`https://news.google.com/rss/search?q=${siteQuery}+when:7d&hl=it&gl=IT&ceid=IT:it`);
  candidateUrls.push(`https://news.google.com/rss/search?q=${nameQuery}&hl=it&gl=IT&ceid=IT:it`);
  candidateUrls.push(`https://news.google.com/rss/search?q=${siteQuery}&hl=it&gl=IT&ceid=IT:it`);

  if (url.includes("ilpost.it")) {
    candidateUrls.push("https://feeds.feedburner.com/ilpost");
  }

  return Array.from(new Set(candidateUrls));
}

async function tryFetchFeedXml(targetUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(targetUrl, { headers: DEFAULT_HEADERS, signal: controller.signal });
    if (!response.ok) {
      return "";
    }

    const xmlText = await decodeResponseText(response);
    return isLikelyXmlFeed(xmlText) ? xmlText : "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function tryCurlFeedXml(targetUrl: string): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    const cmd = `curl -k -L -s -m 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${targetUrl}"`;
    const output = execSync(cmd, { encoding: "utf8", maxBuffer: 1024 * 1024 * 2 });
    return isLikelyXmlFeed(output) ? output : "";
  } catch {
    return "";
  }
}

async function parseFeedCandidate(targetUrl: string): Promise<Parser.Output<ParserItem> | null> {
  try {
    const xmlText = (await tryFetchFeedXml(targetUrl)) || (await tryCurlFeedXml(targetUrl));
    if (!xmlText) {
      return null;
    }

    const parsed = await parser.parseString(xmlText);
    return parsed && parsed.items && parsed.items.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchSourceText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
    return response.ok ? await decodeResponseText(response) : "";
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchSourceTextWithCurl(url: string): Promise<string> {
  try {
    const { execSync } = await import("child_process");
    const cmd = `curl -k -L -s -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${url}"`;
    return execSync(cmd, { encoding: "utf8", maxBuffer: 1024 * 1024 * 2 }) || "";
  } catch {
    return "";
  }
}

async function loadSourceText(url: string): Promise<string> {
  return (await fetchSourceText(url)) || (await fetchSourceTextWithCurl(url));
}

async function testHtmlSource(url: string, text: string): Promise<FeedUrlTestResult> {
  const cleaned = cleanHtmlForAI(text);
  if (cleaned.length <= 500) {
    return { isValidRss: false, isScrapeableHtml: false, error: "Pagina HTML troppo semplice o vuota per essere analizzata." };
  }

  try {
    const config = await generateScraperConfig(url, cleaned, url);
    if (!config) {
      return { isValidRss: false, isScrapeableHtml: false, transformerCreated: false, error: "Impossibile creare un trasformatore funzionante per questa pagina." };
    }

    const items = applyScraperConfig(text, url, config);
    if (items.length > 0) {
      return { isValidRss: false, isScrapeableHtml: true, transformerCreated: true, itemCount: items.length };
    }

    return { isValidRss: false, isScrapeableHtml: false, transformerCreated: false, error: "Impossibile creare un trasformatore funzionante per questa pagina." };
  } catch (error: unknown) {
    return { isValidRss: false, isScrapeableHtml: false, transformerCreated: false, error: getErrorMessage(error) || "Errore durante la creazione del trasformatore." };
  }
}

export async function fetchFeedWithFallback(originalUrl: string, feedName: string): Promise<Parser.Output<ParserItem> | null> {
  const uniqueUrls = buildCandidateFeedUrls(originalUrl.trim(), feedName);
  for (const targetUrl of uniqueUrls) {
    const parsed = await parseFeedCandidate(targetUrl);
    if (parsed) {
      return parsed;
    }
  }

  console.warn(`Could not fetch RSS feed from ${originalUrl} after all attempts.`);
  return null;
}

export async function testFeedUrl(url: string): Promise<FeedUrlTestResult> {
  try {
    const text = await loadSourceText(url);
    if (!text) {
      return { isValidRss: false, isScrapeableHtml: false, error: "Sorgente non raggiungibile o risposta troppo breve." };
    }

    const trimmed = text.trim();
    if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html") || trimmed.toLowerCase().includes("<html")) {
      return await testHtmlSource(url, text);
    }

    try {
      const parsed = await parser.parseString(text);
      return {
        isValidRss: true,
        isScrapeableHtml: false,
        detectedName: parsed.title,
        itemCount: parsed.items?.length,
        sampleItems: (parsed.items || []).slice(0, 3).map((item) => ({ title: item.title, link: item.link }))
      };
    } catch {
      return { isValidRss: false, isScrapeableHtml: text.length > 500, error: "La risposta non sembra un feed RSS valido." };
    }
  } catch (error: unknown) {
    return { isValidRss: false, isScrapeableHtml: false, error: getErrorMessage(error) || "Errore sconosciuto durante il test." };
  }
}
