import { db } from "../db";
import { articles, rssFeeds } from "../db/schema";
import { type ScraperConfig } from "./scraper";
import { extractDefaultTags } from "./tagExtractor";
import { scrapeSourceWithAdHocTransformer } from "./rssScraper";
import {
  extractImageUrl,
  type ExistingArticleRow,
  type FeedProcessContext,
  getErrorMessage,
  type InterestRow,
  normalizeLink,
  type ParserItem,
  type PreparedArticle,
  stripHtml,
} from "./rssShared";
import { fetchFeedWithFallback } from "./rssFeedUtils";

const DEFAULT_RELEVANCE = 50;
const NEGATIVE_ONLY_CAP = 25;
const MULTI_MATCH_MIN_RELEVANCE = 85;
const SINGLE_MATCH_MIN_RELEVANCE = 75;
const POSITIVE_SCORE_BOOST = 20;
const NEGATIVE_SCORE_PENALTY = 35;

function isVeryProblematicFeed(url: string): boolean {
  return ["gazzettadilucca.it", "loschermo.it", "toscanagol.it"].some((site) => url.includes(site));
}

async function loadItemsForFeed(feed: typeof rssFeeds.$inferSelect) {
  const parsedFeed = await fetchFeedWithFallback(feed.url, feed.name);
  if (parsedFeed) {
    const items = (parsedFeed.items || []).slice(0, 50);
    console.log(`Found ${items.length} items for ${feed.name} via RSS`);
    return { items, parsedFeed };
  }

  if (isVeryProblematicFeed(feed.url)) {
    console.log(`RSS failed for ${feed.name}. Skipping direct scraper fallback as site is currently unreachable.`);
    return { items: [] as ParserItem[], parsedFeed: null };
  }

  console.log(`RSS failed for ${feed.name}, trying ad-hoc HTML transformer fallback...`);
  try {
    const scrapedItems = await scrapeSourceWithAdHocTransformer({
      id: feed.id,
      url: feed.url,
      name: feed.name,
      scraperConfig: (feed.scraperConfig as ScraperConfig | null) || null,
    });
    if (scrapedItems.length > 0) {
      console.log(`Successfully extracted ${scrapedItems.length} items for ${feed.name} via ad-hoc transformer`);
      return { items: scrapedItems, parsedFeed: null };
    }

    console.log(`Ad-hoc transformer returned 0 articles for ${feed.name}`);
  } catch (error: unknown) {
    console.warn(`Ad-hoc transformer failed for ${feed.name}:`, getErrorMessage(error) || "Unknown error");
  }

  return { items: [] as ParserItem[], parsedFeed: null };
}

function normalizeExistingTitle(title: string | null): string {
  return title ? title.trim().toLowerCase().replace(/[^\w\s]/gi, "") : "";
}

export function buildFeedProcessContext(userInterests: InterestRow[], allExisting: ExistingArticleRow[]): FeedProcessContext {
  return {
    existingGuids: new Set(allExisting.map((article) => article.guid)),
    existingTitles: new Set(allExisting.map((article) => normalizeExistingTitle(article.title))),
    existingLinks: new Set(allExisting.map((article) => normalizeLink(article.link || "")).filter(Boolean)),
    userInterests,
  };
}

