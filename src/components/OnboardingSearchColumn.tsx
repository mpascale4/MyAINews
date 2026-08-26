import { FormEvent } from "react";
import { Send, Loader2, Plus, Compass } from "lucide-react";
import { SuggestedFeed } from "../hooks/useOnboardingFeeds";

interface SearchResultItemProps {
  item: SuggestedFeed;
  onAdd: (feed: SuggestedFeed) => void;
}

function SearchResultItem({ item, onAdd }: SearchResultItemProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
          {item.category && (
            <span className="px-2 py-0.5 rounded text-sm font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {item.category}
            </span>
          )}
        </div>
        {item.reason && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.reason}</p>}
        <p className="text-sm text-slate-400 font-mono truncate mt-1">{item.url}</p>
      </div>
      <button
        type="button"
        onClick={() => onAdd(item)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 self-end sm:self-center shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" /> Aggiungi
      </button>
    </div>
  );
}

interface OnboardingSearchColumnProps {
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
  searchResults: SuggestedFeed[];
  searchLoading: boolean;
  searchError: string | null;
  onSearch: (e: FormEvent) => void;
  onAddFeed: (feed: SuggestedFeed) => void;
}

// Left column: keyword search form, error state, and the list of suggested
// feeds matching the search.
type SearchFormProps = Pick<
  OnboardingSearchColumnProps,
  "searchKeyword" | "setSearchKeyword" | "searchLoading" | "onSearch"
>;

function SearchForm({ searchKeyword, setSearchKeyword, searchLoading, onSearch }: SearchFormProps) {
  return (
    <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3 shrink-0">
      <input
        type="text"
        value={searchKeyword}
        onChange={(e) => setSearchKeyword(e.target.value)}
        placeholder="Es. Lucca, tecnologia, Formula 1..."
        className="flex-1 min-w-0 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs transition-all"
        disabled={searchLoading}
      />
      <button
        type="submit"
        disabled={searchLoading || !searchKeyword.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
      >
        {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        <span>Cerca</span>
      </button>
    </form>
  );
}

type SearchResultsListProps = Pick<
  OnboardingSearchColumnProps,
  "searchResults" | "searchLoading" | "searchError" | "onAddFeed"
>;

function SearchResultsList({ searchResults, searchLoading, searchError, onAddFeed }: SearchResultsListProps) {
  return (
    <div className="mt-4 space-y-2.5">
      {searchResults.map((item, idx) => (
        <SearchResultItem key={idx} item={item} onAdd={onAddFeed} />
      ))}
      {!searchLoading && searchResults.length === 0 && !searchError && (
        <div className="text-sm text-slate-400 dark:text-slate-500 italic p-1">
          I risultati della ricerca (nome e URL delle fonti trovate) compariranno qui.
        </div>
      )}
    </div>
  );
}

export function OnboardingSearchColumn(props: OnboardingSearchColumnProps) {
  const { searchError } = props;
  return (
    <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
        <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        Cerca fonti per argomento o città (es. Lucca, tecnologia, sport)
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Inserisci un termine e troverò subito gli URL delle migliori fonti di notizie corrispondenti.
      </p>

      <SearchForm {...props} />

      {searchError && (
        <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl text-sm font-medium">
          {searchError}
        </div>
      )}

      <SearchResultsList {...props} />
    </div>
  );
}
