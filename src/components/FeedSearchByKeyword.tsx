import React from "react";
import { Compass, Loader2, Sparkles, CheckCircle2, ShieldCheck, Plus } from "lucide-react";

export interface SuggestedFeedItem {
  name: string;
  url: string;
  reason: string;
  category: string;
}

export interface SuggestedFeedTestResult {
  loading: boolean;
  isValidRss?: boolean;
  isScrapeableHtml?: boolean;
  transformerCreated?: boolean;
  itemCount?: number;
  error?: string;
}

interface TestResultMessageProps {
  testState: SuggestedFeedTestResult;
}

function TestResultMessage({ testState }: TestResultMessageProps) {
  const isSuccess = (testState.isValidRss && (testState.itemCount || 0) > 0) || testState.isScrapeableHtml;
  
  return (
    <div
      className={`text-sm font-medium rounded-lg px-3 py-2 flex items-center gap-2 ${
        isSuccess
          ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
          : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300"
      }`}
    >
      {testState.isValidRss && (testState.itemCount || 0) > 0 ? (
        <>✓ RSS valido, {testState.itemCount} articoli trovati</>
      ) : testState.isScrapeableHtml ? (
        <>✓ Pagina HTML analizzabile: trasformatore ad-hoc creato con successo ({testState.itemCount} articoli trovati)</>
      ) : (
        <>✗ {testState.error || "Sorgente non raggiungibile o vuota: impossibile creare un trasformatore"}</>
      )}
    </div>
  );
}

interface FeedResultItemProps {
  key?: React.Key;
  item: SuggestedFeedItem;
  alreadyAdded: boolean;
  testState: SuggestedFeedTestResult | undefined;
  onTest: (url: string) => void;
  onAdd: (item: SuggestedFeedItem) => void;
}

function canAddFeed(alreadyAdded: boolean, testState: SuggestedFeedTestResult | undefined): boolean {
  return !alreadyAdded && !(testState && !testState.loading && !testState.isValidRss && !testState.isScrapeableHtml);
}

interface FeedItemHeaderProps {
  item: SuggestedFeedItem;
  alreadyAdded: boolean;
}

function FeedItemHeader({ item, alreadyAdded }: FeedItemHeaderProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
      <span className="px-2 py-0.5 rounded text-sm font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
        {item.category}
      </span>
      {alreadyAdded && (
        <span className="px-2 py-0.5 rounded text-sm font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Già aggiunta
        </span>
      )}
    </div>
  );
}

function FeedResultItem({ item, alreadyAdded, testState, onTest, onAdd }: FeedResultItemProps) {
  const canAdd = canAddFeed(alreadyAdded, testState);
  
  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-3 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <FeedItemHeader item={item} alreadyAdded={alreadyAdded} />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.reason}</p>
          <p className="text-sm text-slate-400 font-mono truncate mt-1">{item.url}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onTest(item.url)}
            disabled={testState?.loading}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
          >
            {testState?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Testa
          </button>
          {canAdd && (
            <button
              type="button"
              onClick={() => onAdd(item)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Aggiungi
            </button>
          )}
        </div>
      </div>
      {testState && !testState.loading && <TestResultMessage testState={testState} />}
        </div>
      );
}

interface SearchFormProps {
  keyword: string;
  loading: boolean;
  onKeywordChange: (value: string) => void;
  onSearch: (e: React.FormEvent) => void;
}

function SearchForm({ keyword, loading, onKeywordChange, onSearch }: SearchFormProps) {
  return (
    <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={keyword}
        onChange={(e) => onKeywordChange(e.target.value)}
        placeholder="Inserisci parola chiave (es. Lucca)..."
        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      />
      <button
        type="submit"
        disabled={loading || !keyword.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
        Cerca con AI
      </button>
    </form>
  );
}

interface FeedSearchByKeywordProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  loading: boolean;
  feedback: string | null;
  results: SuggestedFeedItem[];
  existingFeedUrls: Set<string>;
  normalizeFeedUrl: (url: string) => string;
  testResults: Record<string, SuggestedFeedTestResult>;
  onSearch: (e: React.FormEvent) => void;
  onTest: (url: string) => void;
  onAdd: (item: SuggestedFeedItem) => void;
}

interface ResultsListProps {
  results: SuggestedFeedItem[];
  existingFeedUrls: Set<string>;
  normalizeFeedUrl: (url: string) => string;
  testResults: Record<string, SuggestedFeedTestResult>;
  onTest: (url: string) => void;
  onAdd: (item: SuggestedFeedItem) => void;
}

function ResultsList({ results, existingFeedUrls, normalizeFeedUrl, testResults, onTest, onAdd }: ResultsListProps) {
  return (
    <div className="mt-4 space-y-2.5">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
        Risultati Trovati dall'AI (Clicca per aggiungere come manuale):
      </span>
      <div className="space-y-2">
        {results.map((item, idx) => (
          <FeedResultItem
            key={idx}
            item={item}
            alreadyAdded={existingFeedUrls.has(normalizeFeedUrl(item.url))}
            testState={testResults[item.url]}
            onTest={onTest}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

export default function FeedSearchByKeyword({
  keyword,
  onKeywordChange,
  loading,
  feedback,
  results,
  existingFeedUrls,
  normalizeFeedUrl,
  testResults,
  onSearch,
  onTest,
  onAdd,
}: FeedSearchByKeywordProps) {
  return (
    <div className="mb-8 p-5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
        <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        Cerca Feed con AI per Parola Chiave o Località (es. Lucca)
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Inserisci un argomento o una città (es. "Lucca", "Formula 1", "Economia") e l'AI cercherà i migliori feed RSS e Google News da aggiungere come sorgenti manuali protette.
      </p>
      <SearchForm keyword={keyword} loading={loading} onKeywordChange={onKeywordChange} onSearch={onSearch} />
      {feedback && (
        <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
      {results.length > 0 && (
        <ResultsList
          results={results}
          existingFeedUrls={existingFeedUrls}
          normalizeFeedUrl={normalizeFeedUrl}
          testResults={testResults}
          onTest={onTest}
          onAdd={onAdd}
        />
      )}
    </div>
  );
}
