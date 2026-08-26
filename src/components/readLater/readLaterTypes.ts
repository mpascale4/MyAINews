import { Article, Interest } from "../../types";

export type StatusFilter = "all" | "unread" | "read";

export type ReadLaterState = {
  articles: Article[];
  loading: boolean;
  searchQuery: string;
  statusFilter: StatusFilter;
  selectedTag: string | null;
  selectedSummary: Article | null;
  isRegenerating: boolean;
  pendingRegenerateId: number | null;
  summaryError: string | null;
  feedbackMessage: string | null;
  recentlyHiddenIds: Record<number, boolean>;
  infoModalArticle: Article | null;
  interestsList: Interest[];
};

export const INITIAL_READ_LATER_STATE: ReadLaterState = {
  articles: [],
  loading: true,
  searchQuery: "",
  statusFilter: "all",
  selectedTag: null,
  selectedSummary: null,
  isRegenerating: false,
  pendingRegenerateId: null,
  summaryError: null,
  feedbackMessage: null,
  recentlyHiddenIds: {},
  infoModalArticle: null,
  interestsList: [],
};

export const FEEDBACK_TIMEOUT_MS = 3000;
export const SOURCE_FEEDBACK_TIMEOUT_MS = 5000;
export const HIDE_PLACEHOLDER_TIMEOUT_MS = 6000;
