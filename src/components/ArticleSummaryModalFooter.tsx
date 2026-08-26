import { ExternalLink, Share2, Bookmark, BookmarkCheck, RefreshCw } from "lucide-react";
import { Article } from "../types";

interface SaveButtonProps {
  article: Article;
  onToggleSave: (article: Article) => void;
}

function SaveButton({ article, onToggleSave }: SaveButtonProps) {
  return (
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
  );
}

interface RelevanceBadgeProps {
  relevance: number;
}

function RelevanceBadge({ relevance }: RelevanceBadgeProps) {
  if (relevance <= 0) return null;
  return (
    <span className="text-sm font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-700">
      Rilevanza: {relevance}/100
    </span>
  );
}

interface ArticleSummaryModalFooterProps {
  article: Article;
  isRegenerating: boolean;
  onToggleSave: (article: Article) => void;
  onShare: (article: Article) => void;
  onRegenerate: (id: number) => void;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
}

interface FooterActionButtonsProps {
  article: Article;
  isRegenerating: boolean;
  onShare: (article: Article) => void;
  onRegenerate: (id: number) => void;
  onClose: () => void;
  onMarkAsRead: (id: number) => void;
}

function FooterActionButtons({ article, isRegenerating, onShare, onRegenerate, onClose, onMarkAsRead }: FooterActionButtonsProps) {
  return (
    <>
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
    </>
  );
}

export default function ArticleSummaryModalFooter({
  article,
  isRegenerating,
  onToggleSave,
  onShare,
  onRegenerate,
  onClose,
  onMarkAsRead,
}: ArticleSummaryModalFooterProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2">
        <RelevanceBadge relevance={article.aiRelevance} />
      </div>
      <div className="flex items-center gap-2.5">
        <SaveButton article={article} onToggleSave={onToggleSave} />
        <FooterActionButtons
          article={article}
          isRegenerating={isRegenerating}
          onShare={onShare}
          onRegenerate={onRegenerate}
          onClose={onClose}
          onMarkAsRead={onMarkAsRead}
        />
      </div>
    </div>
  );
}
