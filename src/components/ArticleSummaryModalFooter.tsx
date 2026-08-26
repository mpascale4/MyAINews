import { RefreshCw } from "lucide-react";
import type { Article } from "../types";

type ArticleSummaryModalFooterProps = {
  article: Article;
  isRegenerating: boolean;
  onRegenerate: (article: Article) => void;
  onClose: () => void;
};

export default function ArticleSummaryModalFooter({ article, isRegenerating, onRegenerate, onClose }: ArticleSummaryModalFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50">
      <button
        type="button"
        onClick={() => onRegenerate(article)}
        disabled={isRegenerating}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} />
        Rigenera
      </button>
      <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">Chiudi</button>
    </div>
  );
}
