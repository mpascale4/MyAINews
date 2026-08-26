import { Article } from "../types";
import { EmptyState, ArticlesContent } from "./ArticlesGridSections";

interface ArticlesGridProps {
  loading: boolean;
  articles: Article[];
  visibleCount: number;
  selectedSource: string;
  selectedTag: string | null;
  isCreatingTransformer: boolean;
  isRemovingSource: boolean;
  transformerFeedback: string | null;
  isLoadMoreLoading: boolean;
  recentlyHiddenQueue: Article[];
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  isTagExcluded: (tag: string) => boolean;
  onTagClick: (tag: string) => void;
  onOpenSummary: (article: Article) => void;
  onToggleRead: (article: Article) => void;
  onToggleSave: (article: Article) => void;
  onHide: (id: number) => void;
  onShare: (article: Article, e?: React.MouseEvent) => void;
  onOpenInfo: (article: Article) => void;
  onUndoHide: (id: number) => void | Promise<void>;
  onCreateTransformer: () => void;
  onRequestRemoveSource: () => void;
  onShowMore: () => void;
}

// Main article list: empty state (with transformer/remove-source actions),
// the card grid itself, undo-hide toasts, and the infinite-scroll sentinel.
export default function ArticlesGrid(props: ArticlesGridProps) {
  if (props.loading) {
    return <div className="text-center text-slate-500 dark:text-slate-400 py-12">Caricamento notizie...</div>;
  }

  if (props.articles.length === 0) {
    return <EmptyState {...props} />;
  }

  return <ArticlesContent {...props} />;
}
