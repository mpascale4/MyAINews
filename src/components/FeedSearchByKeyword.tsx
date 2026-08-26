import type { FormEvent } from "react";
import { Check, Compass, Loader2, Plus, ShieldCheck } from "lucide-react";
import type { SuggestedFeed } from "../types";
import TestFeedOverlay from "./TestFeedOverlay";
import { useTestFeed } from "./testFeedHooks";

type FeedSearchByKeywordProps = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  loading: boolean;
  feedback: string | null;
  results: SuggestedFeed[];
  existingFeedUrls: Set<string>;
  onSearch: (event: FormEvent) => void;
  onAdd: (feed: SuggestedFeed) => void;
};

type FeedSearchResultItemProps = {
  feed: SuggestedFeed;
  alreadyAdded: boolean;
  onAdd: (feed: SuggestedFeed) => void;
  onTest: (feed: SuggestedFeed) => void;
};

function FeedSearchResultItem({ feed, alreadyAdded, onAdd, onTest }: FeedSearchResultItemProps) {
  return (
    <div role="listitem" className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-xs dark:border-indigo-900/60 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{feed.name}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{feed.reason}</p>
          <p className="mt-1 truncate text-sm text-slate-400">{feed.url}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => onTest(feed)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Testa
          </button>
          <button type="button" disabled={alreadyAdded} onClick={() => onAdd(feed)} className={`inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${alreadyAdded ? "" : "cursor-pointer"}`}>
            {alreadyAdded ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
            {alreadyAdded ? "Aggiunto" : "Aggiungi"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FeedSearchByKeyword(props: FeedSearchByKeywordProps) {
  const testFeedState = useTestFeed();

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-800/60 dark:bg-indigo-950/30">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
        <Compass className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        Cerca feed con AI
      </h3>
      <form onSubmit={props.onSearch} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input type="text" value={props.keyword} onChange={(event) => props.onKeywordChange(event.target.value)} placeholder="Es. economia, sport, Milano" className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        <button type="submit" disabled={props.loading || !props.keyword.trim()} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />}
          Cerca
        </button>
      </form>
      {props.feedback ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{props.feedback}</p> : null}
      <div role="list" className="mt-4 grid grid-cols-1 gap-3">
        {props.results.map((feed) => (
          <FeedSearchResultItem key={feed.url} feed={feed} alreadyAdded={props.existingFeedUrls.has(feed.url.toLowerCase())} onAdd={props.onAdd} onTest={(item) => void testFeedState.runTest(item)} />
        ))}
      </div>
      {testFeedState.testedFeed ? (
        <TestFeedOverlay
          feed={testFeedState.testedFeed}
          loading={testFeedState.testResults[testFeedState.testedFeed.url]?.loading ?? true}
          articles={testFeedState.testResults[testFeedState.testedFeed.url]?.articles}
          usedScraper={testFeedState.testResults[testFeedState.testedFeed.url]?.usedScraper}
          error={testFeedState.testResults[testFeedState.testedFeed.url]?.error}
          onClose={() => testFeedState.setTestedFeed(null)}
          onFindAlternative={() => void testFeedState.runFindAlternative()}
          findingAlternative={testFeedState.findingAlternative}
        />
      ) : null}
    </section>
  );
}
