import type { Dispatch, SetStateAction } from "react";
import type { MutableRefObject } from "react";
import { registerSourceNames } from "../../lib/sourceStyle";
import {
  FEEDBACK_TIMEOUT_MS,
  SOURCE_HIDE_TIMEOUT_MS,
  TRANSFORMER_TIMEOUT_MS,
  type ArticlesListState,
  type FeedListEntry,
  type TagSearchResult,
  UI_FETCH_TIMEOUT_MS,
} from "./articlesListTypes";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const POST_METHOD = { method: "POST" } as const;

type ArticlesListSetState = Dispatch<SetStateAction<ArticlesListState>>;

function updateState(setState: ArticlesListSetState, patch: Partial<ArticlesListState>) {
  setState((prev) => ({ ...prev, ...patch }));
}

export function showFeedback(setState: ArticlesListSetState, message: string, timeout = FEEDBACK_TIMEOUT_MS) {
  updateState(setState, { feedbackMessage: message });
  setTimeout(() => updateState(setState, { feedbackMessage: null }), timeout);
}

export async function fetchAllAddedFeeds(setState: ArticlesListSetState) {
  try {
    const response = await fetch("/api/feeds");
    const feeds = await response.json();
    const allAddedFeeds = feeds.reduce((map: Record<string, boolean>, feed: FeedListEntry) => ({ ...map, [feed.url]: true }), {});
    updateState(setState, { allAddedFeeds });
  } catch (error) {
    console.error(error);
  }
}

export async function fetchSources(setState: ArticlesListSetState) {
  try {
    const response = await fetch("/api/feeds");
    if (!response.ok) {
      return;
    }

    const feedsData = await response.json();
    const configuredFeeds = Array.isArray(feedsData) ? feedsData : [];
    registerSourceNames(configuredFeeds.map((feed: FeedListEntry) => feed.name));
    updateState(setState, { configuredFeeds });
  } catch (error) {
    console.error("Error fetching sources:", error);
  }
}

export async function fetchArticles(state: ArticlesListState, setState: ArticlesListSetState, overrideSource?: string) {
  updateState(setState, { loading: true });
  const effectiveSource = overrideSource !== undefined ? overrideSource : state.selectedSource;
  const tagParam = state.selectedTag ? `&tag=${encodeURIComponent(state.selectedTag)}` : "";
  const sourceParam = effectiveSource ? `&source=${encodeURIComponent(effectiveSource)}` : "";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UI_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/articles?filter=${state.filter}&sort=${state.sort}${tagParam}${sourceParam}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const articles = await response.json();
    updateState(setState, { articles: Array.isArray(articles) ? articles : [], visibleCount: 10 });
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error("Error loading articles:", error);
    updateState(setState, { articles: [] });
    if (error instanceof Error && error.name === "AbortError") {
      updateState(setState, { feedbackMessage: "Il caricamento sta impiegando troppo tempo. Riprova tra poco." });
    }
  } finally {
    updateState(setState, { loading: false });
  }
}

export async function searchFeedsForTag(tag: string, state: ArticlesListState, setState: ArticlesListSetState) {
  if (state.tagSearchLoading) {
    return;
  }

  updateState(setState, { tagSearchLoading: true, tagSearchResults: [], tagSearchFeedback: null });
  try {
    const response = await fetch("/api/feeds/ai-search", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ keyword: tag }) });
    if (response.ok) {
      const data = await response.json();
      updateState(setState, { tagSearchResults: data.feeds || [] });
    } else {
      updateState(setState, { tagSearchFeedback: "Impossibile trovare feed per questo tag al momento." });
    }
  } catch (error) {
    console.error("Error searching feeds for tag:", error);
    updateState(setState, { tagSearchFeedback: "Errore di connessione durante la ricerca." });
  } finally {
    updateState(setState, { tagSearchLoading: false });
  }
}

export async function addTagFeed(item: TagSearchResult, setState: ArticlesListSetState) {
  try {
    const response = await fetch("/api/feeds", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ url: item.url, name: item.name, isManual: true }) });
    if (!response.ok) {
      updateState(setState, { tagSearchFeedback: "Impossibile aggiungere la sorgente." });
      return;
    }

    setState((prev) => ({ ...prev, allAddedFeeds: { ...prev.allAddedFeeds, [item.url]: true }, tagSearchFeedback: `Sorgente "${item.name}" aggiunta!` }));
    void fetch("/api/fetch", POST_METHOD);
  } catch (error) {
    console.error("Error adding tag feed:", error);
    updateState(setState, { tagSearchFeedback: "Errore durante l'aggiunta della sorgente." });
  }
}

