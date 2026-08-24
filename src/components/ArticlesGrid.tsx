import { RefreshCw, Loader2, Trash2 } from "lucide-react";
import { Article } from "../types";
import ArticleCardItem from "./ArticleCardItem";
import HiddenArticleToast from "./HiddenArticleToast";

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
export default function ArticlesGrid({
  loading,
  articles,
  visibleCount,
  selectedSource,
  selectedTag,
  isCreatingTransformer,
  isRemovingSource,
  transformerFeedback,
  isLoadMoreLoading,
  recentlyHiddenQueue,
  sentinelRef,
  isTagExcluded,
  onTagClick,
  onOpenSummary,
  onToggleRead,
  onToggleSave,
  onHide,
  onShare,
  onOpenInfo,
  onUndoHide,
  onCreateTransformer,
  onRequestRemoveSource,
  onShowMore,
}: ArticlesGridProps) {
  if (loading) {
    return <div className="text-center text-slate-500 dark:text-slate-400 py-12">Caricamento notizie...</div>;
  }

  if (articles.length === 0) {
    return (
      <div className="text-center text-slate-500 dark:text-slate-400 py-12 px-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <p>Nessuna notizia trovata per i criteri selezionati.</p>

        {selectedSource && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={onCreateTransformer}
                disabled={isCreatingTransformer}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isCreatingTransformer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Prova a creare trasformatore per "{selectedSource}"
              </button>
              <button
                onClick={onRequestRemoveSource}
                disabled={isRemovingSource}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isRemovingSource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Rimuovi sorgente
              </button>
            </div>
            {transformerFeedback && (
              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 max-w-md mx-auto">{transformerFeedback}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick gesture hint for mobile/touch users */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500 px-1 py-0.5 select-none gap-2">
        <span className="flex items-center gap-1.5">
          <span>👉</span> <span><strong>Swipe a destra:</strong> apri AI summary</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span>👈</span> <span><strong>Swipe a sinistra:</strong> nascondi notizia</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.slice(0, visibleCount).map((article) => (
          <ArticleCardItem
            key={article.id}
            article={article}
            isTagExcluded={isTagExcluded}
            selectedTag={selectedTag}
            onTagClick={onTagClick}
            onOpenSummary={onOpenSummary}
            onToggleRead={onToggleRead}
            onToggleSave={onToggleSave}
            onHide={onHide}
            onShare={onShare}
            onOpenInfo={onOpenInfo}
          />
        ))}
      </div>

      {/* Undo-hide toasts, stacked bottom-left */}
      {recentlyHiddenQueue.length > 0 && (
        <div className="fixed bottom-4 left-4 z-[80] flex flex-col-reverse gap-2 pointer-events-none">
          {recentlyHiddenQueue.slice(-3).map((article) => (
            <div key={article.id} className="pointer-events-auto">
              <HiddenArticleToast article={article} onUndo={() => onUndoHide(article.id)} />
            </div>
          ))}
        </div>
      )}

      {articles.length > visibleCount && (
        <div
          ref={sentinelRef}
          className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 select-none animate-in fade-in duration-500"
        >
          <div className="relative flex items-center justify-center">
            <Loader2
              className={`w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400 ${isLoadMoreLoading ? "opacity-100" : "opacity-40"}`}
            />
            {!isLoadMoreLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-500">...</div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {isLoadMoreLoading ? "Caricamento in corso" : "Scorri per altre notizie"}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Mostrate {Math.min(visibleCount, articles.length)} di {articles.length}</span>
            </div>
          </div>

          {!isLoadMoreLoading && (
            <button
              onClick={onShowMore}
              className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              Mostra di più ora
            </button>
          )}
        </div>
      )}
    </div>
  );
}
