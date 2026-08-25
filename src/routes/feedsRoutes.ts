import { Router } from "express";
import { eq, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { articles, interests, rssFeeds } from "../db/schema";
import { generateFeedsWithAI } from "../lib/gemini";
import { getErrorMessage } from "../lib/errorUtils";
import { ensureScraperConfigForFeed, fetchAllFeeds, testFeedUrl } from "../lib/rss";
import type { FeedInput } from "./types";

const router = Router();
type FeedRow = typeof rssFeeds.$inferSelect;

function normalizeFeedUrl(url: string) {
  return url.trim().replace(/\/feed\/$/, "/feed");
}

function normalizeComparableUrl(url: string) {
  return url.toLowerCase().replace(/\/+$/, "");
}

function buildCleanedFeeds(feeds: FeedInput[]) {
  return feeds
    .map((feed) => ({
      url: feed.url ? normalizeFeedUrl(feed.url) : "",
      name: feed.name ? feed.name.trim() : "",
      isManual: feed.isManual !== undefined ? Boolean(feed.isManual) : false,
      addedVia: feed.addedVia ? String(feed.addedVia).trim().slice(0, 200) : null,
    }))
    .filter((feed: { url: string }) => feed.url);
}

async function backfillAddedVia(cleanedFeeds: ReturnType<typeof buildCleanedFeeds>) {
  const feedsWithVia = cleanedFeeds.filter((feed) => feed.addedVia);
  if (feedsWithVia.length === 0) return;

  const existing = await db.select().from(rssFeeds).where(
    or(...feedsWithVia.map((feed) => eq(rssFeeds.url, feed.url))),
  );

  for (const feed of existing) {
    if (!feed.addedVia) {
      const match = feedsWithVia.find((candidate) => candidate.url === feed.url);
      if (match) {
        await db.update(rssFeeds).set({ addedVia: match.addedVia }).where(eq(rssFeeds.id, feed.id));
      }
    }
  }
}

async function resetAutomaticFeeds() {
  const manualFeeds = await db.select().from(rssFeeds).where(eq(rssFeeds.isManual, true));
  const autoFeeds = await db.select().from(rssFeeds).where(or(eq(rssFeeds.isManual, false), isNull(rssFeeds.isManual)));
  const resetCount = autoFeeds.length;

  if (resetCount > 0) {
    await db.delete(rssFeeds).where(or(eq(rssFeeds.isManual, false), isNull(rssFeeds.isManual)));
  }

  return { manualFeeds, resetCount };
}

function buildGeneratedFeedResults(
  suggestions: Awaited<ReturnType<typeof generateFeedsWithAI>>,
  manualFeeds: FeedRow[],
) {
  const manualUrls = new Set(manualFeeds.map((feed) => normalizeComparableUrl(feed.url.trim())));
  const newFeedsToInsert: { url: string; name: string; isManual: boolean; addedVia: string }[] = [];

  const detailedResults = suggestions.map((suggestion) => {
    const cleanUrl = normalizeFeedUrl(suggestion.url);
    const normalized = normalizeComparableUrl(cleanUrl);
    const isAlreadyManual = manualUrls.has(normalized);
    const isNew = !isAlreadyManual;
    if (isNew && !newFeedsToInsert.some((feed) => normalizeComparableUrl(feed.url) === normalized)) {
      newFeedsToInsert.push({
        url: cleanUrl,
        name: suggestion.name,
        isManual: false,
        addedVia: "AI in base ai tuoi interessi",
      });
    }
    return {
      ...suggestion,
      url: cleanUrl,
      isNew,
    };
  });

  return { detailedResults, newFeedsToInsert };
}

router.get("/api/feeds", async (_req, res) => {
  try {
    const feeds = await db.select().from(rssFeeds);
    res.json(feeds || []);
  } catch (err) {
    console.error("Error fetching feeds:", err);
    res.status(500).json([]);
  }
});

router.get("/api/feeds/stats", async (_req, res) => {
  try {
    const stats = await db.select({
      name: rssFeeds.name,
      shownCount: rssFeeds.shownCount,
    }).from(rssFeeds);
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.post("/api/feeds/test", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });
    const result = await testFeedUrl(url);
    res.json(result);
  } catch (err: unknown) {
    console.error("Error testing feed:", err);
    res.status(500).json({ error: getErrorMessage(err) || "Internal Server Error" });
  }
});

