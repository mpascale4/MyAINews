import webpush from "web-push";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { pushSubscriptions, articles, interests, appSettings } from "../db/schema";
import { eq, gte, and, isNull, or } from "drizzle-orm";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const VAPID_FILE = path.join(process.cwd(), "vapid-keys.json");

let vapidKeys: VapidKeys | null = null;

export function initializeVapid(): VapidKeys {
  if (vapidKeys) return vapidKeys;

  // 1. Check environment variables first
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapidKeys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
  } else {
    // 2. Check cached file on disk to maintain stable keys across restarts
    if (fs.existsSync(VAPID_FILE)) {
      try {
        const raw = fs.readFileSync(VAPID_FILE, "utf-8");
        vapidKeys = JSON.parse(raw);
      } catch (e) {
        console.warn("Failed to read vapid-keys.json, generating new keys:", e);
      }
    }

    // 3. Generate new VAPID keys if not present
    if (!vapidKeys || !vapidKeys.publicKey || !vapidKeys.privateKey) {
      const generated = webpush.generateVAPIDKeys();
      vapidKeys = {
        publicKey: generated.publicKey,
        privateKey: generated.privateKey
      };
      try {
        fs.writeFileSync(VAPID_FILE, JSON.stringify(vapidKeys, null, 2), "utf-8");
      } catch (err) {
        console.warn("Could not save vapid-keys.json to disk:", err);
      }
    }
  }

  webpush.setVapidDetails(
    "mailto:admin@mynewsai.local",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  return vapidKeys;
}

export function getVapidPublicKey(): string {
  const keys = initializeVapid();
  return keys.publicKey;
}

export async function registerPushSubscription(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    throw new Error("Invalid push subscription object");
  }

  // Delete any existing subscription with this endpoint to avoid duplicate errors
  try {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
  } catch (e) {
    // ignore
  }

  await db.insert(pushSubscriptions).values({
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth
  });

  return { success: true };
}

export async function unregisterPushSubscription(endpoint: string) {
  if (!endpoint) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  data?: any;
}

export async function sendPushToAll(payload: NotificationPayload) {
  initializeVapid();
  
  const allSubs = await db.select().from(pushSubscriptions);
  if (allSubs.length === 0) {
    console.log("No active push subscriptions found.");
    return { sent: 0, failed: 0 };
  }

  const stringifiedPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/icon.png",
    badge: payload.badge || "/icon.png",
    image: payload.image || undefined,
    tag: payload.tag || `news-${Date.now()}`,
    data: {
      url: payload.url || "/",
      ...payload.data
    }
  });

  let sent = 0;
  let failed = 0;

  for (const sub of allSubs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSub, stringifiedPayload, {
        TTL: 86400, // 24 hours
        urgency: "high"
      });
      sent++;
    } catch (err: any) {
      console.warn(`Error sending push to ${sub.endpoint.slice(0, 30)}...:`, err.statusCode || err.message);
      failed++;
      // If subscription is 404 or 410 (Gone), delete it
      if (err.statusCode === 404 || err.statusCode === 410) {
        try {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } catch (e) {
          // ignore
        }
      }
    }
  }

  return { sent, failed, total: allSubs.length };
}

export async function sendTestPush(endpoint?: string) {
  initializeVapid();

  const payload: NotificationPayload = {
    title: "🔔 Test Notifiche Push MyNewsAI",
    body: "Le notifiche in background sono attive! Riceverai un avviso quando l'AI rileva articoli con Score > 80.",
    url: "/",
    tag: "test-notification"
  };

  if (endpoint) {
    const targetSub = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).get();
    if (targetSub) {
      try {
        await webpush.sendNotification(
          {
            endpoint: targetSub.endpoint,
            keys: { p256dh: targetSub.p256dh, auth: targetSub.auth }
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            icon: "/icon.png",
            badge: "/icon.png",
            tag: "test-notification",
            data: { url: "/" }
          })
        );
        return { success: true, sent: 1 };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  }

  return await sendPushToAll(payload);
}

/**
 * Scan for un-notified articles with AI Relevance >= 80 and send push notifications
 */
export async function notifyNewHighRelevanceArticles() {
  try {
    let threshold = 80;
    try {
      const settingRow = await db.select().from(appSettings).where(eq(appSettings.key, "push_threshold")).get();
      if (settingRow && settingRow.value) {
        const parsed = parseInt(settingRow.value, 10);
        if (!isNaN(parsed)) threshold = parsed;
      }
    } catch (e) {}

    const candidateArticles = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.isHidden, false),
          gte(articles.aiRelevance, threshold),
          or(eq(articles.isNotified, false), isNull(articles.isNotified))
        )
      )
      .limit(5);

    if (candidateArticles.length === 0) return;

    for (const article of candidateArticles) {
      const score = Math.round(article.aiRelevance || 80);
      const tagText = Array.isArray(article.aiTags) && article.aiTags.length > 0 
        ? ` • ${article.aiTags.slice(0, 2).join(", ")}` 
        : "";

      await sendPushToAll({
        title: `🔥 Notizia ad Alta Rilevanza (${score}%)${tagText}`,
        body: article.title,
        icon: article.imageUrl || "/icon.png",
        image: article.imageUrl || undefined,
        url: article.link || "/",
        tag: `high-rel-${article.id}`,
        data: {
          articleId: article.id,
          url: article.link || "/",
          score: score
        }
      });

      // Mark article as notified
      await db
        .update(articles)
        .set({ isNotified: true })
        .where(eq(articles.id, article.id));
    }
  } catch (err: any) {
    console.error("Error sending high relevance push notifications:", err);
  }
}
