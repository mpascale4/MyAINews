import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { interests } from "../db/schema";

const router = Router();

router.get("/api/interests", async (_req, res) => {
  try {
    const resInterests = await db.select().from(interests);
    res.json(resInterests || []);
  } catch (err) {
    console.error("Error fetching interests:", err);
    res.status(500).json([]);
  }
});

router.post("/api/interests", async (req, res) => {
  try {
    const { keyword, type, weight } = req.body;
    if (!keyword || !type) {
      return res.status(400).json({ error: "Keyword and type are required" });
    }
    const trimmed = String(keyword).trim();
    const existing = await db.select().from(interests);
    const duplicate = existing.find((interest) => interest.keyword.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) {
      await db.delete(interests).where(eq(interests.id, duplicate.id));
    }
    await db.insert(interests).values({
      keyword: trimmed,
      type,
      weight: weight !== undefined ? weight : 1.0,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/api/interests/bulk", async (req, res) => {
  try {
    if (req.body.interests && req.body.interests.length > 0) {
      await db.delete(interests);
      await db.insert(interests).values(req.body.interests);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/api/interests/:id", async (req, res) => {
  try {
    await db.delete(interests).where(eq(interests.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/api/interests/keyword/:keyword", async (req, res) => {
  try {
    const keyword = decodeURIComponent(req.params.keyword).trim().toLowerCase();
    const all = await db.select().from(interests);
    const matches = all.filter((interest) => interest.keyword.trim().toLowerCase() === keyword);
    for (const match of matches) {
      await db.delete(interests).where(eq(interests.id, match.id));
    }
    res.json({ success: true, count: matches.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
