// Helper utilities for push notifications in SettingsPanel

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function unsubscribeFromPush(
  reg: ServiceWorkerRegistration,
  setPushSubscribed: (val: boolean) => void,
  setPushStatusMessage: (msg: string | null) => void
): Promise<void> {
  const existingSub = await reg.pushManager.getSubscription();
  if (!existingSub) return;
  
  await existingSub.unsubscribe();
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: existingSub.endpoint })
  });
  setPushSubscribed(false);
  setPushStatusMessage("Notifiche push disattivate con successo.");
}

async function requestNotificationPermission(): Promise<string> {
  if (!('Notification' in window)) {
    throw new Error("Il browser non supporta le notifiche.");
  }

  if (Notification.permission === 'denied') {
    throw new Error("I permessi per le notifiche sono bloccati dal browser o dall'iframe di anteprima. Prova ad aprire l'applicazione in una nuova scheda per abilitare le notifiche push.");
  }

  let permission: string = Notification.permission;
  if (permission !== 'granted') {
    try {
      permission = await Notification.requestPermission();
    } catch (err) {
      console.warn("Notification.requestPermission failed:", err);
    }
  }

  if (permission !== 'granted') {
    throw new Error("Permesso notifiche non concesso. Nota: all'interno dell'anteprima in iframe alcune restrizioni del browser bloccano le notifiche. Apri l'app in una nuova scheda per attivarle.");
  }

  return permission;
}

async function subscribeToPush(
  reg: ServiceWorkerRegistration,
  setPushSubscribed: (val: boolean) => void,
  setPushStatusMessage: (msg: string | null) => void
): Promise<void> {
  await requestNotificationPermission();

  const keyRes = await fetch('/api/push/vapid-public-key');
  if (!keyRes.ok) throw new Error("Impossibile recuperare la chiave VAPID");
  const { publicKey } = await keyRes.json();

  const convertedKey = urlBase64ToUint8Array(publicKey);
  const newSub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedKey
  });

  const subJson = newSub.toJSON();
  const subRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subJson)
  });

  if (!subRes.ok) throw new Error("Errore durante la registrazione sul server");

  setPushSubscribed(true);
  setPushStatusMessage("Notifiche push attivate con successo!");
}

export async function togglePushSubscription(
  setPushLoading: (val: boolean) => void,
  setPushStatusMessage: (msg: string | null) => void,
  setPushSubscribed: (val: boolean) => void
): Promise<void> {
  setPushLoading(true);
  setPushStatusMessage(null);
  try {
    if (!('serviceWorker' in navigator && 'PushManager' in window)) {
      alert("Il tuo browser non supporta le notifiche push.");
      setPushLoading(false);
      return;
    }

    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const existingSub = await reg.pushManager.getSubscription();
    if (existingSub) {
      await unsubscribeFromPush(reg, setPushSubscribed, setPushStatusMessage);
    } else {
      await subscribeToPush(reg, setPushSubscribed, setPushStatusMessage);
    }
  } catch (e: unknown) {
    console.error("Push subscription error:", e);
    setPushStatusMessage(`Errore: ${getErrorMessage(e) || "Impossibile attivare le notifiche push"}`);
  } finally {
    setPushLoading(false);
    setTimeout(() => setPushStatusMessage(null), 6000);
  }
}
