import { Router } from "express";
import type { Feed } from "../types";
import { generateArticleSummary, searchFeedsByKeyword } from "../lib/gemini";
import { fetchBulkFeedArticles, findAlternativeFeed, verifyAndFixFeed } from "../lib/rssFeedUtils";

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
  const candidates = await searchFeedsByKeyword(keyword);

  const verified = await Promise.all(
    candidates.map(async (candidate) => {
      const { feed, verified: isVerified } = await verifyAndFixFeed(candidate);
      return isVerified ? { ...candidate, url: feed.url } : null;
    }),
  );

  res.json({ feeds: verified.filter((feed): feed is NonNullable<typeof feed> => feed !== null) });
});

router.post("/api/feeds/find-alternative", async (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name : "";
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  if (!url.trim()) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  const { feed, verified } = await findAlternativeFeed({ name: name || url, url });
  if (!verified) {
    res.json({ found: false });
    return;
  }

  res.json({ found: true, feed });
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
