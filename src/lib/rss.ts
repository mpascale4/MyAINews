import Parser from "rss-parser";
import { db } from "../db";
import { articles, rssFeeds, interests } from "../db/schema";
import { eq, inArray, like, sql } from "drizzle-orm";
import { processArticleWithAI, scrapeArticlesWithAI } from "./gemini";

import { extractDefaultTags } from "./tagExtractor";

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

function extractImageUrl(item: any): string | null {
  if (item.mediaContent && item.mediaContent.length > 0) {
    return item.mediaContent[0]['$']?.url || null;
  }
  if (item.contentEncoded) {
    const match = item.contentEncoded.match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }
  if (item.content) {
    const match = item.content.match(/<img[^>]+src="([^">]+)"/);
    if (match) return match[1];
  }
  return null;
}

function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

function cleanHtmlForAI(html: string): string {
  // Remove scripts, styles, and other non-content tags to save tokens
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '') // remove navigation
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '') // remove footer
    .replace(/<!--[\s\S]*?-->/g, '') // remove comments
    .replace(/\s\s+/g, ' ') // collapse whitespace
    .trim();

  // If still too large, try to find a main content area
  if (cleaned.length > 30000) {
    const mainMatch = cleaned.match(/<main\b[^<]*>([\s\S]*?)<\/main>/i) || 
                      cleaned.match(/<div\b[^>]*id="content"[^>]*>([\s\S]*?)<\/div>/i) ||
                      cleaned.match(/<div\b[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (mainMatch) {
      cleaned = mainMatch[1];
    }
  }

  return cleaned.substring(0, 20000); // hard cap at 20k chars for AI analysis
}

async function fetchFeedWithFallback(originalUrl: string, feedName: string): Promise<Parser.Output<{ [key: string]: any }> | null> {
  const url = originalUrl.trim();
  const candidateUrls = [url];

  // Specific normalization for URLs with or without trailing slashes
  if (url.endsWith('/')) {
    candidateUrls.push(url.slice(0, -1));
  } else if (!url.endsWith('.xml') && !url.includes('?')) {
    candidateUrls.push(`${url}/`);
  }

  // Prioritize Google News for problematic local sites with 24h restriction
  const problematicSites = ['loschermo.it', 'gazzettadilucca.it', 'toscanagol.it', 'tuttocampo.it', 'iltirreno.it'];
  const isProblematic = problematicSites.some(site => url.includes(site));
  
  if (isProblematic) {
    const hostname = new URL(url).hostname.replace('www.', '');
    const siteQuery = url.includes('iltirreno.it') ? 'site:iltirreno.it+lucca' : `site:${hostname}`;
    const nameQuery = encodeURIComponent(feedName.replace('RSS', '').trim());
    
    // 1. Precise site search (fresh 24h)
    candidateUrls.unshift(`https://news.google.com/rss/search?q=${siteQuery}+when:1d&hl=it&gl=IT&ceid=IT:it`);
    // 2. Precise site search (last 7 days)
    candidateUrls.push(`https://news.google.com/rss/search?q=${siteQuery}+when:7d&hl=it&gl=IT&ceid=IT:it`);
    // 3. Name-based search (very reliable for local news if site search fails)
    candidateUrls.push(`https://news.google.com/rss/search?q=${nameQuery}&hl=it&gl=IT&ceid=IT:it`);
    // 4. General site search as ultimate fallback
    candidateUrls.push(`https://news.google.com/rss/search?q=${siteQuery}&hl=it&gl=IT&ceid=IT:it`);
  }

  // Fallbacks for known feeds or problematic ones
  if (url.includes('ilpost.it')) {
    candidateUrls.push('https://feeds.feedburner.com/ilpost');
  }

  // Deduplicate candidates while preserving order
  const uniqueUrls = Array.from(new Set(candidateUrls));

  for (const targetUrl of uniqueUrls) {
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); 

      let xmlText = "";
      let success = false;

      try {
        const response = await fetch(targetUrl, {
          headers: DEFAULT_HEADERS,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          xmlText = await response.text();
          if (xmlText.trim().length > 100 && !xmlText.trim().startsWith('<!DOCTYPE html') && !xmlText.trim().startsWith('<html')) {
            success = true;
          }
        }
      } catch (e) {
        // Continue to curl fallback
      }

      // System Fallback: if node fetch fails, try curl (more robust for SSL/handshake issues)
      if (!success) {
        try {
          const { execSync } = await import('child_process');
          const cmd = `curl -k -L -s -m 15 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${targetUrl}"`;
          const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 });
          if (output && output.trim().length > 100 && !output.trim().startsWith('<!DOCTYPE html') && !output.trim().startsWith('<html')) {
            xmlText = output;
            success = true;
          }
        } catch (e) {
          // Ignore curl errors
        }
      }

      if (success) {
        const parsed = await parser.parseString(xmlText);
        if (parsed && parsed.items && parsed.items.length > 0) {
          return parsed;
        }
      }
    } catch (err: any) {
      // Continue to next candidate
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
  sampleItems?: any[];
  error?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    let text = "";
    try {
      const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        text = await response.text();
      }
    } catch (e) {}

    if (!text) {
      try {
        const { execSync } = await import('child_process');
        const cmd = `curl -k -L -s -m 10 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${url}"`;
        const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 });
        text = output || "";
      } catch (e) {}
    }

    if (!text || text.length < 50) {
      return { isValidRss: false, isScrapeableHtml: false, error: "Sorgente non raggiungibile o risposta troppo breve." };
    }

    const trimmed = text.trim();
    if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html') || trimmed.toLowerCase().includes('<html')) {
      const cleaned = cleanHtmlForAI(text);
      return { isValidRss: false, isScrapeableHtml: cleaned.length > 500 };
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
    } catch (e) {
      return { isValidRss: false, isScrapeableHtml: text.length > 500, error: "La risposta non sembra un feed RSS valido." };
    }
  } catch (err: any) {
    return { isValidRss: false, isScrapeableHtml: false, error: err.message || "Errore sconosciuto durante il test." };
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

export async function fetchAllFeeds() {
  const feeds = await db.select().from(rssFeeds);
  const userInterests = await db.select().from(interests);
  
  const allExisting = await db.select({ guid: articles.guid, title: articles.title, link: articles.link }).from(articles);
  const existingGuids = new Set(allExisting.map(a => a.guid));
  const existingTitles = new Set(allExisting.map(a => a.title ? a.title.trim().toLowerCase().replace(/[^\w\s]/gi, '') : ''));
  const existingLinks = new Set(allExisting.map(a => (a.link || '').split('?')[0].split('#')[0].trim().toLowerCase()).filter(Boolean));
  let newArticlesInserted = 0;

  for (const feed of feeds) {
    console.log(`Processing feed: ${feed.name} (${feed.url})`);
    try {
      let items: any[] = [];
      const parsedFeed = await fetchFeedWithFallback(feed.url, feed.name);
      
      if (parsedFeed) {
        items = (parsedFeed.items || []).slice(0, 50);
        console.log(`Found ${items.length} items for ${feed.name} via RSS`);
      } else {
        // AI Fallback: try to scrape the page directly
        // We only do this if it's not a known problematic site that times out consistently
        const problematicSites = ['gazzettadilucca.it', 'loschermo.it', 'toscanagol.it'];
        const isVeryProblematic = problematicSites.some(site => feed.url.includes(site));
        
        if (isVeryProblematic) {
          console.log(`RSS failed for ${feed.name}. Skipping direct scraper fallback as site is currently unreachable.`);
          continue; 
        }

        console.log(`RSS failed for ${feed.name}, trying AI Scraper fallback...`);
        try {
          // Robust fetch for AI scraping using node fetch with a system curl fallback
            const fetchWithFallback = async (url: string): Promise<string> => {
            const protocols = [url];
            if (url.startsWith('https')) {
              protocols.push(url.replace('https://', 'http://'));
            }
            
            let lastError = null;

            for (const targetUrl of protocols) {
              let responseText = "";
              let fetchSuccess = false;

              try {
                // Wait briefly before retrying
                if (targetUrl !== protocols[0]) {
                  await new Promise(resolve => setTimeout(resolve, 800));
                }

                const response = await fetch(targetUrl, { 
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Cache-Control": "no-cache"
                  }
                });

                if (response.ok) {
                  responseText = await response.text();
                  if (responseText.length > 500) {
                    fetchSuccess = true;
                  }
                } else {
                  console.warn(`Node fetch for ${targetUrl} returned status ${response.status}`);
                }
              } catch (e: any) {
                lastError = e;
                console.warn(`Node fetch failed for ${targetUrl}: ${e.message}`);
              }

              // If node fetch failed or returned bad status, try system curl
              if (!fetchSuccess) {
                try {
                  const { execSync } = await import('child_process');
                  const problematicSites = ['gazzettadilucca.it', 'loschermo.it', 'toscanagol.it'];
                  const isVeryProblematic = problematicSites.some(site => targetUrl.includes(site));
                  
                  // If it's a known blocker and we are not using a proxy, it will likely timeout
                  // We still try but with a shorter timeout and silent error
                  console.log(`Attempting system curl for ${targetUrl} (insecure mode)...`);
                  const timeout = isVeryProblematic ? 10 : 20;
                  const cmd = `curl -k -L -s -m ${timeout} -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/127.0.0.0 Safari/537.36" "${targetUrl}"`;
                  
                  try {
                    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 2 });
                    if (output && output.length > 500) {
                      console.log(`System curl success for ${targetUrl} (${output.length} bytes)`);
                      return output;
                    }
                  } catch (e) {
                    // Silent catch for the execSync itself
                    console.warn(`Curl execution failed for ${targetUrl} (likely timeout or block)`);
                  }
                } catch (curlErr: any) {
                  lastError = curlErr;
                }
              } else {
                return responseText;
              }
            }
            throw lastError || new Error("All fetch methods failed");
          };

          const html = await fetchWithFallback(feed.url);
          console.log(`Fetched ${html.length} bytes of HTML for ${feed.name}`);
          const cleanedHtml = cleanHtmlForAI(html);
          console.log(`Cleaned HTML for AI: ${cleanedHtml.length} bytes`);
          
          const aiArticles = await scrapeArticlesWithAI(feed.url, cleanedHtml, feed.name);
          if (aiArticles && aiArticles.length > 0) {
            items = aiArticles;
            console.log(`Successfully extracted ${items.length} items for ${feed.name} via AI Scraper`);
          } else {
            console.log(`AI Scraper returned 0 articles for ${feed.name}`);
          }
        } catch (scrapeErr: any) {
          console.warn(`AI Scraper failed for ${feed.name}:`, scrapeErr.message || "Unknown error");
        }
      }

      if (items.length === 0) {
        console.log(`No news found for feed: ${feed.name}`);
        continue;
      }

      const feedName = feed.name || (parsedFeed ? (parsedFeed.title || "Unknown Source") : "Unknown Source");
      
      for (const item of items) {
        const guid = item.guid || item.id || item.link;
        if (!guid) continue;
        
        const title = item.title || "No Title";
        const link = item.link || "";
        const normTitle = title.trim().toLowerCase().replace(/[^\w\s]/gi, '');
        const normLink = link.split('?')[0].split('#')[0].trim().toLowerCase();

        // Skip if already in DB (by GUID, title, or normalized link)
        if (existingGuids.has(guid) || (normTitle && existingTitles.has(normTitle)) || (normLink && existingLinks.has(normLink))) {
          continue;
        }
        
        const rawContent = item.contentEncoded || item['content:encoded'] || item.content || item.contentSnippet || "";
        const content = stripHtml(rawContent).trim();
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
        const imageUrl = extractImageUrl(item);
        
        const defaultTags = extractDefaultTags(title, content, feedName);
        const relevance = calculateFastRelevance(title, content, defaultTags, userInterests);
        
        await db.insert(articles).values({
          guid,
          title,
          link,
          content,
          pubDate,
          source: feedName,
          imageUrl,
          aiSummary: null,
          aiTags: defaultTags,
          aiRelevance: relevance,
          isNotified: false,
        }).onConflictDoNothing(); // Extra safety
        
        existingGuids.add(guid);
        if (normTitle) existingTitles.add(normTitle);
        if (normLink) existingLinks.add(normLink);
        newArticlesInserted++;
      }
    } catch (err: any) {
      console.warn(`Warning processing feed ${feed.url}:`, err.message || "Unknown error");
    }
  }

  // After fetching new feeds, trigger push notification check for high relevance articles
  if (newArticlesInserted > 0) {
    try {
      const { notifyNewHighRelevanceArticles } = await import("./pushNotifications");
      await notifyNewHighRelevanceArticles();
    } catch (e: any) {
      console.warn("Could not send background high relevance notifications:", e.message || e);
    }
  }
}

