import { Article } from "../../types";

export type FeedConfig = {
  id: number;
  name: string;
  url: string;
  addedVia?: string | null;
};

export type FeedListEntry = {
  id?: number;
  url: string;
  name: string;
};

export type TagModalState = { tag: string } | null;
export type TagSearchResult = { name: string; url: string; reason: string; category: string };

export type ArticlesListState = {
  articles: Article[];
  filter: string;
  sort: string;
  selectedTag: string | null;
  selectedSource: string;
  configuredFeeds: FeedConfig[];
  loading: boolean;
  selectedSummary: Article | null;
  isRegenerating: boolean;
  summaryError: string | null;
  pendingRegenerateId: number | null;
  visibleCount: number;
  isLoadMoreLoading: boolean;
  isCreatingTransformer: boolean;
  transformerFeedback: string | null;
  tagModal: TagModalState;
  tagSearchLoading: boolean;
  tagSearchResults: TagSearchResult[];
  tagSearchFeedback: string | null;
  allAddedFeeds: Record<string, boolean>;
  feedbackMessage: string | null;
  recentlyHiddenQueue: Article[];
  infoModalArticle: Article | null;
  isRemovingSource: boolean;
  isRemoveSourceConfirmOpen: boolean;
};

export const INITIAL_ARTICLES_LIST_STATE: ArticlesListState = {
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
};

export const LOAD_MORE_BATCH = 12;
export const SHOW_MORE_BATCH = 24;
export const LOAD_MORE_DELAY_MS = 400;
export const UI_FETCH_TIMEOUT_MS = 15000;
export const TRANSFORMER_TIMEOUT_MS = 90000;
export const SOURCE_HIDE_TIMEOUT_MS = 3000;
export const FEEDBACK_TIMEOUT_MS = 3500;
