import { db } from "../db";
import { articles, interests, rssFeeds } from "../db/schema";
import { buildFeedProcessContext, processSingleFeed } from "./rssArticleUtils";
import { seedRssData } from "./rssDatabaseUtils";
import { testFeedUrl, fetchFeedWithFallback } from "./rssFeedUtils";
import { ensureScraperConfigForFeed } from "./rssScraper";
import { getErrorMessage, normalizeLink } from "./rssShared";

export { ensureScraperConfigForFeed, fetchFeedWithFallback, normalizeLink, testFeedUrl };

async function notifyNewArticlesIfNeeded(newArticlesInserted: number) {
  if (newArticlesInserted <= 0) {
    return;
  }

  try {
    const { notifyNewHighRelevanceArticles } = await import("./pushNotifications");
    await notifyNewHighRelevanceArticles();
  } catch (error: unknown) {
    console.warn("Could not send background high relevance notifications:", getErrorMessage(error));
  }
}

export async function fetchAllFeeds(onlyFeedIds?: number[]) {
  const allFeeds = await db.select().from(rssFeeds);
  const feeds = onlyFeedIds && onlyFeedIds.length > 0
    ? allFeeds.filter((feed) => onlyFeedIds.includes(feed.id))
    : allFeeds;
  const userInterests = await db.select().from(interests);
  const existingArticles = await db.select({ guid: articles.guid, title: articles.title, link: articles.link }).from(articles);
  const context = buildFeedProcessContext(userInterests, existingArticles);
  let newArticlesInserted = 0;

  for (const feed of feeds) {
    try {
      newArticlesInserted += await processSingleFeed(feed, context);
    } catch (error: unknown) {
      console.warn(`Warning processing feed ${feed.url}:`, getErrorMessage(error) || "Unknown error");
    }
  }

  await notifyNewArticlesIfNeeded(newArticlesInserted);
}

export async function seedInitialData() {
  await seedRssData();
}
