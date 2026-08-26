import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { Article } from "../../types";
import { shareArticleHelper } from "../shareArticleHelper";
import type { ArticlesListState, TagSearchResult } from "./articlesListTypes";
import { SHOW_MORE_BATCH } from "./articlesListTypes";
import {
  addTagFeed,
  createSourceClickCountsState,
  createTransformerForSelectedSource,
  fetchAllAddedFeeds,
  fetchArticles,
  fetchSources,
  refreshArticles,
  removeSelectedSource,
  resetArticlesListState,
  resetHiddenQueue,
  resetTagSearchForModal,
  selectSource,
  searchFeedsForTag,
  showFeedback,
  undoHideArticleInline,
} from "./articlesListDataActions";

const POST_METHOD = { method: "POST" } as const;
const JSON_HEADERS = { "Content-Type": "application/json" } as const;

type ArticlesListSetState = Dispatch<SetStateAction<ArticlesListState>>;

type ArticlesListActionsContext = {
  refs: { skipNextSourceFetchRef: React.MutableRefObject<boolean> };
  setSourceClickCounts: Dispatch<SetStateAction<Record<string, number>>>;
  state: ArticlesListState;
  setState: ArticlesListSetState;
};

function updateState(setState: ArticlesListSetState, patch: Partial<ArticlesListState>) {
  setState((prev) => ({ ...prev, ...patch }));
}

function updateSelectedSummary(setState: ArticlesListSetState, articleId: number, patch: Partial<Article>) {
  setState((prev) => ({
    ...prev,
    selectedSummary: prev.selectedSummary?.id === articleId ? { ...prev.selectedSummary, ...patch } : prev.selectedSummary,
  }));
}

async function markAsRead(articleId: number, setState: ArticlesListSetState) {
  await fetch(`/api/articles/${articleId}/read`, POST_METHOD);
  setState((prev) => ({ ...prev, articles: prev.articles.map((article) => article.id === articleId ? { ...article, isRead: true } : article) }));
}

async function toggleReadArticle(article: Article, setState: ArticlesListSetState) {
  const isRead = !article.isRead;
  const endpoint = isRead ? `/api/articles/${article.id}/read` : `/api/articles/${article.id}/unread`;
  setState((prev) => ({ ...prev, articles: prev.articles.map((item) => item.id === article.id ? { ...item, isRead } : item) }));
  showFeedback(setState, isRead ? "Notizia segnata come letta" : "Notizia segnata come non letta", 3000);

  try {
    await fetch(endpoint, POST_METHOD);
  } catch (error) {
    console.error("Error toggling read status:", error);
  }
}

async function toggleSaveArticle(article: Article, setState: ArticlesListSetState) {
  if (!article.isSaved) {
    setState((prev) => ({ ...prev, articles: prev.articles.filter((item) => item.id !== article.id), selectedSummary: prev.selectedSummary?.id === article.id ? null : prev.selectedSummary }));
    showFeedback(setState, "Articolo salvato in 'Leggi dopo' e rimosso dal feed ??");
  } else {
    setState((prev) => ({ ...prev, articles: prev.articles.map((item) => item.id === article.id ? { ...item, isSaved: false } : item), selectedSummary: prev.selectedSummary?.id === article.id ? { ...prev.selectedSummary, isSaved: false } : prev.selectedSummary }));
    showFeedback(setState, "Articolo rimosso da 'Leggi dopo'");
  }

  try {
    await fetch(`/api/articles/${article.id}/toggle-save`, POST_METHOD);
  } catch (error) {
    console.error("Error toggling save status:", error);
  }
}

async function hideArticle(articleId: number, state: ArticlesListState, setState: ArticlesListSetState) {
  const article = state.articles.find((item) => item.id === articleId);
  if (!article) {
    return;
  }

  setState((prev) => ({ ...prev, articles: prev.articles.filter((item) => item.id !== articleId), recentlyHiddenQueue: [...prev.recentlyHiddenQueue, article] }));
  await fetch(`/api/articles/${articleId}/hide`, POST_METHOD);
  resetHiddenQueue(articleId, setState);
}

async function shareArticle(article: Article, setState: ArticlesListSetState, event?: MouseEvent) {
  event?.stopPropagation();
  await shareArticleHelper(article, (feedbackMessage) => updateState(setState, { feedbackMessage }));
}

