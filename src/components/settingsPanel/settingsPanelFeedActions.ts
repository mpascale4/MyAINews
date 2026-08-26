import type { Dispatch, FormEvent, RefObject, SetStateAction } from "react";
import { registerSourceNames } from "../../lib/sourceStyle";
import type { Feed } from "../../types";
import type { SettingsPanelState, SuggestedFeed, TransformerResult, ImportFeedCandidate } from "./settingsPanelTypes";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const POST_METHOD = { method: "POST" } as const;
const TRANSFORMER_TIMEOUT_MS = 90000;

type SettingsPanelSetState = Dispatch<SetStateAction<SettingsPanelState>>;

function updateState(setState: SettingsPanelSetState, patch: Partial<SettingsPanelState>) {
  setState((prev) => ({ ...prev, ...patch }));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function normalizeFeedUrl(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function playAddSound() {
  try {
    const AudioCtx = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const context = new AudioCtx();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
  } catch {
    // Web Audio API not available/blocked: fail silently, sound feedback is a nice-to-have.
  }
}

export async function loadData(setState: SettingsPanelSetState) {
  try {
    const interestsResponse = await fetch("/api/interests");
    if (interestsResponse.ok) {
      await interestsResponse.json();
    }
  } catch (error) {
    console.error("Error loading interests:", error);
  }

  try {
    const feedsResponse = await fetch("/api/feeds");
    if (!feedsResponse.ok) {
      return;
    }

    const feedsData = await feedsResponse.json();
    const feeds = Array.isArray(feedsData) ? feedsData : [];
    registerSourceNames(feeds.map((feed: SuggestedFeed) => feed.name));
    updateState(setState, { feeds });
  } catch (error) {
    console.error("Error loading feeds:", error);
    updateState(setState, { feeds: [] });
  }
}

export async function testSuggestedFeed(url: string, setState: SettingsPanelSetState) {
  setState((prev) => ({ ...prev, suggestedFeedTestResults: { ...prev.suggestedFeedTestResults, [url]: { loading: true } } }));
  try {
    const response = await fetch("/api/feeds/test", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ url }) });
    const data = response.ok ? await response.json() : null;
    const result = data ? { loading: false, isValidRss: data.isValidRss, isScrapeableHtml: data.isScrapeableHtml, transformerCreated: data.transformerCreated, itemCount: data.itemCount, error: data.error } : { loading: false, error: "Errore di connessione durante il test." };
    setState((prev) => ({ ...prev, suggestedFeedTestResults: { ...prev.suggestedFeedTestResults, [url]: result } }));
  } catch {
    setState((prev) => ({ ...prev, suggestedFeedTestResults: { ...prev.suggestedFeedTestResults, [url]: { loading: false, error: "Errore imprevisto durante il test." } } }));
  }
}

export async function searchFeedsAI(event: FormEvent, state: SettingsPanelState, setState: SettingsPanelSetState) {
  event.preventDefault();
  if (!state.feedSearchKeyword.trim() || state.feedSearchLoading) {
    return;
  }

  updateState(setState, { feedSearchLoading: true, feedSearchResults: [], feedSearchFeedback: null });
  try {
    const response = await fetch("/api/feeds/ai-search", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ keyword: state.feedSearchKeyword.trim() }) });
    if (response.ok) {
      const data = await response.json();
      updateState(setState, { feedSearchResults: data.feeds || [] });
    }
  } catch (error) {
    console.error("Error searching feeds:", error);
  } finally {
    updateState(setState, { feedSearchLoading: false });
  }
}

export async function addSearchedFeedManually(item: { name: string; url: string; reason: string; category: string }, state: SettingsPanelState, setState: SettingsPanelSetState) {
  try {
    const response = await fetch("/api/feeds", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ url: item.url, name: item.name, isManual: true, addedVia: state.feedSearchKeyword.trim() }) });
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    await loadData(setState);
    playAddSound();
    void fetch("/api/fetch", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ feedName: item.name }) }).catch((error) => console.error("Error fetching new source:", error)).finally(() => window.dispatchEvent(new CustomEvent("refresh-articles")));
    updateState(setState, {
      feedSearchFeedback: `Sorgente "${item.name}" aggiunta con successo (feed #${data.id})! ${!item.reason?.toLowerCase().includes("rss") ? "Se non è un RSS valido, verrà creato automaticamente un trasformatore ad-hoc per estrarre le notizie dalla pagina HTML." : ""}`,
      feedSearchResults: state.feedSearchResults.filter((feed) => feed.url !== item.url),
    });
    setTimeout(() => updateState(setState, { feedSearchFeedback: null }), 6000);
  } catch (error) {
    console.error("Error adding searched feed:", error);
  }
}

export async function deleteFeed(feedId: number, setState: SettingsPanelSetState) {
  await fetch(`/api/feeds/${feedId}`, { method: "DELETE" });
  setState((prev) => ({ ...prev, feeds: prev.feeds.filter((feed) => feed.id !== feedId) }));
  window.dispatchEvent(new CustomEvent("refresh-articles"));
}

