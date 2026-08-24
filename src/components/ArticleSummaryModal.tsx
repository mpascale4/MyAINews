import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  X,
  ExternalLink,
  Sparkles,
  Info,
  Share2,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  ShieldMinus,
} from "lucide-react";
import { Article } from "../types";
import FormattedSummary from "./FormattedSummary";

interface ArticleSummaryModalProps {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  isTagExcluded: (tag: string) => boolean;
  onClose: () => void;
  onToggleSave: (article: Article) => void;
  onOpenInfo: (article: Article) => void;
  onShare: (article: Article) => void;
  onMarkAsRead: (id: number) => void;
  onRegenerate: (id: number) => void;
  onTagClick: (tag: string) => void;
}

// Full-screen "AI Summary" modal shown when opening an article's AI-generated summary.
export default function ArticleSummaryModal({
  article,
  isRegenerating,
  summaryError,
  isTagExcluded,
  onClose,
  onToggleSave,
  onOpenInfo,
  onShare,
  onMarkAsRead,
  onRegenerate,
  onTagClick,
}: ArticleSummaryModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-900 shrink-0">
          <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Summary Completo</h2>
              {(article.source || article.pubDate) && (
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {article.source}
                  {article.source && article.pubDate ? " • " : ""}
                  {article.pubDate ? format(new Date(article.pubDate), "d MMMM yyyy, HH:mm", { locale: it }) : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleSave(article)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                article.isSaved
                  ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400"
                  : "text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
              title={article.isSaved ? "Rimuovi da Leggi dopo" : "Salva in Leggi dopo"}
            >
              {article.isSaved ? (
                <BookmarkCheck className="w-5 h-5 fill-amber-500 dark:fill-amber-400" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => onOpenInfo(article)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Criteri di visualizzazione"
            >
              <Info className="w-5 h-5" />
            </button>
            <button
              onClick={() => onShare(article)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Condividi riassunto e notizia"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl leading-snug">
              {article.title}
            </h3>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onMarkAsRead(article.id)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
            >
              <span>Apri link remoto</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {isRegenerating ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p className="font-medium text-sm">Generazione quadro completo della notizia con l'AI...</p>
            </div>
          ) : summaryError ? (
            <div className="py-6 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-100 dark:border-rose-800/40 mb-4 text-center">
              <p className="font-medium text-sm">{summaryError}</p>
            </div>
          ) : (
            <>
              {article.aiTags && article.aiTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  {article.aiTags.map((tag, idx) => {
                    const isExcluded = isTagExcluded(tag);
                    return (
                      <button
                        key={idx}
                        onClick={() => onTagClick(tag)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                          isExcluded
                            ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 line-through"
                            : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100"
                        }`}
                        title="Clicca per gestire o escludere questo tag"
                      >
                        {isExcluded ? (
                          <ShieldMinus className="w-3 h-3 text-rose-500" />
                        ) : (
                          <span className="opacity-60 text-[10px]">#</span>
                        )}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="max-w-none">
                <FormattedSummary summaryText={article.aiSummary} />
              </div>
            </>
          )}
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {article.aiRelevance > 0 && (
              <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-700">
                Rilevanza: {article.aiRelevance}/100
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onToggleSave(article)}
              className={`flex items-center gap-1.5 px-3.5 py-2 border font-medium rounded-xl text-sm transition-colors cursor-pointer ${
                article.isSaved
                  ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
              title={article.isSaved ? "Rimuovi dai salvati" : "Salva in Leggi dopo"}
            >
              {article.isSaved ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
                  <span>Salvato</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>Leggi dopo</span>
                </>
              )}
            </button>
            <button
              onClick={() => onShare(article)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors cursor-pointer"
              title="Condividi notizia e riassunto"
            >
              <Share2 className="w-4 h-4" />
              <span>Condividi</span>
            </button>
            <button
              onClick={() => onRegenerate(article.id)}
              disabled={isRegenerating}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer"
              title="Rigenera con il nuovo modello approfondito"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
              Rigenera
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Chiudi
            </button>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                onMarkAsRead(article.id);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs"
            >
              Fonte originale <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
