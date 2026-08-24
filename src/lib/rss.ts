import Parser from "rss-parser";
import { db } from "../db";
import { articles, rssFeeds, interests } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { generateScraperConfig } from "./gemini";
import { applyScraperConfig, type ScraperConfig } from "./scraper";
import { extractDefaultTags } from "./tagExtractor";
import { decodeResponseText, extractImageUrl, normalizeLink, stripHtml, cleanHtmlForAI } from "./rssTextUtils";
import { scrapeSourceWithAdHocTransformer, ensureScraperConfigForFeed } from "./rssScraper";

export { normalizeLink, ensureScraperConfigForFeed };

type ParserItem = {
  guid?: string;
  id?: string;
  link?: string;
  title?: string;
  contentEncoded?: string;
  ["content:encoded"]?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  imageUrl?: string | null;
  mediaContent?: Array<{ $?: { url?: string } }>;
};

type FeedTestSampleItem = {
  title?: string;
  link?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "application/rss+xml, application/xml, application/atom+xml, text/xml, text/html;q=0.9, */*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache"
};

const parser = new Parser({
  headers: DEFAULT_HEADERS,
  timeout: 15000,
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: true }],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

type InterestRow = { keyword: string; type: string; weight: number };
type ExistingArticleRow = { guid: string; title: string | null; link: string | null };
type FeedProcessContext = {
  existingGuids: Set<string>;
  existingTitles: Set<string>;
  existingLinks: Set<string>;
  userInterests: InterestRow[];
};
type PreparedArticle = {
  guid: string;
  title: string;
  link: string;
  normTitle: string;
  normLink: string;
  content: string;
  pubDate: string;
  imageUrl: string | null;
  defaultTags: string[];
  relevance: number;
};

function buildCandidateFeedUrls(url: string, feedName: string): string[] {
  const candidateUrls = [url];

  if (url.endsWith('/')) {
    candidateUrls.push(url.slice(0, -1));
  } else if (!url.endsWith('.xml') && !url.includes('?')) {
    candidateUrls.push(`${url}/`);
  }

  const problematicSites = ['loschermo.it', 'gazzettadilucca.it', 'toscanagol.it', 'tuttocampo.it', 'iltirreno.it'];
  const isProblematic = problematicSites.some(site => url.includes(site));

  if (isProblematic) {
    const hostname = new URL(url).hostname.replace('www.', '');
    const siteQuery = url.includes('iltirreno.it') ? 'site:iltirreno.it+lucca' : `site:${hostname}`;
    const nameQuery = encodeURIComponent(feedName.replace('RSS', '').trim());

    candidateUrls.unshift(`https://news.google.com/rss/search?q=${siteQuery}+when:1d&hl=it&gl=IT&ceid=IT:it`);
    candidateUrls.push(`https://news.google.com/rss/search?q=${siteQuery}+when:7d&hl=it&gl=IT&ceid=IT:it`);
    candidateUrls.push(`https://news.google.com/rss/search?q=${nameQuery}&hl=it&gl=IT&ceid=IT:it`);
    candidateUrls.push(`https://news.google.com/rss/search?q=${siteQuery}&hl=it&gl=IT&ceid=IT:it`);
  }

  if (url.includes('ilpost.it')) {
    candidateUrls.push('https://feeds.feedburner.com/ilpost');
  }

  return Array.from(new Set(candidateUrls));
}

async function tryFetchFeedXml(targetUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(targetUrl, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal
    });

    if (!response.ok) {
      return "";
    }

    const xmlText = await decodeResponseText(response);
    return isLikelyXmlFeed(xmlText) ? xmlText : "";
  } finally {
    clearTimeout(timeoutId);
  }
}

function isLikelyXmlFeed(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 100 && !trimmed.startsWith('<!DOCTYPE html') && !trimmed.startsWith('<html');
}

async function tryCurlFeedXml(targetUrl: string): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    const cmd = `curl -k -L -s -m 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${targetUrl}"`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 });
    return isLikelyXmlFeed(output) ? output : "";
  } catch {
    return "";
  }
}