export async function createTransformerForFeed(feedId: number, setState: SettingsPanelSetState) {
  setState((prev) => ({ ...prev, transformerResults: { ...prev.transformerResults, [feedId]: { loading: true } } }));
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSFORMER_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/feeds/${feedId}/create-transformer`, { method: "POST", signal: controller.signal });
    clearTimeout(timeoutId);
    const data = response.ok ? await response.json() : null;
    const result: TransformerResult = data ? { loading: false, createdTransformer: data.createdTransformer, validRss: data.validRss, itemCount: data.itemCount, reason: data.reason } : { loading: false, reason: "Errore di connessione durante la creazione del trasformatore." };
    setState((prev) => ({ ...prev, transformerResults: { ...prev.transformerResults, [feedId]: result } }));
    if (data?.createdTransformer || data?.validRss) {
      window.dispatchEvent(new CustomEvent("refresh-articles"));
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const reason = error instanceof Error && error.name === "AbortError" ? "L'operazione sta impiegando troppo tempo (probabile limite di quota AI raggiunto). Riprova tra qualche minuto." : "Errore imprevisto durante la creazione del trasformatore.";
    setState((prev) => ({ ...prev, transformerResults: { ...prev.transformerResults, [feedId]: { loading: false, reason } } }));
  }
}

export async function handleResetAll(setState: SettingsPanelSetState) {
  updateState(setState, { isResetting: true });
  try {
    const response = await fetch("/api/reset-all", POST_METHOD);
    if (response.ok) {
      localStorage.removeItem("onboardingComplete");
      localStorage.removeItem("lastDailyFeedPromptDate");
      window.location.reload();
      return;
    }
  } catch (error) {
    console.error("Error resetting app data:", error);
  }
  updateState(setState, { isResetting: false });
}

export async function generateFeedsFromInterests(setState: SettingsPanelSetState) {
  updateState(setState, { isGenerating: true, isRegenerateConfirmOpen: false });
  try {
    const response = await fetch("/api/feeds/generate-ai", { method: "POST", headers: JSON_HEADERS });
    if (!response.ok) {
      throw new Error("Errore durante la generazione dei feed con AI");
    }

    const data = await response.json();
    if (data.feeds) {
      updateState(setState, { feeds: data.feeds });
    } else {
      const freshFeeds = await fetch("/api/feeds").then((result) => result.json());
      updateState(setState, { feeds: freshFeeds });
    }

    window.dispatchEvent(new CustomEvent("refresh-articles"));
    updateState(setState, { aiOverlayData: { isOpen: true, newCount: data.newCount || 0, resetCount: data.resetCount || 0, manualCount: data.manualCount || 0, suggestedFeeds: data.suggestedFeeds || [] } });
  } catch (error) {
    console.warn("Errore generazione feed:", getErrorMessage(error));
  } finally {
    updateState(setState, { isGenerating: false });
  }
}

export function handleExportFeeds(feeds: Feed[]) {
  const exportData = feeds.map((feed) => ({ url: feed.url, name: feed.name, addedVia: feed.addedVia || null }));
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `myainews-sorgenti-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export function handleImportFeedsClick(importFileInputRef: RefObject<HTMLInputElement | null>) {
  importFileInputRef.current?.click();
}

export async function handleImportFeedsFile(event: React.ChangeEvent<HTMLInputElement>, state: SettingsPanelState, setState: SettingsPanelSetState) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error("Il file deve contenere un array di sorgenti.");
    }

    const cleaned = parsed.filter((feed: ImportFeedCandidate) => feed && typeof feed.url === "string" && feed.url.trim()).map((feed: ImportFeedCandidate) => ({ url: feed.url!.trim(), name: feed.name ? String(feed.name).trim() : feed.url!.trim(), isManual: true, addedVia: feed.addedVia ? String(feed.addedVia).trim() : null }));
    if (cleaned.length === 0) {
      throw new Error("Nessuna sorgente valida trovata nel file.");
    }

    const response = await fetch("/api/feeds/bulk", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ feeds: cleaned }) });
    if (!response.ok) {
      throw new Error("Errore del server durante l'importazione.");
    }

    const freshFeeds = await fetch("/api/feeds").then((result) => result.json());
    const newCount = freshFeeds.length - state.feeds.length;
    updateState(setState, { feeds: freshFeeds, importFeedback: newCount > 0 ? `Importate ${newCount} nuove sorgenti (le altre già presenti sono state ignorate, aggiornando solo la chiave di ricerca mancante).` : "Nessuna nuova sorgente da aggiungere: tutte già presenti (chiave di ricerca aggiornata dove mancante)." });
    window.dispatchEvent(new CustomEvent("refresh-articles"));
  } catch (error: unknown) {
    updateState(setState, { importFeedback: `Errore: ${getErrorMessage(error) || "file non valido."}` });
  }
}
