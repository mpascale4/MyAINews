import { RefreshCw } from "lucide-react";
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
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        title="Apri l'articolo originale"
        className="block rounded-lg text-lg font-bold leading-snug text-slate-900 transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-100 dark:hover:text-indigo-400"
      >
        {article.title}
      </a>
      <FormattedSummary summaryText={article.aiSummary || ""} />
    </div>
  );
}
