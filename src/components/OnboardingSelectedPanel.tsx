import { HelpCircle, Rss, X } from "lucide-react";
import type { Feed } from "../types";

type OnboardingSelectedPanelProps = {
  selectedFeeds: Feed[];
  onRemoveFeed: (url: string) => void;
};

export function OnboardingSelectedPanel({ selectedFeeds, onRemoveFeed }: OnboardingSelectedPanelProps) {
  return (
    <aside className="w-full shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950/40 md:w-80">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Rss className="h-4 w-4 text-indigo-500" />
        Feed selezionati ({selectedFeeds.length})
      </h3>
      <div role="list" className="mt-4 grid grid-cols-1 gap-3">
        {selectedFeeds.map((feed) => (
          <div key={feed.url} role="listitem" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{feed.name}</p>
                <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{feed.url}</p>
              </div>
              <button type="button" onClick={() => onRemoveFeed(feed.url)} className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-slate-600 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-slate-300">
        <HelpCircle className="mr-1 inline h-4 w-4 text-indigo-500" />
        Se non scegli nulla useremo un piccolo set iniziale predefinito.
      </div>
    </aside>
  );
}