router.post("/api/feeds", async (req, res) => {
  try {
    const url = req.body.url ? normalizeFeedUrl(req.body.url) : "";
    const name = req.body.name ? req.body.name.trim() : "";
    const isManual = req.body.isManual !== undefined ? Boolean(req.body.isManual) : true;
    const addedVia = req.body.addedVia ? String(req.body.addedVia).trim().slice(0, 200) : null;
    if (!url) return res.status(400).json({ error: "URL is required" });
    const inserted = await db.insert(rssFeeds).values({ url, name, isManual, addedVia }).returning({ id: rssFeeds.id });
    const newFeedId = inserted[0]?.id;
    res.json({ success: true, id: newFeedId });

    if (newFeedId) {
      ensureScraperConfigForFeed(newFeedId, url, name || url).catch((error: unknown) => {
        console.warn("Background ad-hoc transformer setup failed:", getErrorMessage(error));
      });
    }
  } catch (err: unknown) {
    console.warn("Error adding feed:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/api/feeds/:id/manual", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const isManual = Boolean(req.body.isManual);
    await db.update(rssFeeds).set({ isManual }).where(eq(rssFeeds.id, id));
    res.json({ success: true });
  } catch (err: unknown) {
    console.warn("Error toggling feed manual flag:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/api/feeds/:id/url", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const url = req.body.url ? String(req.body.url).trim() : "";
    if (!url) return res.status(400).json({ error: "URL is required" });

    const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.id, id));
    const feed = existing[0];
    if (!feed) return res.status(404).json({ error: "Feed not found" });

    await db.update(rssFeeds).set({ url, scraperConfig: null, scraperFailCount: 0 }).where(eq(rssFeeds.id, id));
    res.json({ success: true });

    ensureScraperConfigForFeed(id, url, feed.name || url).catch((error: unknown) => {
      console.warn("Background ad-hoc transformer setup failed after URL fix:", getErrorMessage(error));
    });
  } catch (err: unknown) {
    console.warn("Error fixing feed URL:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/feeds/:id/create-transformer", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.id, id));
    const feed = existing[0];
    if (!feed) return res.status(404).json({ error: "Feed not found" });

    const result = await ensureScraperConfigForFeed(id, feed.url, feed.name || feed.url);
    res.json(result);
  } catch (err: unknown) {
    console.warn("Error creating transformer:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/feeds/bulk", async (req, res) => {
  try {
    if (req.body.feeds && req.body.feeds.length > 0) {
      const cleanedFeeds = buildCleanedFeeds(req.body.feeds as FeedInput[]);
      if (cleanedFeeds.length > 0) {
        await db.insert(rssFeeds).values(cleanedFeeds).onConflictDoNothing();
        await backfillAddedVia(cleanedFeeds);
      }
    }
    res.json({ success: true });
  } catch (err: unknown) {
    console.warn("Error adding bulk feeds:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/feeds/generate-ai", async (_req, res) => {
  try {
    const userInterests = await db.select().from(interests);
    const { manualFeeds, resetCount } = await resetAutomaticFeeds();
    const suggestions = await generateFeedsWithAI(userInterests, manualFeeds);
    const { detailedResults, newFeedsToInsert } = buildGeneratedFeedResults(suggestions, manualFeeds);

    if (newFeedsToInsert.length > 0) {
      await db.insert(rssFeeds).values(newFeedsToInsert).onConflictDoNothing();
      fetchAllFeeds().catch((err) => console.warn("Background fetch error after AI generation:", err.message));
    }

    const currentFeeds = await db.select().from(rssFeeds);

    res.json({
      success: true,
      newCount: newFeedsToInsert.length,
      resetCount,
      manualCount: manualFeeds.length,
      suggestedFeeds: detailedResults,
      feeds: currentFeeds,
    });
  } catch (err: unknown) {
    console.warn("Error in generate-ai feeds:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/api/feeds/:id", async (req, res) => {
  try {
    const feedId = parseInt(req.params.id);
    const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, feedId));
    await db.delete(rssFeeds).where(eq(rssFeeds.id, feedId));
    if (feed) {
      await db.delete(articles).where(eq(articles.source, feed.name));
    }
    res.json({ success: true });
  } catch (err: unknown) {
    console.error("Error deleting feed:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
