import { Feed } from "../../types";
import type { AiOverlayData } from "../AiFeedGenerationModal";

export type SuggestedFeed = {
  url: string;
  name: string;
  reason?: string;
  category?: string;
};

export type ImportFeedCandidate = {
  url?: string;
  name?: string;
  addedVia?: string;
};

export type ExtractedInterest = {
  keyword: string;
  type: "positive" | "negative";
  weight: number;
};

export type InterviewMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SuggestedFeedTestResult = {
  loading: boolean;
  isValidRss?: boolean;
  isScrapeableHtml?: boolean;
  transformerCreated?: boolean;
  itemCount?: number;
  error?: string;
};

export type TransformerResult = {
  loading: boolean;
  createdTransformer?: boolean;
  validRss?: boolean;
  itemCount?: number;
  reason?: string;
};

export type SettingsPanelState = {
  feeds: Feed[];
  isGenerating: boolean;
  aiOverlayData: AiOverlayData;
  pushThreshold: number;
  pushSubscribed: boolean;
  pushLoading: boolean;
  pushStatusMessage: string | null;
  interviewOpen: boolean;
  interviewMessages: InterviewMessage[];
  interviewInput: string;
  interviewLoading: boolean;
  pendingExtracted: ExtractedInterest[];
  pendingSuggestedFeeds: SuggestedFeed[];
  feedSearchKeyword: string;
  feedSearchResults: Array<{ name: string; url: string; reason: string; category: string }>;
  feedSearchLoading: boolean;
  feedSearchFeedback: string | null;
  suggestedFeedTestResults: Record<string, SuggestedFeedTestResult>;
  transformerResults: Record<number, TransformerResult>;
  isResetConfirmOpen: boolean;
  isResetting: boolean;
  isRegenerateConfirmOpen: boolean;
  importFeedback: string | null;
};

export const INITIAL_INTERVIEW_MESSAGE: InterviewMessage = {
  role: "assistant",
  content: "Ciao! Sono il tuo assistente IA per profilazione e ricerca feed. Dimmi quali argomenti ti appassionano (es. tecnologia, geopolitica, cinema, Formula 1) o quali notizie cerchi in una città/regione specifica (es. Lucca, Toscana, Milano). Cercherò subito sia i tuoi interessi sia le migliori sorgenti RSS per te!"
};

export const INITIAL_SETTINGS_PANEL_STATE: SettingsPanelState = {
  feeds: [],
  isGenerating: false,
  aiOverlayData: { isOpen: false, newCount: 0, resetCount: 0, manualCount: 0, suggestedFeeds: [] },
  pushThreshold: 80,
  pushSubscribed: false,
  pushLoading: false,
  pushStatusMessage: null,
  interviewOpen: false,
  interviewMessages: [INITIAL_INTERVIEW_MESSAGE],
  interviewInput: "",
  interviewLoading: false,
  pendingExtracted: [],
  pendingSuggestedFeeds: [],
  feedSearchKeyword: "",
  feedSearchResults: [],
  feedSearchLoading: false,
  feedSearchFeedback: null,
  suggestedFeedTestResults: {},
  transformerResults: {},
  isResetConfirmOpen: false,
  isResetting: false,
  isRegenerateConfirmOpen: false,
  importFeedback: null,
};
