import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ExternalLink, Share2, X } from "lucide-react";
import type { Article } from "../types";

type ArticleSummaryModalHeaderProps = {
  article: Article;
  onShare: (article: Article) => void;
  onClose: () => void;
};

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "d MMMM yyyy, HH:mm", { locale: it });
}

export default function ArticleSummaryModalHeader({ article, onShare, onClose }: ArticleSummaryModalHeaderProps) {
  return (
    <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Riassunto AI</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {article.source}
          {article.pubDate ? ` • ${formatDate(article.pubDate)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <a href={article.link} target="_blank" rel="noopener noreferrer" className="rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-300">
          <ExternalLink className="h-5 w-5" />
        </a>
        <button type="button" onClick={() => onShare(article)} className="cursor-pointer rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800 dark:hover:text-indigo-300">
          <Share2 className="h-5 w-5" />
        </button>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
