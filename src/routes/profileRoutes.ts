import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { interests, rssFeeds } from "../db/schema";
import { runProfileInterview } from "../lib/gemini";
import { getErrorMessage } from "../lib/errorUtils";
import type { SyncFeedInput, SyncInterestInput } from "./types";

const router = Router();

async function insertSyncedInterests(newInterests: SyncInterestInput[]) {
  for (const item of newInterests) {
    const keyword = String(item.keyword || "").trim();
    const type = item.type === "negative" ? "negative" : "positive";
    const weight = typeof item.weight === "number" ? item.weight : 1.0;
    if (keyword) {
      const existing = await db.select().from(interests).where(eq(interests.keyword, keyword)).get();
      if (!existing) {
        await db.insert(interests).values({ keyword, type, weight });
      }
    }
  }
}

async function insertSyncedFeeds(newFeeds: SyncFeedInput[]) {
  for (const feed of newFeeds) {
    const url = String(feed.url || "").trim();
    const name = String(feed.name || "").trim();
    if (url && name) {
      const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.url, url)).get();
      if (!existing) {
        await db.insert(rssFeeds).values({ url, name, isManual: true, addedVia: "Intervista iniziale" });
      }
    }
  }
}

router.post("/api/profile/interview", async (req, res) => {
  try {
    const { messages } = req.body;
    const result = await runProfileInterview(messages || []);
    res.json(result);
  } catch (e: unknown) {
    console.error("Error in profile interview:", e);
    res.status(500).json({ error: getErrorMessage(e) || "Internal Server Error" });
  }
});

router.post("/api/profile/interests/sync", async (req, res) => {
  try {
    const { newInterests, newFeeds } = req.body;
    if (Array.isArray(newInterests)) {
      await insertSyncedInterests(newInterests as SyncInterestInput[]);
    }

    if (Array.isArray(newFeeds)) {
      await insertSyncedFeeds(newFeeds as SyncFeedInput[]);
    }

    const updatedInterests = await db.select().from(interests);
    const updatedFeeds = await db.select().from(rssFeeds);
    res.json({ success: true, interests: updatedInterests, feeds: updatedFeeds });
  } catch (e: unknown) {
    console.error("Error syncing interview interests and feeds:", e);
    res.status(500).json({ error: getErrorMessage(e) || "Internal Server Error" });
  }
});

export default router;