async function regenerateSummary(articleId: number, setState: ArticlesListSetState) {
  updateState(setState, { isRegenerating: true, summaryError: null });
  try {
    const response = await fetch(`/api/articles/${articleId}/regenerate-summary`, POST_METHOD);
    if (!response.ok) {
      updateState(setState, { summaryError: "Impossibile generare il riassunto. Riprova pi� tardi." });
      return;
    }

    const data = await response.json();
    setState((prev) => ({ ...prev, articles: prev.articles.map((item) => item.id === articleId ? { ...item, aiSummary: data.aiSummary, aiTags: data.aiTags, aiRelevance: data.aiRelevance } : item) }));
    updateSelectedSummary(setState, articleId, { aiSummary: data.aiSummary, aiTags: data.aiTags, aiRelevance: data.aiRelevance });
  } catch (error) {
    console.error(error);
    updateState(setState, { summaryError: "Errore di connessione durante la generazione del riassunto." });
  } finally {
    updateState(setState, { isRegenerating: false });
  }
}

async function confirmGenerateSummary(state: ArticlesListState, setState: ArticlesListSetState) {
  if (state.pendingRegenerateId == null) {
    return;
  }

  const articleId = state.pendingRegenerateId;
  updateState(setState, { pendingRegenerateId: null });
  await regenerateSummary(articleId, setState);
}

function openSummary(article: Article, setState: ArticlesListSetState) {
  updateState(setState, { selectedSummary: article, summaryError: null });
  if (!article.aiSummary) {
    void regenerateSummary(article.id, setState);
  }
}

async function excludeSource(sourceName: string, state: ArticlesListState, setState: ArticlesListSetState) {
  try {
    await fetch("/api/interests", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ keyword: sourceName, type: "negative", weight: 1 }) });
    setState((prev) => ({ ...prev, articles: prev.articles.filter((article) => (article.source || "").toLowerCase().trim() !== sourceName.toLowerCase().trim()), infoModalArticle: null, selectedSummary: null }));
    showFeedback(setState, `Sorgente "${sourceName}" esclusa! Notizie rimosse dal feed.`, 5000);
    await fetchArticles(state, setState);
  } catch (error) {
    console.error(error);
    showFeedback(setState, `Errore durante l'esclusione della sorgente "${sourceName}".`, 5000);
  }
}

function isTagExcluded() {
  return false;
}

export function createArticlesListActions({ refs, setSourceClickCounts, state, setState }: ArticlesListActionsContext) {
  return {
    addTagFeed: (item: TagSearchResult) => addTagFeed(item, setState),
    confirmGenerateSummary: () => confirmGenerateSummary(state, setState),
    fetchArticles: (overrideSource?: string) => fetchArticles(state, setState, overrideSource),
    fetchSources: () => fetchSources(setState),
    handleCreateTransformerForSelectedSource: () => createTransformerForSelectedSource(state, setState),
    handleExcludeSource: (sourceName: string) => excludeSource(sourceName, state, setState),
    handleFetchFeeds: () => refreshArticles(state, setState),
    handleOpenSummary: (article: Article) => openSummary(article, setState),
    handleRemoveSelectedSource: () => removeSelectedSource(state, setState),
    handleSelectSource: (sourceName: string) => selectSource({ refs, sourceName, setSourceClickCounts, state, setState }),
    handleShareArticle: (article: Article, event?: MouseEvent) => shareArticle(article, setState, event),
    hideArticle: (articleId: number) => hideArticle(articleId, state, setState),
    isTagExcluded,
    markAsRead: (articleId: number) => markAsRead(articleId, setState),
    searchFeedsForTag: (tag: string) => searchFeedsForTag(tag, state, setState),
    setFeedbackMessage: (feedbackMessage: string | null) => updateState(setState, { feedbackMessage }),
    setFilter: (filter: string) => updateState(setState, { filter }),
    setInfoModalArticle: (infoModalArticle: Article | null) => updateState(setState, { infoModalArticle }),
    setIsRemoveSourceConfirmOpen: (isRemoveSourceConfirmOpen: boolean) => updateState(setState, { isRemoveSourceConfirmOpen }),
    setPendingRegenerateId: (pendingRegenerateId: number | null) => updateState(setState, { pendingRegenerateId }),
    setSelectedSummary: (selectedSummary: Article | null) => updateState(setState, { selectedSummary }),
    setSelectedTag: (selectedTag: string | null) => updateState(setState, { selectedTag }),
    setSort: (sort: string) => updateState(setState, { sort }),
    setTagModal: (tagModal: ArticlesListState["tagModal"]) => updateState(setState, { tagModal }),
    showMore: () => setState((prev) => ({ ...prev, visibleCount: prev.visibleCount + SHOW_MORE_BATCH })),
    toggleReadArticle: (article: Article) => toggleReadArticle(article, setState),
    toggleSaveArticle: (article: Article) => toggleSaveArticle(article, setState),
    undoHideArticleInline: (articleId: number) => undoHideArticleInline(articleId, state, setState),
  };
}

export {
  createSourceClickCountsState,
  fetchAllAddedFeeds,
  fetchArticles,
  fetchSources,
  resetArticlesListState,
  resetTagSearchForModal,
};
