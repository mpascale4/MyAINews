import { Router } from "express";
import { subDays } from "date-fns";
import { and, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import { articles, interests, rssFeeds, userBehavior } from "../db/schema";
import { processArticleWithAI } from "../lib/gemini";
import { getErrorMessage } from "../lib/errorUtils";
import { normalizeLink } from "../lib/rss";

const router = Router();
type ArticleRow = typeof articles.$inferSelect;

function createArticleConditions() {
  return [eq(articles.isHidden, false)];
}

async function getExcludedSources() {
  const negativeInterests = await db.select().from(interests).where(eq(interests.type, "negative"));
  return new Set(negativeInterests.map((interest) => interest.keyword.toLowerCase().trim()));
}

function applySavedReadFilters(
  conditions: ReturnType<typeof createArticleConditions>,
  filter: string,
) {
  if (filter === "Unread") conditions.push(eq(articles.isRead, false));
  if (filter === "Read") conditions.push(eq(articles.isRead, true));

  if (filter === "Saved" || filter === "Read Later" || filter === "Leggi dopo") {
    conditions.push(eq(articles.isSaved, true));
  } else {
    conditions.push(eq(articles.isSaved, false));
  }
}

function applyDateRangeFilters(
  conditions: ReturnType<typeof createArticleConditions>,
  filter: string,
) {
  if (filter === "Today") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    conditions.push(gte(articles.pubDate, today.toISOString()));
  }

  if (filter === "Last 7 days") {
    const lastWeek = subDays(new Date(), 7);
    conditions.push(gte(articles.pubDate, lastWeek.toISOString()));
  }
}

function applyArticleFilterConditions(
  conditions: ReturnType<typeof createArticleConditions>,
  filter: string,
  tag?: string,
) {
  if (tag) {
    conditions.push(like(articles.aiTags, `%${tag}%`));
  }

  applySavedReadFilters(conditions, filter);

  if (filter === "AI") conditions.push(gte(articles.aiRelevance, 75));
  if (filter === "Local News") {
    conditions.push(or(
      like(articles.title, "%Cecina%"),
      like(articles.title, "%Toscana%"),
      like(articles.title, "%Livorno%"),
    ));
  }

  applyDateRangeFilters(conditions, filter);
}

function dedupeArticles(results: ArticleRow[]) {
  const seenLinks = new Set<string>();
  const uniqueResults: typeof results = [];

  for (const article of results) {
    const normLink = article.link ? normalizeLink(article.link) : "";
    if (normLink && seenLinks.has(normLink)) continue;
    if (normLink) seenLinks.add(normLink);
    uniqueResults.push(article);
  }

  return uniqueResults;
}

function trackSourceViews(results: ArticleRow[]) {
  const sourcesToUpdate = Array.from(new Set(results.map((article) => article.source).filter(Boolean)));
  if (sourcesToUpdate.length === 0) return;

  setImmediate(async () => {
    try {
      for (const src of sourcesToUpdate) {
        await db.update(rssFeeds)
          .set({ shownCount: sql`${rssFeeds.shownCount} + 1` })
          .where(eq(rssFeeds.name, src as string));
      }
    } catch (error) {
      console.warn("Background source view tracking error:", error);
    }
  });
}

router.get("/api/articles", async (req, res) => {
  try {
    const filter = req.query.filter as string || "All";
    const sort = req.query.sort as string || "Date";
    const tag = req.query.tag as string;
    const source = req.query.source as string;

    let query = db.select().from(articles).$dynamic();
    const conditions = createArticleConditions();
    const excludedSources = await getExcludedSources();

    if (source) {
      conditions.push(eq(articles.source, source));
      conditions.push(eq(articles.isSaved, false));
    } else {
      applyArticleFilterConditions(conditions, filter, tag);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (sort === "AI Relevance" && !source) {
      query = query.orderBy(desc(articles.aiRelevance), desc(articles.pubDate));
    } else {
      query = query.orderBy(desc(articles.pubDate));
    }

    let results = await query.orderBy(desc(articles.pubDate)).limit(200);

    if (!source && excludedSources.size > 0) {
      results = results.filter((article) => !excludedSources.has((article.source || "").toLowerCase().trim()));
    }

    results = dedupeArticles(results);
    trackSourceViews(results);

    res.json(results);
  } catch (err: unknown) {
    console.error("Error in /api/articles:", getErrorMessage(err));
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(articles)
      .set({ isRead: true, readAt: new Date().toISOString() })
      .where(eq(articles.id, id));

    await db.insert(userBehavior).values({
      articleId: id,
      action: "opened",
      timeSpent: req.body.timeSpent || 0,
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/unread", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(articles)
      .set({ isRead: false, readAt: null })
      .where(eq(articles.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/toggle-save", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const article = await db.select().from(articles).where(eq(articles.id, id)).get();
    if (!article) return res.status(404).json({ error: "Article not found" });

    const newSavedState = !article.isSaved;
    await db.update(articles)
      .set({
        isSaved: newSavedState,
        savedAt: newSavedState ? new Date().toISOString() : null,
      })
      .where(eq(articles.id, id));

    res.json({ success: true, isSaved: newSavedState });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/save", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(articles)
      .set({ isSaved: true, savedAt: new Date().toISOString() })
      .where(eq(articles.id, id));

    res.json({ success: true, isSaved: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/unsave", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(articles)
      .set({ isSaved: false, savedAt: null })
      .where(eq(articles.id, id));

    res.json({ success: true, isSaved: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/regenerate-summary", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const article = await db.select().from(articles).where(eq(articles.id, id)).get();
    if (!article) return res.status(404).json({ error: "Article not found" });

    const { summary, relevance, tags } = await processArticleWithAI(article.title, article.content || "");

    if (summary.includes("Summary generation failed") || summary.includes("JSON Parse failed")) {
      return res.status(500).json({ error: summary });
    }

    await db.update(articles)
      .set({ aiSummary: summary, aiTags: tags, aiRelevance: relevance })
      .where(eq(articles.id, id));

    res.json({ success: true, aiSummary: summary, aiTags: tags, aiRelevance: relevance });
  } catch (err: unknown) {
    console.warn("Error regenerating summary:", getErrorMessage(err) || "Unknown error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/hide", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(articles)
      .set({ isHidden: true, hiddenAt: new Date().toISOString() })
      .where(eq(articles.id, id));

    await db.insert(userBehavior).values({
      articleId: id,
      action: "ignored",
      timeSpent: 0,
    });

    const hiddenArticles = await db.select({ id: articles.id, hiddenAt: articles.hiddenAt })
      .from(articles)
      .where(eq(articles.isHidden, true));
    if (hiddenArticles.length > 500) {
      const sorted = hiddenArticles.sort((a, b) => (a.hiddenAt || "").localeCompare(b.hiddenAt || ""));
      const toDelete = sorted.slice(0, hiddenArticles.length - 500).map((article) => article.id);
      for (const delId of toDelete) {
        await db.delete(articles).where(eq(articles.id, delId));
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/articles/:id/unhide", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(articles)
      .set({ isHidden: false, hiddenAt: null })
      .where(eq(articles.id, id));

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/api/articles/trash", async (_req, res) => {
  try {
    const hiddenArticles = await db.select().from(articles)
      .where(eq(articles.isHidden, true))
      .orderBy(desc(articles.hiddenAt));
    res.json(hiddenArticles.slice(0, 500));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