export async function createTransformerForSelectedSource(state: ArticlesListState, setState: ArticlesListSetState) {
  const feed = state.configuredFeeds.find((item) => item.name === state.selectedSource);
  if (!feed) {
    return;
  }

  updateState(setState, { isCreatingTransformer: true, transformerFeedback: null });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TRANSFORMER_TIMEOUT_MS);
  try {
    const response = await fetch(`/api/feeds/${feed.id}/create-transformer`, { method: "POST", signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    const transformerFeedback = data.validRss ? `L'RSS risulta valido (${data.itemCount} articoli): riprovo a caricare le notizie.` : data.createdTransformer ? `Trasformatore creato! Trovati ${data.itemCount} articoli. Aggiorno la lista...` : data.reason || "Non � stato possibile creare un trasformatore per questa sorgente.";
    updateState(setState, { transformerFeedback });
    await fetchArticles(state, setState);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    console.error("Error creating transformer:", error);
    updateState(setState, {
      transformerFeedback: error instanceof Error && error.name === "AbortError"
        ? "L'operazione sta impiegando troppo tempo (probabile limite di quota AI raggiunto). Riprova tra qualche minuto."
        : "Errore durante il tentativo di creazione del trasformatore. Riprova."
    });
  } finally {
    updateState(setState, { isCreatingTransformer: false });
  }
}

export async function removeSelectedSource(state: ArticlesListState, setState: ArticlesListSetState) {
  const feed = state.configuredFeeds.find((item) => item.name === state.selectedSource);
  if (!feed) {
    return;
  }

  updateState(setState, { isRemoveSourceConfirmOpen: false, isRemovingSource: true });
  try {
    const response = await fetch(`/api/feeds/${feed.id}`, { method: "DELETE" });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    setState((prev) => ({ ...prev, configuredFeeds: prev.configuredFeeds.filter((item) => item.id !== feed.id), selectedSource: "" }));
    await fetchArticles({ ...state, selectedSource: "" }, setState);
  } catch (error) {
    console.error("Error removing source:", error);
    updateState(setState, { transformerFeedback: "Errore durante la rimozione della sorgente. Riprova." });
  } finally {
    updateState(setState, { isRemovingSource: false });
  }
}

function updateSourceClickCounts(sourceName: string, setSourceClickCounts: Dispatch<SetStateAction<Record<string, number>>>) {
  setSourceClickCounts((prev) => {
    const next = { ...prev, [sourceName]: (prev[sourceName] || 0) + 1 };
    try {
      localStorage.setItem("source_click_counts", JSON.stringify(next));
    } catch (error) {
      console.error("Error saving source click counts:", error);
    }
    return next;
  });
}

export function selectSource(params: {
  refs: { skipNextSourceFetchRef: MutableRefObject<boolean> };
  sourceName: string;
  setSourceClickCounts: Dispatch<SetStateAction<Record<string, number>>>;
  state: ArticlesListState;
  setState: ArticlesListSetState;
}) {
  const { refs, sourceName, setSourceClickCounts, state, setState } = params;
  if (sourceName) {
    const feed = state.configuredFeeds.find((item) => item.name === sourceName);
    console.log(`[Sorgente selezionata] "${sourceName}" -> feed URL: ${feed?.url || "N/D"} | articoli richiesti a: /api/articles?source=${encodeURIComponent(sourceName)}`);
    updateSourceClickCounts(sourceName, setSourceClickCounts);
    updateState(setState, { filter: "All", selectedTag: null, sort: "Date" });
  }

  refs.skipNextSourceFetchRef.current = true;
  updateState(setState, { loading: true, selectedSource: sourceName, transformerFeedback: null });
  void fetch("/api/fetch", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(sourceName ? { feedName: sourceName } : {}) })
    .catch((error) => console.error("Error refreshing source:", error))
    .finally(() => fetchArticles({ ...state, selectedSource: sourceName }, setState, sourceName));
}

export async function refreshArticles(state: ArticlesListState, setState: ArticlesListSetState) {
  updateState(setState, { loading: true });
  await fetch("/api/fetch", POST_METHOD);
  await fetchArticles(state, setState);
}

export async function undoHideArticleInline(articleId: number, state: ArticlesListState, setState: ArticlesListSetState) {
  const article = state.recentlyHiddenQueue.find((item) => item.id === articleId);
  setState((prev) => ({ ...prev, recentlyHiddenQueue: prev.recentlyHiddenQueue.filter((item) => item.id !== articleId), articles: article ? [article, ...prev.articles] : prev.articles }));
  await fetch(`/api/articles/${articleId}/unhide`, POST_METHOD);
}

export function createSourceClickCountsState() {
  try {
    const saved = localStorage.getItem("source_click_counts");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

export function resetTagSearchForModal(setState: ArticlesListSetState) {
  updateState(setState, { tagSearchFeedback: null, tagSearchLoading: false, tagSearchResults: [] });
}

export function resetHiddenQueue(articleId: number, setState: ArticlesListSetState) {
  setTimeout(() => {
    setState((prev) => ({ ...prev, recentlyHiddenQueue: prev.recentlyHiddenQueue.filter((item) => item.id !== articleId) }));
  }, SOURCE_HIDE_TIMEOUT_MS);
}

export function resetArticlesListState() {
  return {
    ...stateTemplate,
  };
}

const stateTemplate = {
  articles: [],
  filter: "All",
  sort: "Date",
  selectedTag: null,
  selectedSource: "",
  configuredFeeds: [],
  loading: true,
  selectedSummary: null,
  isRegenerating: false,
  summaryError: null,
  pendingRegenerateId: null,
  visibleCount: 12,
  isLoadMoreLoading: false,
  isCreatingTransformer: false,
  transformerFeedback: null,
  tagModal: null,
  tagSearchLoading: false,
  tagSearchResults: [],
  tagSearchFeedback: null,
  allAddedFeeds: {},
  feedbackMessage: null,
  recentlyHiddenQueue: [],
  infoModalArticle: null,
  isRemovingSource: false,
  isRemoveSourceConfirmOpen: false,
} satisfies ArticlesListState;
