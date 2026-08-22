import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db";
import { articles, rssFeeds, interests, userBehavior, appSettings } from "./src/db/schema";
import { seedInitialData, fetchAllFeeds, testFeedUrl, ensureScraperConfigForFeed } from "./src/lib/rss";
import { processArticleWithAI, generateFeedsWithAI, runProfileInterview, searchFeedsByKeyword } from "./src/lib/gemini";
import { 
  getVapidPublicKey, 
  registerPushSubscription, 
  unregisterPushSubscription, 
  sendTestPush, 
  sendPushToAll, 
  notifyNewHighRelevanceArticles 
} from "./src/lib/pushNotifications";
import { desc, eq, and, gte, like, or, isNull, sql } from "drizzle-orm";
import { parseISO, subDays } from "date-fns";
import * as dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Serve service worker with proper headers
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(path.join(process.cwd(), "public", "sw.js"));
  });

  // Initialize DB and fetch initial feeds (in background)
  try {
    await seedInitialData();
    console.log("Database seeded.");
    // Run fetch in background so server startup isn't blocked too long
    fetchAllFeeds()
      .then(() => console.log("Initial RSS fetch complete."))
      .catch(console.error);

    // Set background periodic polling every 5 minutes to fetch feeds and trigger push notifications
    setInterval(() => {
      console.log("Running background RSS sync & notification check...");
      fetchAllFeeds()
        .then(() => notifyNewHighRelevanceArticles())
        .catch(err => console.warn("Background feed fetch error:", err));
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error("Error during DB initialization:", err);
  }

  // --- API Routes ---

  // Get articles
  app.get("/api/articles", async (req, res) => {
    try {
      const filter = req.query.filter as string || "All";
      const sort = req.query.sort as string || "Date";
      const tag = req.query.tag as string;
      const source = req.query.source as string;
      
      let query = db.select().from(articles).$dynamic();
      
      const conditions = [eq(articles.isHidden, false)];

      if (source) {
        // Se una specifica sorgente è selezionata, mostra tutte le sue notizie senza alcun altro filtro (tag, read/unread, data, ecc.)
        conditions.push(eq(articles.source, source));
      } else {
        if (tag) {
          conditions.push(like(articles.aiTags, `%${tag}%`));
        }

        if (filter === "Unread") conditions.push(eq(articles.isRead, false));
        if (filter === "Read") conditions.push(eq(articles.isRead, true));
        if (filter === "Saved" || filter === "Read Later" || filter === "Leggi dopo") conditions.push(eq(articles.isSaved, true));
        if (filter === "AI") conditions.push(gte(articles.aiRelevance, 75)); // Arbitrary threshold
        if (filter === "Local News") {
           conditions.push(or(
             like(articles.title, "%Cecina%"),
             like(articles.title, "%Toscana%"),
             like(articles.title, "%Livorno%")
           ));
        }
        if (filter === "Today") {
          const today = new Date();
          today.setHours(0,0,0,0);
          conditions.push(gte(articles.pubDate, today.toISOString()));
        }
        if (filter === "Last 7 days") {
          const lastWeek = subDays(new Date(), 7);
          conditions.push(gte(articles.pubDate, lastWeek.toISOString()));
        }
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      if (sort === "AI Relevance" && !source) {
        query = query.orderBy(desc(articles.aiRelevance), desc(articles.pubDate));
      } else {
        query = query.orderBy(desc(articles.pubDate));
      }

      let results = await query.orderBy(desc(articles.pubDate)).limit(200); // Increased limit for better coverage

      // Deduplicate articles mainly by link, and be more careful with title deduplication
      const seenLinks = new Set<string>();
      const uniqueResults: typeof results = [];
      for (const article of results) {
        const normLink = article.link ? article.link.split('?')[0].split('#')[0].trim().toLowerCase() : '';
        if (normLink && seenLinks.has(normLink)) continue;
        if (normLink) seenLinks.add(normLink);
        uniqueResults.push(article);
      }
      results = uniqueResults;
      
      // Track source views (non-blocking)
      const sourcesToUpdate = Array.from(new Set(results.map(a => a.source).filter(Boolean)));
      if (sourcesToUpdate.length > 0) {
        setImmediate(async () => {
          try {
            for (const src of sourcesToUpdate) {
              await db.update(rssFeeds)
                .set({ shownCount: sql`${rssFeeds.shownCount} + 1` })
                .where(eq(rssFeeds.name, src as string));
            }
          } catch (e) {
            console.warn("Background source view tracking error:", e);
          }
        });
      }

      res.json(results);
    } catch (err: any) {
      console.error("Error in /api/articles:", err.message || err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Mark article as read
  app.post("/api/articles/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(articles)
        .set({ isRead: true, readAt: new Date().toISOString() })
        .where(eq(articles.id, id));
        
      // Record behavior
      await db.insert(userBehavior).values({
        articleId: id,
        action: "opened",
        timeSpent: req.body.timeSpent || 0
      });
        
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Mark article as unread
  app.post("/api/articles/:id/unread", async (req, res) => {
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

  // Toggle Save (Leggi dopo / Bookmark)
  app.post("/api/articles/:id/toggle-save", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await db.select().from(articles).where(eq(articles.id, id)).get();
      if (!article) return res.status(404).json({ error: "Article not found" });

      const newSavedState = !article.isSaved;
      await db.update(articles)
        .set({ 
          isSaved: newSavedState, 
          savedAt: newSavedState ? new Date().toISOString() : null 
        })
        .where(eq(articles.id, id));

      res.json({ success: true, isSaved: newSavedState });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Save article (Leggi dopo)
  app.post("/api/articles/:id/save", async (req, res) => {
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

  // Unsave article
  app.post("/api/articles/:id/unsave", async (req, res) => {
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

  // Regenerate Summary
  app.post("/api/articles/:id/regenerate-summary", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const article = await db.select().from(articles).where(eq(articles.id, id)).get();
      if (!article) return res.status(404).json({ error: "Article not found" });

      const userInterests = await db.select().from(interests);
      
      const { summary, relevance, tags } = await processArticleWithAI(article.title, article.content || "", userInterests);
      
      if (summary.includes("Summary generation failed") || summary.includes("JSON Parse failed")) {
        return res.status(500).json({ error: summary });
      }

      await db.update(articles)
        .set({ aiSummary: summary, aiTags: tags, aiRelevance: relevance })
        .where(eq(articles.id, id));
        
      res.json({ success: true, aiSummary: summary, aiTags: tags, aiRelevance: relevance });
    } catch (err: any) {
      console.warn("Error regenerating summary:", err.message || "Unknown error");
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Mark article as hidden
  app.post("/api/articles/:id/hide", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(articles)
        .set({ isHidden: true })
        .where(eq(articles.id, id));
        
      // Record behavior
      await db.insert(userBehavior).values({
        articleId: id,
        action: "ignored",
        timeSpent: 0
      });
        
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/articles/:id/unhide", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.update(articles)
        .set({ isHidden: false })
        .where(eq(articles.id, id));
        
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Dashboard Stats
  app.get("/api/dashboard", async (req, res) => {
    try {
      const allArticles = await db.select().from(articles);
      const visibleArticles = allArticles.filter(a => !a.isHidden);
      const readCount = visibleArticles.filter(a => a.isRead).length;
      const unreadCount = visibleArticles.filter(a => !a.isRead).length;
      
      const sourceCount: Record<string, number> = {};
      visibleArticles.forEach(a => {
        if (a.source) {
           sourceCount[a.source] = (sourceCount[a.source] || 0) + (a.isRead ? 10 : 1);
        }
      });
      
      const topSources = Object.entries(sourceCount)
         .sort((a, b) => b[1] - a[1])
         .slice(0, 5)
         .map(([name, count]) => ({ name, count }));

      // Calculate AI analyzed topics from the week
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const weekArticles = visibleArticles.filter(a => {
        if (!a.pubDate) return true;
        const d = new Date(a.pubDate);
        return isNaN(d.getTime()) || d >= sevenDaysAgo;
      });

      const targetArticles = weekArticles.length >= 3 ? weekArticles : visibleArticles;
      const topicStats: Record<string, { count: number; relevanceSum: number }> = {};

      targetArticles.forEach(a => {
        if (Array.isArray(a.aiTags) && a.aiTags.length > 0) {
          a.aiTags.forEach(rawTag => {
            if (!rawTag || typeof rawTag !== 'string') return;
            const tag = rawTag.trim();
            if (tag.length < 2) return;
            // Format nice label
            const label = tag.charAt(0).toUpperCase() + tag.slice(1);
            if (!topicStats[label]) {
              topicStats[label] = { count: 0, relevanceSum: 0 };
            }
            topicStats[label].count += 1;
            topicStats[label].relevanceSum += (a.aiRelevance || 50);
          });
        }
      });

      const weeklyTopics = Object.entries(topicStats)
        .map(([topic, stat]) => ({
          topic,
          count: stat.count,
          avgRelevance: Math.round(stat.relevanceSum / stat.count)
        }))
        .sort((a, b) => b.count - a.count || b.avgRelevance - a.avgRelevance)
        .slice(0, 8);

      res.json({
        readCount,
        unreadCount,
        topSources,
        weeklyTopics,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Trigger fetch
  app.post("/api/fetch", async (req, res) => {
    try {
      await fetchAllFeeds();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Get interests
  app.get("/api/interests", async (req, res) => {
    try {
      const resInterests = await db.select().from(interests);
      res.json(resInterests || []);
    } catch (err) {
      console.error("Error fetching interests:", err);
      res.status(500).json([]);
    }
  });
  
  // Add interest (updates or inserts cleanly)
  app.post("/api/interests", async (req, res) => {
    try {
      const { keyword, type, weight } = req.body;
      if (!keyword || !type) {
        return res.status(400).json({ error: "Keyword and type are required" });
      }
      const trimmed = String(keyword).trim();
      // Remove any existing entry with the same keyword to prevent duplication
      const existing = await db.select().from(interests);
      const duplicate = existing.find(i => i.keyword.toLowerCase() === trimmed.toLowerCase());
      if (duplicate) {
        await db.delete(interests).where(eq(interests.id, duplicate.id));
      }
      await db.insert(interests).values({
        keyword: trimmed,
        type,
        weight: weight !== undefined ? weight : 1.0
      });
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Add multiple interests
  app.post("/api/interests/bulk", async (req, res) => {
    try {
      if (req.body.interests && req.body.interests.length > 0) {
        await db.delete(interests); // Clear existing before saving new
        await db.insert(interests).values(req.body.interests);
      }
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Delete interest by ID
  app.delete("/api/interests/:id", async (req, res) => {
    try {
      await db.delete(interests).where(eq(interests.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Delete interest by Keyword
  app.delete("/api/interests/keyword/:keyword", async (req, res) => {
    try {
      const keyword = decodeURIComponent(req.params.keyword).trim().toLowerCase();
      const all = await db.select().from(interests);
      const matches = all.filter(i => i.keyword.trim().toLowerCase() === keyword);
      for (const m of matches) {
        await db.delete(interests).where(eq(interests.id, m.id));
      }
      res.json({ success: true, count: matches.length });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Get feeds
  app.get("/api/feeds", async (req, res) => {
    try {
      const feeds = await db.select().from(rssFeeds);
      res.json(feeds || []);
    } catch (err) {
      console.error("Error fetching feeds:", err);
      res.status(500).json([]);
    }
  });

  app.get("/api/feeds/stats", async (req, res) => {
    try {
      const stats = await db.select({
          name: rssFeeds.name,
          shownCount: rssFeeds.shownCount
      }).from(rssFeeds);
      res.json(stats);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Test a feed URL before adding
  app.post("/api/feeds/test", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const result = await testFeedUrl(url);
      res.json(result);
    } catch (err: any) {
      console.error("Error testing feed:", err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });
  
  // Add feed manually
  app.post("/api/feeds", async (req, res) => {
    try {
      const url = req.body.url ? req.body.url.trim().replace(/\/feed\/$/, '/feed') : '';
      const name = req.body.name ? req.body.name.trim() : '';
      const isManual = req.body.isManual !== undefined ? Boolean(req.body.isManual) : true;
      if (!url) return res.status(400).json({ error: "URL is required" });
      const inserted = await db.insert(rssFeeds).values({ url, name, isManual }).returning({ id: rssFeeds.id });
      res.json({ success: true });

      // Fire-and-forget: if the RSS feed turns out to be invalid but the page is
      // scrapeable, generate and save an ad-hoc HTML transformer right away.
      const newFeedId = inserted[0]?.id;
      if (newFeedId) {
        ensureScraperConfigForFeed(newFeedId, url, name || url).catch((e: any) => {
          console.warn("Background ad-hoc transformer setup failed:", e.message || e);
        });
      }
    } catch (err: any) {
      console.warn("Error adding feed:", err.message || err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Toggle manual / automatic status of a feed
  app.patch("/api/feeds/:id/manual", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const isManual = Boolean(req.body.isManual);
      await db.update(rssFeeds).set({ isManual }).where(eq(rssFeeds.id, id));
      res.json({ success: true });
    } catch (err: any) {
      console.warn("Error toggling feed manual flag:", err.message || err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Add multiple feeds
  app.post("/api/feeds/bulk", async (req, res) => {
    try {
      if (req.body.feeds && req.body.feeds.length > 0) {
        const cleanedFeeds = req.body.feeds.map((f: any) => ({
          url: f.url ? f.url.trim().replace(/\/feed\/$/, '/feed') : '',
          name: f.name ? f.name.trim() : '',
          isManual: f.isManual !== undefined ? Boolean(f.isManual) : false
        })).filter((f: any) => f.url);
        if (cleanedFeeds.length > 0) {
          await db.insert(rssFeeds).values(cleanedFeeds).onConflictDoNothing();
        }
      }
      res.json({ success: true });
    } catch (err: any) {
      console.warn("Error adding bulk feeds:", err.message || err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Generate feeds from interests using AI (resets automatic feeds, preserves manual feeds)
  app.post("/api/feeds/generate-ai", async (req, res) => {
    try {
      const userInterests = await db.select().from(interests);

      // Step 1: Identify all manual feeds and delete automatic ones
      const manualFeeds = await db.select().from(rssFeeds).where(eq(rssFeeds.isManual, true));
      const autoFeeds = await db.select().from(rssFeeds).where(or(eq(rssFeeds.isManual, false), isNull(rssFeeds.isManual)));
      const resetCount = autoFeeds.length;

      // Reset automatic feeds from DB
      if (resetCount > 0) {
        await db.delete(rssFeeds).where(or(eq(rssFeeds.isManual, false), isNull(rssFeeds.isManual)));
      }

      // Existing manual URLs to avoid duplicating
      const manualUrls = new Set(
        manualFeeds.map(f => f.url.trim().toLowerCase().replace(/\/+$/, ''))
      );

      // Step 2: Query AI for new suggested feeds based on current interests and preserved manual feeds
      const suggestions = await generateFeedsWithAI(userInterests, manualFeeds);

      const newFeedsToInsert: { url: string, name: string, isManual: boolean }[] = [];
      const detailedResults = suggestions.map(s => {
        const cleanUrl = s.url.trim().replace(/\/feed\/$/, '/feed');
        const normalized = cleanUrl.toLowerCase().replace(/\/+$/, '');
        const isAlreadyManual = manualUrls.has(normalized);
        const isNew = !isAlreadyManual;
        if (isNew && !newFeedsToInsert.some(n => n.url.toLowerCase().replace(/\/+$/, '') === normalized)) {
          newFeedsToInsert.push({ url: cleanUrl, name: s.name, isManual: false });
        }
        return {
          ...s,
          url: cleanUrl,
          isNew
        };
      });

      if (newFeedsToInsert.length > 0) {
        await db.insert(rssFeeds).values(newFeedsToInsert).onConflictDoNothing();
        // Trigger background fetch of news for newly discovered feeds
        fetchAllFeeds().catch(err => console.warn("Background fetch error after AI generation:", err.message));
      }

      const currentFeeds = await db.select().from(rssFeeds);

      res.json({
        success: true,
        newCount: newFeedsToInsert.length,
        resetCount,
        manualCount: manualFeeds.length,
        suggestedFeeds: detailedResults,
        feeds: currentFeeds
      });
    } catch (err: any) {
      console.warn("Error in generate-ai feeds:", err.message || err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });
  
  // Delete feed
  app.delete("/api/feeds/:id", async (req, res) => {
    try {
      const feedId = parseInt(req.params.id);
      const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, feedId));
      await db.delete(rssFeeds).where(eq(rssFeeds.id, feedId));
      if (feed) {
        await db.delete(articles).where(eq(articles.source, feed.name));
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting feed:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Push Notifications endpoints
  app.get("/api/push/vapid-public-key", (req, res) => {
    try {
      const key = getVapidPublicKey();
      res.json({ publicKey: key });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const subscription = req.body;
      await registerPushSubscription(subscription);
      res.json({ success: true });
    } catch (e: any) {
      console.error("Error subscribing to push:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      await unregisterPushSubscription(endpoint);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/push/test", async (req, res) => {
    try {
      const { endpoint } = req.body;
      const result = await sendTestPush(endpoint);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings endpoints (e.g. push_threshold)
  app.get("/api/settings/push-threshold", async (req, res) => {
    try {
      const row = await db.select().from(appSettings).where(eq(appSettings.key, "push_threshold")).get();
      res.json({ threshold: row ? parseInt(row.value, 10) : 80 });
    } catch (e) {
      res.json({ threshold: 80 });
    }
  });

  app.post("/api/settings/push-threshold", async (req, res) => {
    try {
      const threshold = parseInt(req.body.threshold, 10);
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        return res.status(400).json({ error: "Invalid threshold value (must be 0-100)" });
      }

      await db.delete(appSettings).where(eq(appSettings.key, "push_threshold"));
      await db.insert(appSettings).values({
        key: "push_threshold",
        value: threshold.toString()
      });

      res.json({ success: true, threshold });
    } catch (e: any) {
      console.error("Error updating push threshold:", e);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Profile AI Interview endpoint
  app.post("/api/profile/interview", async (req, res) => {
    try {
      const { messages } = req.body;
      const currentInterests = await db.select().from(interests);
      const result = await runProfileInterview(messages || [], currentInterests);
      res.json(result);
    } catch (e: any) {
      console.error("Error in profile interview:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });

  app.post("/api/profile/interests/sync", async (req, res) => {
    try {
      const { newInterests, newFeeds } = req.body;
      if (Array.isArray(newInterests)) {
        for (const item of newInterests) {
          const keyword = String(item.keyword || "").trim();
          const type = item.type === 'negative' ? 'negative' : 'positive';
          const weight = typeof item.weight === 'number' ? item.weight : 1.0;
          if (keyword) {
            const existing = await db.select().from(interests).where(eq(interests.keyword, keyword)).get();
            if (!existing) {
              await db.insert(interests).values({ keyword, type, weight });
            }
          }
        }
      }

      if (Array.isArray(newFeeds)) {
        for (const feed of newFeeds) {
          const url = String(feed.url || "").trim();
          const name = String(feed.name || "").trim();
          if (url && name) {
            const existing = await db.select().from(rssFeeds).where(eq(rssFeeds.url, url)).get();
            if (!existing) {
              await db.insert(rssFeeds).values({ url, name, isManual: true });
            }
          }
        }
      }

      const updatedInterests = await db.select().from(interests);
      const updatedFeeds = await db.select().from(rssFeeds);
      res.json({ success: true, interests: updatedInterests, feeds: updatedFeeds });
    } catch (e: any) {
      console.error("Error syncing interview interests and feeds:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });

  app.post("/api/feeds/ai-search", async (req, res) => {
    try {
      const { keyword } = req.body;
      const suggestions = await searchFeedsByKeyword(keyword || "");
      res.json({ feeds: suggestions });
    } catch (e: any) {
      console.error("Error in AI feed search:", e);
      res.status(500).json({ error: e.message || "Internal Server Error" });
    }
  });

  // Reset all user data
  app.post("/api/reset", async (req, res) => {
    console.log("Ricevuta richiesta di reset dati.");
    try {
      console.log("Inizio cancellazione tabelle...");
      // Cancellare prima le tabelle che hanno foreign key
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
  
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
