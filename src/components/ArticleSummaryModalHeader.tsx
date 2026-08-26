import { format } from "date-fns";
import { it } from "date-fns/locale";
import { X, Info, Share2, Bookmark, BookmarkCheck, Sparkles } from "lucide-react";
import { Article } from "../types";

interface HeaderActionsProps {
  article: Article;
  onToggleSave: (article: Article) => void;
  onOpenInfo: (article: Article) => void;
  onShare: (article: Article) => void;
  onClose: () => void;
}

function HeaderActions({ article, onToggleSave, onOpenInfo, onShare, onClose }: HeaderActionsProps) {
  return (
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
  );
}

interface ArticleSummaryModalHeaderProps {
  article: Article;
  onToggleSave: (article: Article) => void;
  onOpenInfo: (article: Article) => void;
  onShare: (article: Article) => void;
  onClose: () => void;
}

export default function ArticleSummaryModalHeader({
  article,
  onToggleSave,
  onOpenInfo,
  onShare,
  onClose,
}: ArticleSummaryModalHeaderProps) {
  return (
    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-900 shrink-0">
      <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold">
        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Summary Completo</h2>
          {(article.source || article.pubDate) && (
            <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
              {article.source}
              {article.source && article.pubDate ? " • " : ""}
              {article.pubDate ? format(new Date(article.pubDate), "d MMMM yyyy, HH:mm", { locale: it }) : ""}
            </p>
          )}
        </div>
      </div>
      <HeaderActions
        article={article}
        onToggleSave={onToggleSave}
        onOpenInfo={onOpenInfo}
        onShare={onShare}
        onClose={onClose}
      />
    </div>
  );
}