export async function seedInitialData() {
  // Ensure tables exist
  try {
    await db.run(sql`PRAGMA journal_mode = WAL;`);
    await db.run(sql`PRAGMA synchronous = NORMAL;`);
    await db.run(sql`PRAGMA busy_timeout = 5000;`);

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

    // Create index on source for faster filtering
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_articles_pub_date ON articles(pub_date);`);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS interests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        keyword TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL DEFAULT 1.0
      );
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS user_behavior (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER,
        action TEXT NOT NULL,
        time_spent INTEGER DEFAULT 0,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        is_manual INTEGER DEFAULT 0
      );
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.run(sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

  } catch (err: any) {
    console.error("Error creating initial tables:", err.message || err);
  }

  // Ensure is_saved, is_notified and saved_at columns exist if table was created previously without them
  try {
    await db.run(sql`ALTER TABLE articles ADD COLUMN is_saved INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await db.run(sql`ALTER TABLE articles ADD COLUMN is_notified INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await db.run(sql`ALTER TABLE articles ADD COLUMN saved_at TEXT`);
  } catch (e) {}
  try {
    await db.run(sql`ALTER TABLE rss_feeds ADD COLUMN shown_count INTEGER DEFAULT 0`);
  } catch (e) {}

  // Check if we need to seed feeds
  try {
    const existingFeeds = await db.select().from(rssFeeds);
    if (existingFeeds.length === 0) {
      await db.insert(rssFeeds).values([
        { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", name: "BBC Technology" },
        { url: "https://www.theverge.com/rss/index.xml", name: "The Verge" },
        { url: "https://news.google.com/rss/search?q=Toscana+Cecina&hl=it&gl=IT&ceid=IT:it", name: "Google News Toscana/Cecina" }
      ]);
    } else {
      // Clean up any trailing slash on ilpost feed in existing DB records
      for (const feed of existingFeeds) {
        if (feed.url === "https://www.ilpost.it/feed/") {
          await db.update(rssFeeds)
            .set({ url: "https://www.ilpost.it/feed" })
            .where(eq(rssFeeds.id, feed.id));
        }
      }
    }
  } catch (err: any) {
    console.error("Error seeding initial feeds:", err.message || err);
  }

  // Populate default tags for any articles without tags
  try {
    const untaggedArticles = await db.select().from(articles);
    for (const article of untaggedArticles) {
      if (!article.aiTags || article.aiTags.length === 0) {
        const defaultTags = extractDefaultTags(article.title, article.content || "", article.source || "");
        await db.update(articles)
          .set({ aiTags: defaultTags })
          .where(eq(articles.id, article.id));
      }
    }
  } catch (err: any) {
    console.error("Error updating untagged articles:", err.message || err);
  }
}