function normalizePubDate(pubDate: string | undefined): string {
  const parsed = pubDate ? new Date(pubDate) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function extractTitleAndContent(item: ParserItem): { title: string; content: string } {
  const title = stripHtml(item.title || "No Title").trim() || "No Title";
  const rawContent = item.contentEncoded || item["content:encoded"] || item.content || item.contentSnippet || "";
  return { title, content: stripHtml(rawContent).trim() };
}

function prepareArticle(item: ParserItem, feedName: string, userInterests: InterestRow[]): PreparedArticle | null {
  const guid = item.guid || item.id || item.link;
  if (!guid) {
    return null;
  }

  const link = item.link || "";
  const { title, content } = extractTitleAndContent(item);
  const defaultTags = extractDefaultTags(title, content, feedName);
  return {
    guid,
    title,
    link,
    normTitle: normalizeExistingTitle(title),
    normLink: normalizeLink(link),
    content,
    pubDate: normalizePubDate(item.pubDate),
    imageUrl: item.imageUrl !== undefined ? item.imageUrl : extractImageUrl(item),
    defaultTags,
    relevance: calculateFastRelevance(title, content, defaultTags, userInterests),
  };
}

function isExistingArticle(article: PreparedArticle, context: FeedProcessContext): boolean {
  return context.existingGuids.has(article.guid)
    || (article.normTitle && context.existingTitles.has(article.normTitle))
    || (article.normLink && context.existingLinks.has(article.normLink));
}

function rememberInsertedArticle(article: PreparedArticle, context: FeedProcessContext) {
  context.existingGuids.add(article.guid);
  if (article.normTitle) {
    context.existingTitles.add(article.normTitle);
  }
  if (article.normLink) {
    context.existingLinks.add(article.normLink);
  }
}

async function insertArticleIfNew(item: ParserItem, feedName: string, context: FeedProcessContext): Promise<boolean> {
  const prepared = prepareArticle(item, feedName, context.userInterests);
  if (!prepared || isExistingArticle(prepared, context)) {
    return false;
  }

  await db.insert(articles).values({
    guid: prepared.guid,
    title: prepared.title,
    link: prepared.link,
    content: prepared.content,
    pubDate: prepared.pubDate,
    source: feedName,
    imageUrl: prepared.imageUrl,
    aiSummary: null,
    aiTags: prepared.defaultTags,
    aiRelevance: prepared.relevance,
    isNotified: false,
  }).onConflictDoNothing();

  rememberInsertedArticle(prepared, context);
  return true;
}

export async function processSingleFeed(feed: typeof rssFeeds.$inferSelect, context: FeedProcessContext): Promise<number> {
  console.log(`Processing feed: ${feed.name} (${feed.url})`);
  const { items, parsedFeed } = await loadItemsForFeed(feed);
  if (items.length === 0) {
    console.log(`No news found for feed: ${feed.name}`);
    return 0;
  }

  const feedName = feed.name || parsedFeed?.title || "Unknown Source";
  let insertedCount = 0;
  for (const item of items) {
    if (await insertArticleIfNew(item, feedName, context)) {
      insertedCount++;
    }
  }
  return insertedCount;
}

function computeInterestMatches(text: string, userInterests: InterestRow[]) {
  let score = DEFAULT_RELEVANCE;
  let matchesPositive = 0;
  let matchesNegative = 0;

  for (const item of userInterests) {
    const keyword = item.keyword.trim().toLowerCase();
    if (!keyword || !text.includes(keyword)) {
      continue;
    }

    if (item.type === "positive") {
      matchesPositive++;
      score += Math.round(POSITIVE_SCORE_BOOST * (item.weight || 1));
    } else if (item.type === "negative") {
      matchesNegative++;
      score -= Math.round(NEGATIVE_SCORE_PENALTY * (item.weight || 1));
    }
  }

  return { score, matchesPositive, matchesNegative };
}

function clampRelevance(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function applyPositiveMatchFloor(score: number, matchesPositive: number): number {
  if (matchesPositive >= 2) {
    return Math.max(score, MULTI_MATCH_MIN_RELEVANCE);
  }
  if (matchesPositive === 1) {
    return Math.max(score, SINGLE_MATCH_MIN_RELEVANCE);
  }
  return score;
}

export function calculateFastRelevance(title: string, content: string, tags: string[], userInterests: InterestRow[]): number {
  if (userInterests.length === 0) {
    return DEFAULT_RELEVANCE;
  }

  const text = `${title} ${content} ${tags.join(" ")}`.toLowerCase();
  const { score, matchesPositive, matchesNegative } = computeInterestMatches(text, userInterests);
  if (matchesNegative > 0 && matchesPositive === 0) {
    return Math.max(0, Math.min(NEGATIVE_ONLY_CAP, score));
  }

  return clampRelevance(applyPositiveMatchFloor(score, matchesPositive));
}
