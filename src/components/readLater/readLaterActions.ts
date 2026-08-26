import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { Article } from "../../types";
import { shareArticleHelper } from "../shareArticleHelper";
import {
  FEEDBACK_TIMEOUT_MS,
  HIDE_PLACEHOLDER_TIMEOUT_MS,
  ReadLaterState,
  SOURCE_FEEDBACK_TIMEOUT_MS,
  type StatusFilter,
} from "./readLaterTypes";

const POST_METHOD = { method: "POST" } as const;

type ReadLaterSetState = Dispatch<SetStateAction<ReadLaterState>>;

type ReadLaterActionsContext = {
  state: ReadLaterState;
  setState: ReadLaterSetState;
};

function updateState(setState: ReadLaterSetState, patch: Partial<ReadLaterState>) {
  setState((prev) => ({ ...prev, ...patch }));
}

function showFeedback(setState: ReadLaterSetState, message: string, timeout = FEEDBACK_TIMEOUT_MS) {
  updateState(setState, { feedbackMessage: message });
  setTimeout(() => updateState(setState, { feedbackMessage: null }), timeout);
}

function updateSelectedSummary(setState: ReadLaterSetState, articleId: number, patch: Partial<Article>) {
  setState((prev) => ({
    ...prev,
    selectedSummary: prev.selectedSummary?.id === articleId ? { ...prev.selectedSummary, ...patch } : prev.selectedSummary,
  }));
}

function removeRecentlyHiddenId(setState: ReadLaterSetState, articleId: number) {
  setState((prev) => {
    const nextHiddenIds = { ...prev.recentlyHiddenIds };
    delete nextHiddenIds[articleId];
    return { ...prev, recentlyHiddenIds: nextHiddenIds };
  });
}

export async function fetchInterests(setState: ReadLaterSetState) {
  try {
    const response = await fetch("/api/interests");
    const interestsList = response.ok ? await response.json() : [];
    updateState(setState, { interestsList: Array.isArray(interestsList) ? interestsList : [] });
  } catch (error) {
    console.error("Error fetching interests:", error);
    updateState(setState, { interestsList: [] });
  }
}

export async function fetchSavedArticles(setState: ReadLaterSetState) {
  updateState(setState, { loading: true });
  try {
    const response = await fetch("/api/articles?filter=Saved&sort=Date");
    const articles = response.ok ? await response.json() : [];
    updateState(setState, { articles: Array.isArray(articles) ? articles : [] });
  } catch (error) {
    console.error("Error loading saved articles:", error);
    updateState(setState, { articles: [] });
  } finally {
    updateState(setState, { loading: false });
  }
}

async function toggleReadArticle(article: Article, setState: ReadLaterSetState) {
  const isRead = !article.isRead;
  const endpoint = isRead ? `/api/articles/${article.id}/read` : `/api/articles/${article.id}/unread`;
  setState((prev) => ({
    ...prev,
    articles: prev.articles.map((item) => item.id === article.id ? { ...item, isRead } : item),
  }));
  updateSelectedSummary(setState, article.id, { isRead });
  showFeedback(setState, isRead ? "Notizia segnata come letta" : "Notizia segnata come non letta");

  try {
    await fetch(endpoint, POST_METHOD);
  } catch (error) {
    console.error("Error toggling read status:", error);
  }
}

async function toggleSaveArticle(article: Article, setState: ReadLaterSetState) {
  setState((prev) => ({
    ...prev,
    articles: prev.articles.filter((item) => item.id !== article.id),
    selectedSummary: prev.selectedSummary?.id === article.id ? null : prev.selectedSummary,
  }));
  showFeedback(setState, "Notizia rimossa da 'Leggi dopo'");

  try {
    await fetch(`/api/articles/${article.id}/unsave`, POST_METHOD);
  } catch (error) {
    console.error("Error removing from saved:", error);
  }
}

async function hideArticle(articleId: number, state: ReadLaterState, setState: ReadLaterSetState) {
  const article = state.articles.find((item) => item.id === articleId);
  if (!article) {
    return;
  }

  setState((prev) => ({
    ...prev,
    recentlyHiddenIds: { ...prev.recentlyHiddenIds, [articleId]: true },
    selectedSummary: prev.selectedSummary?.id === articleId ? null : prev.selectedSummary,
  }));

  try {
    await fetch(`/api/articles/${articleId}/hide`, POST_METHOD);
  } catch (error) {
    console.error("Error hiding article:", error);
  }

  setTimeout(() => {
    setState((prev) => prev.recentlyHiddenIds[articleId]
      ? {
          ...prev,
          articles: prev.articles.filter((item) => item.id !== articleId),
          recentlyHiddenIds: Object.fromEntries(Object.entries(prev.recentlyHiddenIds).filter(([key]) => Number(key) !== articleId)),
        }
      : prev);
  }, HIDE_PLACEHOLDER_TIMEOUT_MS);
}

