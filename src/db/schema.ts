import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { ScraperConfig } from "../lib/scraper";

export const articles = sqliteTable("articles", {
  id: integer("id").primaryKey(),
  guid: text("guid").notNull().unique(),
  title: text("title").notNull(),
  link: text("link").notNull(),
  content: text("content"),
  pubDate: text("pub_date"),
  source: text("source"),
  imageUrl: text("image_url"),
  aiSummary: text("ai_summary"),
  aiTags: text("ai_tags", { mode: 'json' }).$type<string[]>(),
  aiRelevance: real("ai_relevance").default(0),
  isRead: integer("is_read", { mode: 'boolean' }).default(false),
  isHidden: integer("is_hidden", { mode: 'boolean' }).default(false),
  isSaved: integer("is_saved", { mode: 'boolean' }).default(false),
  isNotified: integer("is_notified", { mode: 'boolean' }).default(false),
  savedAt: text("saved_at"),
  readAt: text("read_at"),
  hiddenAt: text("hidden_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const interests = sqliteTable("interests", {
  id: integer("id").primaryKey(),
  keyword: text("keyword").notNull(),
  type: text("type").notNull(), // 'positive' or 'negative'
  weight: real("weight").default(1.0),
});

export const userBehavior = sqliteTable("user_behavior", {
  id: integer("id").primaryKey(),
  articleId: integer("article_id").references(() => articles.id),
  action: text("action").notNull(), // 'opened', 'ignored'
  timeSpent: integer("time_spent").default(0), // in seconds
  timestamp: text("timestamp").default(sql`CURRENT_TIMESTAMP`),
});

export const rssFeeds = sqliteTable("rss_feeds", {
  id: integer("id").primaryKey(),
  url: text("url").notNull().unique(),
  name: text("name").notNull(),
  isManual: integer("is_manual", { mode: 'boolean' }).default(false),
  shownCount: integer("shown_count").default(0),
  // Ad-hoc HTML scraper config (CSS selectors) used as fallback when the RSS feed is empty/unavailable.
  // Generated once by AI and reused on subsequent fetches to avoid calling the AI on every cycle.
  scraperConfig: text("scraper_config", { mode: 'json' }).$type<ScraperConfig>(),
  scraperFailCount: integer("scraper_fail_count").default(0),
  // Short human-readable note on how/why this source was added (e.g. "Ricerca AI: Lucca").
  // Null for sources added before this field existed.
  addedVia: text("added_via"),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