async function parseFeedCandidate(targetUrl: string): Promise<Parser.Output<ParserItem> | null> {
  try {
    const xmlText = await tryFetchFeedXml(targetUrl) || await tryCurlFeedXml(targetUrl);
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
    if (!response.ok) {
      return "";
    }

    return await decodeResponseText(response);
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchSourceTextWithCurl(url: string): Promise<string> {
  try {
    const { execSync } = await import('child_process');
    const cmd = `curl -k -L -s -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${url}"`;
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 });
    return output || "";
  } catch {
    return "";
  }
}

async function loadSourceText(url: string): Promise<string> {
  return await fetchSourceText(url) || await fetchSourceTextWithCurl(url);
}

async function testHtmlSource(url: string, text: string) {
  const cleaned = cleanHtmlForAI(text);
  if (cleaned.length <= 500) {
    return { isValidRss: false, isScrapeableHtml: false, error: "Pagina HTML troppo semplice o vuota per essere analizzata." };
  }

  try {
    const config = await generateScraperConfig(url, cleaned, url);
    if (config) {
      const items = applyScraperConfig(text, url, config);
      if (items.length > 0) {
        return { isValidRss: false, isScrapeableHtml: true, transformerCreated: true, itemCount: items.length };
      }
    }

    return { isValidRss: false, isScrapeableHtml: false, transformerCreated: false, error: "Impossibile creare un trasformatore funzionante per questa pagina." };
  } catch (e: unknown) {
    return { isValidRss: false, isScrapeableHtml: false, transformerCreated: false, error: getErrorMessage(e) || "Errore durante la creazione del trasformatore." };
  }
}

function isVeryProblematicFeed(url: string): boolean {
  const problematicSites = ['gazzettadilucca.it', 'loschermo.it', 'toscanagol.it'];
  return problematicSites.some(site => url.includes(site));
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
    if (scrapedItems && scrapedItems.length > 0) {
      console.log(`Successfully extracted ${scrapedItems.length} items for ${feed.name} via ad-hoc transformer`);
      return { items: scrapedItems, parsedFeed: null };
    }

    console.log(`Ad-hoc transformer returned 0 articles for ${feed.name}`);
  } catch (scrapeErr: unknown) {
    console.warn(`Ad-hoc transformer failed for ${feed.name}:`, getErrorMessage(scrapeErr) || "Unknown error");
  }

  return { items: [] as ParserItem[], parsedFeed: null };
}

function normalizeExistingTitle(title: string | null): string {
  return title ? title.trim().toLowerCase().replace(/[^\w\s]/gi, '') : '';
}

function buildFeedProcessContext(userInterests: InterestRow[], allExisting: ExistingArticleRow[]): FeedProcessContext {
  return {
    existingGuids: new Set(allExisting.map(a => a.guid)),
    existingTitles: new Set(allExisting.map(a => normalizeExistingTitle(a.title))),
    existingLinks: new Set(allExisting.map(a => normalizeLink(a.link || '')).filter(Boolean)),
    userInterests,
  };
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

async function processSingleFeed(feed: typeof rssFeeds.$inferSelect, context: FeedProcessContext): Promise<number> {
  console.log(`Processing feed: ${feed.name} (${feed.url})`);

  const { items, parsedFeed } = await loadItemsForFeed(feed);
  if (items.length === 0) {
    console.log(`No news found for feed: ${feed.name}`);
    return 0;
  }

  const feedName = feed.name || (parsedFeed ? (parsedFeed.title || "Unknown Source") : "Unknown Source");
  let insertedCount = 0;

  for (const item of items) {
    if (await insertArticleIfNew(item, feedName, context)) {
      insertedCount++;
    }
  }

  return insertedCount;
}

async function runArticlesTablePragmas() {
  await db.run(sql`PRAGMA journal_mode = WAL;`);
  await db.run(sql`PRAGMA synchronous = NORMAL;`);
  await db.run(sql`PRAGMA busy_timeout = 5000;`);
}

async function createBaseTables() {
  await createArticlesTable();
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);`);
  await createInterestsTable();
  await createUserBehaviorTable();
  await createRssFeedsTable();
  await createPushSubscriptionsTable();
  await createAppSettingsTable();
}

function prepareArticle(item: ParserItem, feedName: string, userInterests: InterestRow[]): PreparedArticle | null {
  const guid = item.guid || item.id || item.link;
  if (!guid) {
    return null;
  }

  const title = stripHtml(item.title || "No Title").trim() || "No Title";
  const link = item.link || "";
  const rawContent = item.contentEncoded || item['content:encoded'] || item.content || item.contentSnippet || "";
  const content = stripHtml(rawContent).trim();
  const parsedPubDate = item.pubDate ? new Date(item.pubDate) : null;
  const defaultTags = extractDefaultTags(title, content, feedName);

  return {
    guid,
    title,
    link,
    normTitle: normalizeExistingTitle(title),
    normLink: normalizeLink(link),
    content,
    pubDate: parsedPubDate && !isNaN(parsedPubDate.getTime()) ? parsedPubDate.toISOString() : new Date().toISOString(),
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

async function createArticlesTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guid TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      link TEXT NOT NULL,
      content TEXT,
      pub_date TEXT,
      source TEXT,
      image_url TEXT,
      ai_summary TEXT,
      ai_tags TEXT,
      ai_relevance REAL DEFAULT 0,
      is_read INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      is_saved INTEGER DEFAULT 0,
      is_notified INTEGER DEFAULT 0,
      saved_at TEXT,
      read_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function createInterestsTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS interests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      type TEXT NOT NULL,
      weight REAL DEFAULT 1.0
    );
  `);
}