async function undoHideArticleInline(articleId: number, setState: ReadLaterSetState) {
  removeRecentlyHiddenId(setState, articleId);
  await fetch(`/api/articles/${articleId}/unhide`, POST_METHOD);
}

async function shareArticle(article: Article, setState: ReadLaterSetState, event?: MouseEvent) {
  event?.stopPropagation();
  await shareArticleHelper(article, (message) => updateState(setState, { feedbackMessage: message }), "Notizia condivisa!");
}

async function regenerateSummary(articleId: number, setState: ReadLaterSetState) {
  updateState(setState, { isRegenerating: true, summaryError: null });
  try {
    const response = await fetch(`/api/articles/${articleId}/regenerate-summary`, POST_METHOD);
    if (!response.ok) {
      updateState(setState, { summaryError: "Impossibile generare il riassunto. Riprova pi� tardi." });
      return;
    }

    const data = await response.json();
    setState((prev) => ({
      ...prev,
      articles: prev.articles.map((item) => item.id === articleId ? { ...item, aiSummary: data.aiSummary, aiTags: data.aiTags, aiRelevance: data.aiRelevance } : item),
    }));
    updateSelectedSummary(setState, articleId, { aiSummary: data.aiSummary, aiTags: data.aiTags, aiRelevance: data.aiRelevance });
  } catch (error) {
    console.error(error);
    updateState(setState, { summaryError: "Errore durante la generazione del riassunto." });
  } finally {
    updateState(setState, { isRegenerating: false });
  }
}

function requestSummaryRegeneration(articleId: number, setState: ReadLaterSetState) {
  updateState(setState, { pendingRegenerateId: articleId });
}

async function confirmSummaryRegeneration(state: ReadLaterState, setState: ReadLaterSetState) {
  if (state.pendingRegenerateId == null) {
    return;
  }

  const articleId = state.pendingRegenerateId;
  updateState(setState, { pendingRegenerateId: null });
  await regenerateSummary(articleId, setState);
}

async function excludeSource(sourceName: string, setState: ReadLaterSetState) {
  try {
    await fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: sourceName, type: "negative", weight: 1 }),
    });

    setState((prev) => ({
      ...prev,
      articles: prev.articles.filter((item) => (item.source || "").toLowerCase().trim() !== sourceName.toLowerCase().trim()),
      infoModalArticle: null,
      selectedSummary: null,
    }));
    showFeedback(setState, `Sorgente "${sourceName}" esclusa! Notizie rimosse.`, SOURCE_FEEDBACK_TIMEOUT_MS);
  } catch (error) {
    console.error(error);
    showFeedback(setState, `Errore durante l'esclusione della sorgente "${sourceName}".`, SOURCE_FEEDBACK_TIMEOUT_MS);
  }
}

function openSummary(article: Article, setState: ReadLaterSetState) {
  updateState(setState, { selectedSummary: article, summaryError: null });
  if (!article.aiSummary) {
    void regenerateSummary(article.id, setState);
  }
}

function setStatusFilter(setState: ReadLaterSetState, statusFilter: StatusFilter) {
  updateState(setState, { statusFilter });
}

export function createReadLaterActions({ state, setState }: ReadLaterActionsContext) {
  return {
    fetchSavedArticles: () => fetchSavedArticles(setState),
    handleExcludeSource: (sourceName: string) => excludeSource(sourceName, setState),
    handleHide: (articleId: number) => hideArticle(articleId, state, setState),
    handleOpenSummary: (article: Article) => openSummary(article, setState),
    handleShareArticle: (article: Article, event?: MouseEvent) => shareArticle(article, setState, event),
    handleToggleRead: (article: Article) => toggleReadArticle(article, setState),
    handleToggleSave: (article: Article) => toggleSaveArticle(article, setState),
    confirmGenerateSummary: () => confirmSummaryRegeneration(state, setState),
    generateSummary: (articleId: number) => requestSummaryRegeneration(articleId, setState),
    setFeedbackMessage: (feedbackMessage: string | null) => updateState(setState, { feedbackMessage }),
    setInfoModalArticle: (infoModalArticle: Article | null) => updateState(setState, { infoModalArticle }),
    setPendingRegenerateId: (pendingRegenerateId: number | null) => updateState(setState, { pendingRegenerateId }),
    setSearchQuery: (searchQuery: string) => updateState(setState, { searchQuery }),
    setSelectedSummary: (selectedSummary: Article | null) => updateState(setState, { selectedSummary }),
    setSelectedTag: (selectedTag: string | null) => updateState(setState, { selectedTag }),
    setStatusFilter: (statusFilter: StatusFilter) => setStatusFilter(setState, statusFilter),
    undoHideArticleInline: (articleId: number) => undoHideArticleInline(articleId, setState),
  };
}
