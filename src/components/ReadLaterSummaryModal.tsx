import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  X,
  ExternalLink,
  Info,
  Share2,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
} from "lucide-react";
import { Article } from "../types";
import FormattedSummary from "./FormattedSummary";

interface ReadLaterSummaryModalProps {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  onClose: () => void;
  onToggleSave: (article: Article) => void;
  onOpenInfo: (article: Article) => void;
  onShare: (article: Article) => void;
  onMarkAsRead: (article: Article) => void;
  onRegenerate: (id: number) => void;
}

interface ModalHeaderProps {
  article: Article;
  onToggleSave: (article: Article) => void;
  onOpenInfo: (article: Article) => void;
  onShare: (article: Article) => void;
  onClose: () => void;
}

function ModalHeader({ article, onToggleSave, onOpenInfo, onShare, onClose }: ModalHeaderProps) {
  return (
    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-slate-50 dark:from-amber-950/40 dark:via-indigo-950/20 dark:to-slate-900 shrink-0">
      <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold">
        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
          <Bookmark className="w-4 h-4 fill-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Summary • Leggi Dopo</h2>
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
          className="p-1.5 text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 rounded-full transition-colors cursor-pointer"
          title="Rimuovi da Leggi dopo"
        >
          <BookmarkCheck className="w-5 h-5 fill-amber-500 dark:fill-amber-400" />
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
          title="Condividi"
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
  );
}

interface ModalContentProps {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  onMarkAsRead: (article: Article) => void;
}

function ModalContent({ article, isRegenerating, summaryError, onMarkAsRead }: ModalContentProps) {
  return (
    <div className="p-6 overflow-y-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl leading-snug">{article.title}</h3>
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMarkAsRead(article)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
        >
          <span>Apri link remoto</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {isRegenerating ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
          <p className="font-medium text-sm">Generazione quadro completo con l'AI...</p>
        </div>
      ) : summaryError ? (
        <div className="py-6 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-100 dark:border-rose-800/40 mb-4 text-center">
          <p className="font-medium text-sm">{summaryError}</p>
        </div>
      ) : (
        <>
          {article.aiTags && article.aiTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              {article.aiTags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                >
                  <span className="opacity-60 text-[10px]">#</span>
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
          <div className="max-w-none">
            <FormattedSummary summaryText={article.aiSummary} />
          </div>
        </>
      )}
    </div>
  );
}

interface FooterActionsProps {
  article: Article;
  isRegenerating: boolean;
  onToggleSave: (article: Article) => void;
  onShare: (article: Article) => void;
  onRegenerate: (id: number) => void;
  onClose: () => void;
  onMarkAsRead: (article: Article) => void;
}

function FooterActions({
  article,
  isRegenerating,
  onToggleSave,
  onShare,
  onRegenerate,
  onClose,
  onMarkAsRead,
}: FooterActionsProps) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => onToggleSave(article)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium rounded-xl text-sm transition-colors cursor-pointer"
        title="Rimuovi dai salvati"
      >
        <BookmarkCheck className="w-4 h-4 fill-amber-500" />
        <span>Salvato</span>
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
      >
        <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
        Rigenera
      </button>
      <button onClick={onClose} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors cursor-pointer">
        Chiudi
      </button>
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => { onMarkAsRead(article); onClose(); }}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs"
      >
        Fonte originale <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}

interface ModalFooterProps {
  article: Article;
  isRegenerating: boolean;
  onToggleSave: (article: Article) => void;
  onShare: (article: Article) => void;
  onRegenerate: (id: number) => void;
  onMarkAsRead: (article: Article) => void;
  onClose: () => void;
}

function ModalFooter({
  article,
  isRegenerating,
  onToggleSave,
  onShare,
  onRegenerate,
  onMarkAsRead,
  onClose,
}: ModalFooterProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2">
        {article.aiRelevance > 0 && (
          <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-700">
            Rilevanza: {article.aiRelevance}/100
          </span>
        )}
      </div>
      <FooterActions
        article={article}
        isRegenerating={isRegenerating}
        onToggleSave={onToggleSave}
        onShare={onShare}
        onRegenerate={onRegenerate}
        onClose={onClose}
        onMarkAsRead={onMarkAsRead}
      />
    </div>
  );
}

// Full "AI Summary" modal for the Read Later page: header (save/info/share/close),
// tags + formatted summary body, and a footer with save/share/regenerate/close actions.
export default function ReadLaterSummaryModal({
  article,
  isRegenerating,
  summaryError,
  onClose,
  onToggleSave,
  onOpenInfo,
  onShare,
  onMarkAsRead,
  onRegenerate,
}: ReadLaterSummaryModalProps) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader
          article={article}
          onToggleSave={onToggleSave}
          onOpenInfo={onOpenInfo}
          onShare={onShare}
          onClose={onClose}
        />
        <ModalContent
          article={article}
          isRegenerating={isRegenerating}
          summaryError={summaryError}
          onMarkAsRead={onMarkAsRead}
        />
        <ModalFooter
          article={article}
          isRegenerating={isRegenerating}
          onToggleSave={onToggleSave}
          onShare={onShare}
          onRegenerate={onRegenerate}
          onMarkAsRead={onMarkAsRead}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
