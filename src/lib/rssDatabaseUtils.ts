import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { articles, rssFeeds } from "../db/schema";
import { extractDefaultTags } from "./tagExtractor";
import { getErrorMessage } from "./rssShared";

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
  for (const feed of existingFeeds) {
    if (feed.url === "https://www.ilpost.it/feed/") {
      await db.update(rssFeeds).set({ url: "https://www.ilpost.it/feed" }).where(eq(rssFeeds.id, feed.id));
    }
  }
}

async function populateMissingTags() {
  const existingArticles = await db.select().from(articles);
  for (const article of existingArticles) {
    if (article.aiTags && article.aiTags.length > 0) {
      continue;
    }

    const defaultTags = extractDefaultTags(article.title, article.content || "", article.source || "");
    await db.update(articles).set({ aiTags: defaultTags }).where(eq(articles.id, article.id));
  }
}

export async function seedRssData() {
  try {
    await runArticlesTablePragmas();
    await createBaseTables();
  } catch (error: unknown) {
    console.error("Error creating initial tables:", getErrorMessage(error));
  }

  await ensureLegacyColumns();
  try {
    await normalizeExistingFeedUrls();
  } catch (error: unknown) {
    console.error("Error seeding initial feeds:", getErrorMessage(error));
  }

  try {
    await populateMissingTags();
  } catch (error: unknown) {
    console.error("Error updating untagged articles:", getErrorMessage(error));
  }
}
