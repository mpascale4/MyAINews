import { Router } from "express";
import { getVapidPublicKey, registerPushSubscription, sendTestPush, unregisterPushSubscription } from "../lib/pushNotifications";
import { getErrorMessage } from "../lib/errorUtils";

const router = Router();

router.get("/api/push/vapid-public-key", (_req, res) => {
  try {
    const key = getVapidPublicKey();
    res.json({ publicKey: key });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

router.post("/api/push/subscribe", async (req, res) => {
  try {
    const subscription = req.body;
    await registerPushSubscription(subscription);
    res.json({ success: true });
  } catch (e: unknown) {
    console.error("Error subscribing to push:", e);
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

router.post("/api/push/unsubscribe", async (req, res) => {
  try {
    const { endpoint } = req.body;
    await unregisterPushSubscription(endpoint);
    res.json({ success: true });
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

router.post("/api/push/test", async (req, res) => {
  try {
    const { endpoint } = req.body;
    const result = await sendTestPush(endpoint);
    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: getErrorMessage(e) });
  }
});

export default router;
