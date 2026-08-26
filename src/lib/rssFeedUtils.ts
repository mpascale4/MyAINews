import type Parser from "rss-parser";
import type { Article, Feed, FeedFetchResult } from "../types";
import { scrapeSourceWithInlineTransformer } from "./rssScraper";
import {
  DEFAULT_HEADERS,
  decodeResponseText,
  extractImageUrl,
  getErrorMessage,
  isLikelyXmlFeed,
  parser,
  type FeedUrlTestResult,
  type ParserItem,
  stripHtml,
} from "./rssShared";

function buildCandidateFeedUrls(url: string, feedName: string) {
  const candidateUrls = [url];

  if (url.endsWith("/")) {
    candidateUrls.push(url.slice(0, -1));
  } else if (!url.endsWith(".xml") && !url.includes("?")) {
    candidateUrls.push(`${url}/`);
  }

  const problematicSites = ["loschermo.it", "gazzettadilucca.it", "toscanagol.it", "tuttocampo.it", "iltirreno.it"];
  if (!problematicSites.some((site) => url.includes(site))) {
    return Array.from(new Set(candidateUrls));
  }

  const hostname = new URL(url).hostname.replace("www.", "");
  const siteQuery = url.includes("iltirreno.it") ? "site:iltirreno.it+lucca" : `site:${hostname}`;
  const nameQuery = encodeURIComponent(feedName.replace("RSS", "").trim());

  return Array.from(
    new Set([
      `https://news.google.com/rss/search?q=${siteQuery}+when:1d&hl=it&gl=IT&ceid=IT:it`,
      ...candidateUrls,
      `https://news.google.com/rss/search?q=${siteQuery}+when:7d&hl=it&gl=IT&ceid=IT:it`,
      `https://news.google.com/rss/search?q=${nameQuery}&hl=it&gl=IT&ceid=IT:it`,
      `https://news.google.com/rss/search?q=${siteQuery}&hl=it&gl=IT&ceid=IT:it`,
      ...(url.includes("ilpost.it") ? ["https://feeds.feedburner.com/ilpost"] : []),
    ]),
  );
}

async function tryFetchFeedXml(targetUrl: string) {
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

async function tryCurlFeedXml(targetUrl: string) {
  try {
    const { execSync } = await import("child_process");
    const output = execSync(`curl -k -L -s -m 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${targetUrl}"`, {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 2,
    });
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
    return parsed.items?.length ? parsed : null;
  } catch {
    return null;
  }
}

function toArticle(feed: Feed, item: ParserItem): Article | null {
  const link = item.link?.trim();
  const title = item.title?.trim();
  if (!link || !title) {
    return null;
  }

  const content = getArticleContent(item);

  return {
    guid: item.guid || item.id || link,
    title,
    link,
    content,
    contentSnippet: item.contentSnippet || stripHtml(content).slice(0, 280),
    pubDate: item.pubDate || null,
    source: feed.name,
    imageUrl: extractImageUrl(item) || null,
    aiSummary: null,
  };
}

function getArticleContent(item: ParserItem) {
  const contentParts = [item.contentEncoded, item["content:encoded"], item.content, item.contentSnippet];
  return contentParts.find((value) => typeof value === "string" && value.trim()) || "";
}

function dedupeArticles(items: Article[]) {
  const seen = new Set<string>();
  return items.filter((article) => {
    const key = article.link.trim().toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function loadSourceText(url: string) {
  try {
    const response = await fetch(url, { headers: DEFAULT_HEADERS });
    return response.ok ? decodeResponseText(response) : "";
  } catch {
    return "";
  }
}

export async function fetchFeedWithFallback(originalUrl: string, feedName: string) {
  const uniqueUrls = buildCandidateFeedUrls(originalUrl.trim(), feedName);
  for (const targetUrl of uniqueUrls) {
    const parsed = await parseFeedCandidate(targetUrl);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

export async function testFeedUrl(url: string): Promise<FeedUrlTestResult> {
  try {
    const text = await loadSourceText(url);
    if (!text) {
      return { isValidRss: false, isScrapeableHtml: false, error: "Sorgente non raggiungibile o risposta troppo breve." };
    }

    if (text.trim().toLowerCase().includes("<html")) {
      const scraped = await scrapeSourceWithInlineTransformer({ url, name: url });
      return {
        isValidRss: false,
        isScrapeableHtml: scraped.length > 0,
        transformerCreated: scraped.length > 0,
        itemCount: scraped.length,
        error: scraped.length > 0 ? undefined : "Impossibile estrarre articoli dalla pagina HTML.",
      };
    }

    const parsed = await parser.parseString(text);
    return {
      isValidRss: true,
      isScrapeableHtml: false,
      detectedName: parsed.title,
      itemCount: parsed.items?.length,
      sampleItems: (parsed.items || []).slice(0, 3).map((item) => ({ title: item.title, link: item.link })),
    };
  } catch (error) {
    return { isValidRss: false, isScrapeableHtml: false, error: getErrorMessage(error) };
  }
}

export async function fetchFeedArticles(feed: Feed): Promise<FeedFetchResult> {
  try {
    const parsed = await fetchFeedWithFallback(feed.url, feed.name);
    if (parsed?.items?.length) {
      return {
        feed,
        articles: dedupeArticles(parsed.items.map((item) => toArticle(feed, item)).filter((item): item is Article => item !== null)),
      };
    }

    const scraped = await scrapeSourceWithInlineTransformer(feed);
    return {
      feed,
      usedScraper: true,
      articles: dedupeArticles(
        scraped.map((item) => ({
          guid: item.guid,
          title: item.title,
          link: item.link,
          content: item.content,
          contentSnippet: stripHtml(item.content).slice(0, 280),
          pubDate: item.pubDate || null,
          source: feed.name,
          imageUrl: item.imageUrl,
          aiSummary: null,
        })),
      ),
      error: scraped.length === 0 ? "Nessun articolo trovato." : undefined,
    };
  } catch (error) {
    return { feed, articles: [], error: getErrorMessage(error) };
  }
}

export async function fetchBulkFeedArticles(feeds: Feed[]) {
  return Promise.all(feeds.map((feed) => fetchFeedArticles(feed)));
}
