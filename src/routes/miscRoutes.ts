import { Router } from "express";
import type { Feed } from "../types";
import { generateArticleSummary, searchFeedsByKeyword } from "../lib/gemini";
import { fetchBulkFeedArticles } from "../lib/rssFeedUtils";

const router = Router();

router.post("/api/feeds/fetch-many", async (req, res) => {
  const feeds = Array.isArray(req.body?.feeds) ? (req.body.feeds as Feed[]) : [];
  if (feeds.length === 0) {
    res.json({ results: [] });
    return;
  }

  const results = await fetchBulkFeedArticles(feeds);
  res.json({ results });
});

router.post("/api/ai/feed-search", async (req, res) => {
  const keyword = typeof req.body?.keyword === "string" ? req.body.keyword : "";
  const feeds = await searchFeedsByKeyword(keyword);
  res.json({ feeds });
});

router.post("/api/ai/article-summary", async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title : "";
  const content = typeof req.body?.content === "string" ? req.body.content : "";
  if (!title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const summary = await generateArticleSummary(title, content);
  res.json({ summary });
});

export default router;
