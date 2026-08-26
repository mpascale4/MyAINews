import { Info, X } from "lucide-react";
import { useSwipeToDismiss } from "@mp/app-kit";
import type { Article } from "../types";

type ArticleInfoModalProps = {
  article: Article;
  onClose: () => void;
};

export default function ArticleInfoModal({ article, onClose }: ArticleInfoModalProps) {
  // Swipe-down dismiss is a shortcut only: the header "X" button remains
  // the primary, always-visible way to dismiss this modal.
  const { offset, isDragging, handlers } = useSwipeToDismiss({ onDismiss: onClose });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        style={{ transform: `translateY(${Math.max(0, offset)}px)`, transition: isDragging ? "none" : "transform 0.2s ease" }}
        onClick={(event) => event.stopPropagation()}
        {...handlers}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-base font-bold text-indigo-600 dark:text-indigo-400">
            <Info className="h-5 w-5" />
            Dettagli articolo
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-semibold uppercase tracking-wider text-slate-400">Titolo</p>
            <p className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{article.title}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Sorgente</p>
              <p className="font-bold text-slate-900 dark:text-slate-100">{article.source}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Data</p>
              <p className="font-bold text-slate-900 dark:text-slate-100">{article.pubDate || "Non disponibile"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
