import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from "dotenv";
import { fetchAllFeeds, seedInitialData } from "./src/lib/rss";
import { notifyNewHighRelevanceArticles } from "./src/lib/pushNotifications";
import articlesRouter from "./src/routes/articlesRoutes";
import dashboardRouter from "./src/routes/dashboardRoutes";
import feedsRouter from "./src/routes/feedsRoutes";
import interestsRouter from "./src/routes/interestsRoutes";
import miscRouter from "./src/routes/miscRoutes";
import profileRouter from "./src/routes/profileRoutes";
import pushRouter from "./src/routes/pushRoutes";
import settingsRouter from "./src/routes/settingsRoutes";

dotenv.config();

async function initializeBackgroundJobs() {
  try {
    await seedInitialData();
    console.log("Database seeded.");
    fetchAllFeeds()
      .then(() => console.log("Initial RSS fetch complete."))
      .catch(console.error);

    setInterval(() => {
      console.log("Running background RSS sync & notification check...");
      fetchAllFeeds()
        .then(() => notifyNewHighRelevanceArticles())
        .catch((err) => console.warn("Background feed fetch error:", err));
    }, 5 * 60 * 1000);
  } catch (err) {
    console.error("Error during DB initialization:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  app.get("/sw.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(path.join(process.cwd(), "public", "sw.js"));
  });

  await initializeBackgroundJobs();

  app.use(articlesRouter);
  app.use(dashboardRouter);
  app.use(interestsRouter);
  app.use(feedsRouter);
  app.use(pushRouter);
  app.use(settingsRouter);
  app.use(profileRouter);
  app.use(miscRouter);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
