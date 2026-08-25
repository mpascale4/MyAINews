import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { appSettings } from "../db/schema";

const router = Router();

router.get("/api/settings/push-threshold", async (_req, res) => {
  try {
    const row = await db.select().from(appSettings).where(eq(appSettings.key, "push_threshold")).get();
    res.json({ threshold: row ? parseInt(row.value, 10) : 80 });
  } catch {
    res.json({ threshold: 80 });
  }
});

router.post("/api/settings/push-threshold", async (req, res) => {
  try {
    const threshold = parseInt(req.body.threshold, 10);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      return res.status(400).json({ error: "Invalid threshold value (must be 0-100)" });
    }

    await db.delete(appSettings).where(eq(appSettings.key, "push_threshold"));
    await db.insert(appSettings).values({
      key: "push_threshold",
      value: threshold.toString(),
    });

    res.json({ success: true, threshold });
  } catch (e: unknown) {
    console.error("Error updating push threshold:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
