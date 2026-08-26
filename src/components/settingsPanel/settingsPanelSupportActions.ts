import type { Dispatch, FormEvent, SetStateAction } from "react";
import { togglePushSubscription as togglePushHelper } from "../pushNotificationHelpers";
import type { SettingsPanelState, SuggestedFeed, InterviewMessage } from "./settingsPanelTypes";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type SettingsPanelSetState = Dispatch<SetStateAction<SettingsPanelState>>;

function updateState(setState: SettingsPanelSetState, patch: Partial<SettingsPanelState>) {
  setState((prev) => ({ ...prev, ...patch }));
}

export async function loadPushSettings(setState: SettingsPanelSetState) {
  try {
    const response = await fetch("/api/settings/push-threshold");
    const data = await response.json();
    if (data && typeof data.threshold === "number") {
      updateState(setState, { pushThreshold: data.threshold });
    }
  } catch {}

  if ("serviceWorker" in navigator && "PushManager" in window) {
    navigator.serviceWorker.ready.then((registration) => registration.pushManager.getSubscription().then((subscription) => updateState(setState, { pushSubscribed: Boolean(subscription) })));
  }
}

export async function handleThresholdChange(value: number, setState: SettingsPanelSetState) {
  updateState(setState, { pushThreshold: value });
  try {
    await fetch("/api/settings/push-threshold", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ threshold: value }) });
  } catch (error) {
    console.error("Error saving threshold:", error);
  }
}

export async function togglePushSubscription(setState: SettingsPanelSetState) {
  await togglePushHelper(
    (pushLoading) => updateState(setState, { pushLoading }),
    (pushStatusMessage) => updateState(setState, { pushStatusMessage }),
    (pushSubscribed) => updateState(setState, { pushSubscribed }),
  );
}

export async function sendTestNotification(setState: SettingsPanelSetState) {
  try {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const response = await fetch("/api/push/test", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ endpoint: subscription?.endpoint }) });
    const data = await response.json();
    updateState(setState, { pushStatusMessage: data.success ? "?? Notifica di test inviata con successo!" : "Impossibile inviare la notifica di test." });
    setTimeout(() => updateState(setState, { pushStatusMessage: null }), 5000);
  } catch (error) {
    console.error("Test notification error:", error);
  }
}

export async function sendInterviewMessage(event: FormEvent, state: SettingsPanelState, setState: SettingsPanelSetState) {
  event.preventDefault();
  if (!state.interviewInput.trim() || state.interviewLoading) {
    return;
  }

  const userMessage = state.interviewInput.trim();
  const messages: InterviewMessage[] = [...state.interviewMessages, { role: "user", content: userMessage }];
  updateState(setState, { interviewInput: "", interviewLoading: true, interviewMessages: messages });
  try {
    const response = await fetch("/api/profile/interview", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ messages }) });
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setState((prev) => ({
      ...prev,
      interviewMessages: [...prev.interviewMessages, { role: "assistant", content: data.reply }],
      pendingExtracted: Array.isArray(data.extractedInterests) && data.extractedInterests.length > 0 ? data.extractedInterests : prev.pendingExtracted,
      pendingSuggestedFeeds: Array.isArray(data.suggestedFeeds) && data.suggestedFeeds.length > 0 ? [...prev.pendingSuggestedFeeds, ...data.suggestedFeeds.filter((feed: SuggestedFeed) => !new Set(prev.pendingSuggestedFeeds.map((item) => item.url)).has(feed.url))] : prev.pendingSuggestedFeeds,
    }));
  } catch (error) {
    console.error("Interview error:", error);
  } finally {
    updateState(setState, { interviewLoading: false });
  }
}

export async function applyExtractedInterests(state: SettingsPanelState, setState: SettingsPanelSetState) {
  if (state.pendingExtracted.length === 0 && state.pendingSuggestedFeeds.length === 0) {
    return;
  }

  try {
    const response = await fetch("/api/profile/interests/sync", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ newInterests: state.pendingExtracted, newFeeds: state.pendingSuggestedFeeds }) });
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    setState((prev) => ({ ...prev, feeds: data.feeds || prev.feeds, interviewOpen: false, pendingExtracted: [], pendingSuggestedFeeds: [], feedSearchFeedback: "Interessi e sorgenti RSS aggiunti con successo tramite l'assistente AI! ??" }));
    void fetch("/api/fetch", { method: "POST" });
    window.dispatchEvent(new CustomEvent("refresh-articles"));
    setTimeout(() => updateState(setState, { feedSearchFeedback: null }), 5000);
  } catch (error) {
    console.error("Error applying extracted interests and feeds:", error);
  }
}
