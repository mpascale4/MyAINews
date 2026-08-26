import { Article } from "../types";
import { EyeOff, Info, Bookmark, BookmarkCheck, RotateCcw } from "lucide-react";

function InfoButton({ article, onOpenInfo }: { article: Article; onOpenInfo: (article: Article) => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpenInfo(article);
      }}
      className="flex items-center gap-1 text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/70"
      title="Criteri di visualizzazione"
    >
      <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
      <span>Info</span>
    </button>
  );
}

function SaveButton({ article, onToggleSave }: { article: Article; onToggleSave: (article: Article) => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleSave(article);
      }}
      className={`flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg border ${
        article.isSaved
          ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border-amber-200/70 dark:border-amber-800/70"
          : "text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200/70 dark:border-slate-700/70"
      }`}
      title={article.isSaved ? "Rimuovi da Leggi dopo" : "Salva in Leggi dopo"}
    >
      {article.isSaved ? (
        <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500 dark:fill-amber-400" />
      ) : (
        <Bookmark className="w-3.5 h-3.5" />
      )}
      <span>Leggi dopo</span>
    </button>
  );
}

function HideButton({ article, onHide }: { article: Article; onHide: (articleId: number) => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onHide(article.id);
      }}
      className="flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 px-2 py-1 rounded-lg border border-rose-200/70 dark:border-rose-800/70"
      title="Nascondi notizia"
    >
      <EyeOff className="w-3.5 h-3.5" />
      <span>Nascondi</span>
    </button>
  );
}

function RestoreButton({
  article,
  onRestore,
  isRestoring,
}: {
  article: Article;
  onRestore: (articleId: number) => void;
  isRestoring?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onRestore(article.id);
      }}
      disabled={isRestoring}
      className="flex items-center gap-1 text-sm text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 font-medium transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 px-2 py-1 rounded-lg border border-indigo-200/70 dark:border-indigo-800/70 disabled:opacity-50"
      title="Ripristina notizia"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      <span>Ripristina</span>
    </button>
  );
}

interface ActionButtonsProps {
  article: Article;
  onOpenInfo?: (article: Article) => void;
  onToggleSave?: (article: Article) => void;
  onHide: (articleId: number) => void;
  onRestore?: (articleId: number) => void;
  isRestoring?: boolean;
}

export function ActionButtons({ article, onOpenInfo, onToggleSave, onHide, onRestore, isRestoring }: ActionButtonsProps) {
  return (
    <div className="flex items-center gap-1.5 mb-2 shrink-0">
      {onOpenInfo && <InfoButton article={article} onOpenInfo={onOpenInfo} />}
      {onToggleSave && <SaveButton article={article} onToggleSave={onToggleSave} />}
      {!onRestore && <HideButton article={article} onHide={onHide} />}
      {onRestore && <RestoreButton article={article} onRestore={onRestore} isRestoring={isRestoring} />}
    </div>
  );
}
