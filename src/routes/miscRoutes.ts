import { Router } from "express";
import { db } from "../db";
import { articles, interests, rssFeeds, userBehavior } from "../db/schema";
import { searchFeedsByKeyword } from "../lib/gemini";
import { getErrorMessage } from "../lib/errorUtils";
import { testFeedUrl } from "../lib/rss";

const router = Router();

router.post("/api/reset-all", async (_req, res) => {
  try {
    await db.delete(articles);
    await db.delete(rssFeeds);
    await db.delete(interests);
    await db.delete(userBehavior);
    res.json({ success: true });
  } catch (err: unknown) {
    console.error("Error resetting app data:", getErrorMessage(err));
    res.status(500).json({ error: getErrorMessage(err) || "Internal Server Error" });
  }
});

router.post("/api/feeds/ai-search", async (req, res) => {
  try {
    const { keyword } = req.body;
    const suggestions = await searchFeedsByKeyword(keyword || "");

    const validated = await Promise.all(
      suggestions.map(async (feed) => {
        try {
          const test = await testFeedUrl(feed.url);
          const hasContent = (test.isValidRss && (test.itemCount || 0) > 0) || test.isScrapeableHtml;
          return hasContent ? feed : null;
        } catch {
          return null;
        }
      }),
    );

    res.json({ feeds: validated.filter((feed): feed is NonNullable<typeof feed> => feed !== null) });
  } catch (e: unknown) {
    console.error("Error in AI feed search:", e);
    res.status(500).json({ error: getErrorMessage(e) || "Internal Server Error" });
  }
});

router.post("/api/reset", async (_req, res) => {
  console.log("Ricevuta richiesta di reset dati.");
  try {
    console.log("Inizio cancellazione tabelle...");
    await db.delete(userBehavior);
    console.log("Cancellato userBehavior");
    await db.delete(articles);
    console.log("Cancellato articles");
    await db.delete(rssFeeds);
    console.log("Cancellato rssFeeds");
    await db.delete(interests);
    console.log("Cancellato interests");

    console.log("Reset dati completato con successo.");
    res.json({ success: true });
  } catch (err) {
    console.error("Error resetting data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