async function createUserBehaviorTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user_behavior (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      action TEXT NOT NULL,
      time_spent INTEGER DEFAULT 0,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function createRssFeedsTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS rss_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      is_manual INTEGER DEFAULT 0,
      shown_count INTEGER DEFAULT 0,
      scraper_config TEXT,
      scraper_fail_count INTEGER DEFAULT 0
    );
  `);
}

async function createPushSubscriptionsTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function createAppSettingsTable() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function ensureLegacyColumns() {
  try { await db.run(sql`ALTER TABLE articles ADD COLUMN is_saved INTEGER DEFAULT 0`); } catch {}
  try { await db.run(sql`ALTER TABLE articles ADD COLUMN is_notified INTEGER DEFAULT 0`); } catch {}
  try { await db.run(sql`ALTER TABLE articles ADD COLUMN saved_at TEXT`); } catch {}
  try { await db.run(sql`ALTER TABLE articles ADD COLUMN read_at TEXT`); } catch {}
  try { await db.run(sql`ALTER TABLE rss_feeds ADD COLUMN shown_count INTEGER DEFAULT 0`); } catch {}
  try { await db.run(sql`ALTER TABLE rss_feeds ADD COLUMN scraper_config TEXT`); } catch {}
  try { await db.run(sql`ALTER TABLE rss_feeds ADD COLUMN scraper_fail_count INTEGER DEFAULT 0`); } catch {}
}

async function normalizeExistingFeedUrls() {
  const existingFeeds = await db.select().from(rssFeeds);
  if (existingFeeds.length === 0) {
    return;
  }

  for (const feed of existingFeeds) {
    if (feed.url === "https://www.ilpost.it/feed/") {
      await db.update(rssFeeds)
        .set({ url: "https://www.ilpost.it/feed" })
        .where(eq(rssFeeds.id, feed.id));
    }
  }
}

async function populateMissingTags() {
  const untaggedArticles = await db.select().from(articles);
  for (const article of untaggedArticles) {
    if (!article.aiTags || article.aiTags.length === 0) {
      const defaultTags = extractDefaultTags(article.title, article.content || "", article.source || "");
      await db.update(articles)
        .set({ aiTags: defaultTags })
        .where(eq(articles.id, article.id));
    }
  }
}

export async function fetchFeedWithFallback(originalUrl: string, feedName: string): Promise<Parser.Output<ParserItem> | null> {
  const url = originalUrl.trim();
  const uniqueUrls = buildCandidateFeedUrls(url, feedName);

  for (const targetUrl of uniqueUrls) {
    const parsed = await parseFeedCandidate(targetUrl);
    if (parsed) {
      return parsed;
    }
  }

  console.warn(`Could not fetch RSS feed from ${originalUrl} after all attempts.`);
  return null;
}

export async function testFeedUrl(url: string): Promise<{
  isValidRss: boolean;
  isScrapeableHtml: boolean;
  detectedName?: string;
  itemCount?: number;
  sampleItems?: FeedTestSampleItem[];
  transformerCreated?: boolean;
  error?: string;
}> {
  try {
    const text = await loadSourceText(url);
    if (!text) {
      return { isValidRss: false, isScrapeableHtml: false, error: "Sorgente non raggiungibile o risposta troppo breve." };
    }

    const trimmed = text.trim();
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html') || trimmed.toLowerCase().includes('<html')) {
      return await testHtmlSource(url, text);
    }

    try {
      const parsed = await parser.parseString(text);
      return {
        isValidRss: true,
        isScrapeableHtml: false,
        detectedName: parsed.title,
        itemCount: parsed.items?.length,
        sampleItems: (parsed.items || []).slice(0, 3).map(i => ({ title: i.title, link: i.link }))
      };
    } catch {
      return { isValidRss: false, isScrapeableHtml: text.length > 500, error: "La risposta non sembra un feed RSS valido." };
    }
  } catch (err: unknown) {
    return { isValidRss: false, isScrapeableHtml: false, error: getErrorMessage(err) || "Errore sconosciuto durante il test." };
  }
}


function calculateFastRelevance(title: string, content: string, tags: string[], userInterests: { keyword: string, type: string, weight: number }[]): number {
  if (!userInterests || userInterests.length === 0) return 50;
  
  const text = `${title} ${content} ${tags.join(" ")}`.toLowerCase();
  let score = 50;
  let matchesPositive = 0;
  let matchesNegative = 0;

  for (const item of userInterests) {
    const kw = item.keyword.trim().toLowerCase();
    if (!kw) continue;
    if (text.includes(kw)) {
      if (item.type === 'positive') {
        matchesPositive++;
        score += Math.round(20 * (item.weight || 1.0));
      } else if (item.type === 'negative') {
        matchesNegative++;
        score -= Math.round(35 * (item.weight || 1.0));
      }
    }
  }

  if (matchesNegative > 0 && matchesPositive === 0) {
    return Math.max(0, Math.min(25, score));
  }

  if (matchesPositive >= 2) {
    score = Math.max(score, 85);
  } else if (matchesPositive === 1) {
    score = Math.max(score, 75);
  }

  return Math.max(0, Math.min(100, score));
}

export async function fetchAllFeeds(onlyFeedIds?: number[]) {
  const allFeeds = await db.select().from(rssFeeds);
  const feeds = onlyFeedIds && onlyFeedIds.length > 0
    ? allFeeds.filter(f => onlyFeedIds.includes(f.id))
    : allFeeds;
  const userInterests = await db.select().from(interests);
  
  const allExisting = await db.select({ guid: articles.guid, title: articles.title, link: articles.link }).from(articles);
  const context = buildFeedProcessContext(userInterests, allExisting);
  let newArticlesInserted = 0;

  for (const feed of feeds) {
    try {
      newArticlesInserted += await processSingleFeed(feed, context);
    } catch (err: unknown) {
      console.warn(`Warning processing feed ${feed.url}:`, getErrorMessage(err) || "Unknown error");
    }
  }

  // After fetching new feeds, trigger push notification check for high relevance articles
  if (newArticlesInserted > 0) {
    try {
      const { notifyNewHighRelevanceArticles } = await import("./pushNotifications");
      await notifyNewHighRelevanceArticles();
    } catch (e: unknown) {
      console.warn("Could not send background high relevance notifications:", getErrorMessage(e));
    }
  }
}

export async function seedInitialData() {
  try {
    await runArticlesTablePragmas();
    await createBaseTables();
  } catch (err: unknown) {
    console.error("Error creating initial tables:", getErrorMessage(err));
  }

  await ensureLegacyColumns();
  try {
    await normalizeExistingFeedUrls();
  } catch (err: unknown) {
    console.error("Error seeding initial feeds:", getErrorMessage(err));
  }

  try {
    await populateMissingTags();
  } catch (err: unknown) {
    console.error("Error updating untagged articles:", getErrorMessage(err));
  }
}
