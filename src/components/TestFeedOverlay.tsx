import { Loader2, Search, X } from "lucide-react";
import type { Article, Feed } from "../types";

type TestFeedOverlayProps = {
  feed: Feed;
  loading: boolean;
  articles?: Article[];
  usedScraper?: boolean;
  error?: string;
  onClose: () => void;
  onFindAlternative: () => void;
  findingAlternative: boolean;
};

function formatDate(pubDate: string | null) {
  if (!pubDate) {
    return "Data non disponibile";
  }

  const parsed = new Date(pubDate);
  return Number.isNaN(parsed.getTime()) ? pubDate : parsed.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
}

function TestFeedResults({ articles, usedScraper }: { articles: Article[]; usedScraper?: boolean }) {
  return (
    <div className="mt-4 space-y-3">
      {usedScraper ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Nessun RSS valido: articoli estratti con un trasformatore automatico.</p> : null}
      <div role="list" className="space-y-2">
        {articles.map((article) => (
          <div key={article.guid} role="listitem" className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{article.title}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatDate(article.pubDate)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TestFeedOverlay({ feed, loading, articles, usedScraper, error, onClose, onFindAlternative, findingAlternative }: TestFeedOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Test sorgente</p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{feed.name}</p>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verifica in corso...
          </div>
        ) : error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
        ) : (
          <TestFeedResults articles={articles || []} usedScraper={usedScraper} />
        )}
        {!loading ? (
          <button
            type="button"
            onClick={onFindAlternative}
            disabled={findingAlternative}
            className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800/60 dark:bg-indigo-950/30 dark:text-indigo-300"
          >
            {findingAlternative ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Trova alternativa
          </button>
        ) : null}
      </div>
    </div>
  );
}
