import type { FormEvent } from "react";
import { Compass, Loader2, Plus, Search } from "lucide-react";
import type { SuggestedFeed } from "../types";

type OnboardingSearchColumnProps = {
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
  manualName: string;
  setManualName: (value: string) => void;
  manualUrl: string;
  setManualUrl: (value: string) => void;
  searchResults: SuggestedFeed[];
  searchLoading: boolean;
  searchError: string | null;
  onSearch: (event: FormEvent) => void;
  onAddFeed: (feed: SuggestedFeed) => void;
  onAddManualFeed: () => void;
};

function SearchResults({ results, onAddFeed }: { results: SuggestedFeed[]; onAddFeed: (feed: SuggestedFeed) => void }) {
  if (results.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">I risultati compariranno qui.</p>;
  }

  return (
    <div role="list" className="grid grid-cols-1 gap-3">
      {results.map((feed) => (
        <div key={feed.url} role="listitem" className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{feed.name}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{feed.reason}</p>
              <p className="mt-1 truncate text-sm text-slate-400">{feed.url}</p>
            </div>
            <button
              type="button"
              onClick={() => onAddFeed(feed)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Aggiungi
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OnboardingSearchColumn(props: OnboardingSearchColumnProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-white p-6 dark:bg-slate-900">
      <div className="space-y-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <Compass className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Cerca con AI
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inserisci un argomento o una città.</p>
        </div>
        <form onSubmit={props.onSearch} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={props.searchKeyword}
            onChange={(event) => props.setSearchKeyword(event.target.value)}
            placeholder="Es. tecnologia, Roma, Formula 1"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={props.searchLoading || !props.searchKeyword.trim()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {props.searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Cerca
          </button>
        </form>
        {props.searchError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{props.searchError}</p> : null}
        <SearchResults results={props.searchResults} onAddFeed={props.onAddFeed} />
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Aggiungi manualmente</h3>
          <input type="text" value={props.manualName} onChange={(event) => props.setManualName(event.target.value)} placeholder="Nome sorgente" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <input type="url" value={props.manualUrl} onChange={(event) => props.setManualUrl(event.target.value)} placeholder="https://example.com/feed.xml" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          <button type="button" onClick={props.onAddManualFeed} disabled={!props.manualUrl.trim()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
            <Plus className="h-4 w-4" />
            Aggiungi feed
          </button>
        </div>
      </div>
    </div>
  );
}
