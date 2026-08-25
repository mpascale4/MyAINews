import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { articles, rssFeeds } from "../db/schema";
import { fetchAllFeeds } from "../lib/rss";

const router = Router();

type ArticleRow = typeof articles.$inferSelect;

function computeSourceStats(visibleArticles: ArticleRow[], currentFeedNames: Set<string>) {
  const sourceCount: Record<string, number> = {};
  visibleArticles.forEach((article) => {
    if (article.source) {
      sourceCount[article.source] = (sourceCount[article.source] || 0) + (article.isRead ? 10 : 1);
    }
  });

  const sortedSources = Object.entries(sourceCount)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, active: currentFeedNames.has(name) }));

  return {
    topSources: sortedSources.filter((source) => source.active).slice(0, 5),
    removedSources: sortedSources.filter((source) => !source.active).slice(0, 5),
  };
}

function getWeekTargetArticles(visibleArticles: ArticleRow[]) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weekArticles = visibleArticles.filter((article) => {
    if (!article.pubDate) return true;
    const date = new Date(article.pubDate);
    return isNaN(date.getTime()) || date >= sevenDaysAgo;
  });

  return weekArticles.length >= 3 ? weekArticles : visibleArticles;
}

function computeTopicStats(target: ArticleRow[]) {
  const stats: Record<string, { count: number; relevanceSum: number }> = {};
  target.forEach((article) => {
    if (Array.isArray(article.aiTags) && article.aiTags.length > 0) {
      article.aiTags.forEach((rawTag) => {
        if (!rawTag || typeof rawTag !== "string") return;
        const tag = rawTag.trim();
        if (tag.length < 2) return;
        const label = tag.charAt(0).toUpperCase() + tag.slice(1);
        if (!stats[label]) {
          stats[label] = { count: 0, relevanceSum: 0 };
        }
        stats[label].count += 1;
        stats[label].relevanceSum += (article.aiRelevance || 50);
      });
    }
  });

  return Object.entries(stats)
    .map(([topic, stat]) => ({
      topic,
      count: stat.count,
      avgRelevance: Math.round(stat.relevanceSum / stat.count),
    }))
    .sort((a, b) => b.count - a.count || b.avgRelevance - a.avgRelevance)
    .slice(0, 8);
}

router.get("/api/dashboard", async (_req, res) => {
  try {
    const allArticles = await db.select().from(articles);
    const visibleArticles = allArticles.filter((article) => !article.isHidden);
    const readCount = visibleArticles.filter((article) => article.isRead).length;
    const unreadCount = visibleArticles.filter((article) => !article.isRead).length;

    const currentFeeds = await db.select().from(rssFeeds);
    const currentFeedNames = new Set(currentFeeds.map((feed) => feed.name));

    const { topSources, removedSources } = computeSourceStats(visibleArticles, currentFeedNames);
    const targetArticles = getWeekTargetArticles(visibleArticles);

    const activeTargetArticles = targetArticles.filter((article) => !article.source || currentFeedNames.has(article.source));
    const removedTargetArticles = targetArticles.filter((article) => article.source && !currentFeedNames.has(article.source));

    const weeklyTopics = computeTopicStats(activeTargetArticles);
    const removedWeeklyTopics = computeTopicStats(removedTargetArticles);

    res.json({
      readCount,
      unreadCount,
      topSources,
      removedSources,
      weeklyTopics,
      removedWeeklyTopics,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/fetch", async (req, res) => {
  try {
    const feedName = req.body?.feedName ? String(req.body.feedName).trim() : null;
    if (feedName) {
      const matchingFeeds = await db.select().from(rssFeeds).where(eq(rssFeeds.name, feedName));
      await fetchAllFeeds(matchingFeeds.map((feed) => feed.id));
    } else {
      await fetchAllFeeds();
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
