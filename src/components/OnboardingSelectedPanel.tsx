import { Rss, X, HelpCircle } from "lucide-react";
import { SuggestedFeed } from "../hooks/useOnboardingFeeds";

interface SelectedFeedCardProps {
  feed: SuggestedFeed;
  onRemove: (url: string) => void;
}

function SelectedFeedCard({ feed, onRemove }: SelectedFeedCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-sm shadow-3xs flex flex-col gap-1 relative group">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{feed.name}</div>
        <button
          type="button"
          onClick={() => onRemove(feed.url)}
          className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 absolute top-2 right-2 transition-all"
          title="Rimuovi"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {feed.reason && <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{feed.reason}</p>}
      <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-slate-100 dark:border-slate-800/60">
        <span className="px-1.5 py-0.5 rounded text-sm font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
          {feed.category || "Generale"}
        </span>
      </div>
    </div>
  );
}

interface OnboardingSelectedPanelProps {
  suggestedFeeds: SuggestedFeed[];
  onRemoveFeed: (url: string) => void;
}

// Right column: list of feeds picked so far, plus a short usage hint.
export function OnboardingSelectedPanel({ suggestedFeeds, onRemoveFeed }: OnboardingSelectedPanelProps) {
  return (
    <div className="w-full md:w-80 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40 p-6 space-y-5 overflow-y-auto shrink-0">
      <div className="space-y-3 flex-1 flex flex-col min-h-0">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
          <Rss className="w-4 h-4 text-indigo-500" />
          Fonti Selezionate ({suggestedFeeds.length})
        </h3>

        <div className="space-y-2 overflow-y-auto flex-1 pr-1">
          {suggestedFeeds.map((feed, idx) => (
            <SelectedFeedCard key={idx} feed={feed} onRemove={onRemoveFeed} />
          ))}
          {suggestedFeeds.length === 0 && (
            <div className="text-sm text-slate-400 dark:text-slate-500 italic p-1">
              Le fonti che aggiungi dai risultati della ricerca compariranno qui.
            </div>
          )}
        </div>
      </div>

      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-3.5 border border-indigo-100 dark:border-indigo-900/60 text-sm text-slate-500 dark:text-slate-400 leading-relaxed shrink-0">
        <HelpCircle className="w-4 h-4 text-indigo-500 inline mr-1 mb-0.5" />
        Cerca per argomento o città a sinistra e premi <strong>Aggiungi</strong> sulle fonti che ti interessano. Quando hai
        terminato, premi su <strong>Inizia a Leggere</strong> in alto.
      </div>
    </div>
  );
}
