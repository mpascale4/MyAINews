import { ExternalLink, RefreshCw } from "lucide-react";
import type { Article } from "../types";
import FormattedSummary from "./FormattedSummary";

type ArticleSummaryModalBodyProps = {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
};

export default function ArticleSummaryModalBody({ article, isRegenerating, summaryError }: ArticleSummaryModalBodyProps) {
  if (isRegenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
        <RefreshCw className="mb-4 h-8 w-8 animate-spin text-indigo-500" />
        <p className="text-sm font-medium">Generazione del riassunto in corso...</p>
      </div>
    );
  }

  if (summaryError) {
    return <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{summaryError}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">{article.title}</h3>
        <a href={article.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
          Apri articolo
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <FormattedSummary summaryText={article.aiSummary || ""} />
    </div>
  );
}
