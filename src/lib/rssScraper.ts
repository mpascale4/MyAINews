import { generateScraperConfig, scrapeArticlesWithAI } from "./geminiScraper";
import { applyScraperConfig, type ScrapedArticle } from "./scraper";
import { cleanHtmlForAI, decodeResponseText, DEFAULT_HEADERS, getErrorMessage } from "./rssShared";

function getFetchUrls(url: string) {
  return url.startsWith("https://") ? [url, url.replace("https://", "http://")] : [url];
}

async function tryFetchHtml(url: string) {
  const response = await fetch(url, { headers: { ...DEFAULT_HEADERS, Accept: "text/html,application/xhtml+xml,*/*" } });
  if (!response.ok) {
    return "";
  }

  return decodeResponseText(response);
}

async function tryCurlHtml(url: string) {
  try {
    const { execSync } = await import("child_process");
    return execSync(`curl -k -L -s -m 20 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${url}"`, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 2,
    });
  } catch {
    return "";
  }
}

export async function fetchHtmlWithFallback(url: string) {
  for (const targetUrl of getFetchUrls(url)) {
    try {
      const html = await tryFetchHtml(targetUrl);
      if (html.length > 500) {
        return html;
      }
    } catch {
      // ignore
    }

    const curlHtml = await tryCurlHtml(targetUrl);
    if (curlHtml.length > 500) {
      return curlHtml;
    }
  }

  throw new Error("Unable to fetch HTML source");
}

export async function scrapeSourceWithInlineTransformer(feed: { url: string; name: string }) {
  const html = await fetchHtmlWithFallback(feed.url);
  const cleanedHtml = cleanHtmlForAI(html);

  const config = await generateScraperConfig(feed.url, cleanedHtml, feed.name);
  if (config) {
    try {
      const items = applyScraperConfig(html, feed.url, config);
      if (items.length > 0) {
        return items;
      }
    } catch (error) {
      console.warn("Inline transformer failed:", getErrorMessage(error));
    }
  }

  return scrapeArticlesWithAI(feed.url, cleanedHtml, feed.name);
}

export type { ScrapedArticle };
