import { Rss } from "lucide-react";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";
import type { Feed } from "../types";

interface SourceSelectorBarProps {
  feeds: Feed[];
  selectedSource: string;
  onSelectSource: (name: string) => void;
}

interface AllSourcesButtonProps {
  isSelected: boolean;
  onSelectSource: (name: string) => void;
}

function AllSourcesButton({ isSelected, onSelectSource }: AllSourcesButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onSelectSource("")}
      className={`px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
        isSelected
          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40"
          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
      }`}
      title="Mostra tutte le sorgenti"
      aria-pressed={isSelected}
    >
      <Rss className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Tutte le sorgenti</span>
    </button>
  );
}

interface SourcePillButtonProps {
  feed: Feed;
  isSelected: boolean;
  onSelectSource: (name: string) => void;
}

function SourcePillButton({ feed, isSelected, onSelectSource }: SourcePillButtonProps) {
  const accent = getSourceAccent(feed.name);

  return (
    <button
      type="button"
      onClick={() => onSelectSource(isSelected ? "" : feed.name)}
      className={`px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
        isSelected
          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40"
          : `${accent.bg} ${accent.text} border-transparent hover:opacity-80`
      }`}
      title={`Filtra per ${feed.name}`}
      aria-pressed={isSelected}
    >
      <span
        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-sm font-bold ${isSelected ? "bg-white/20" : "bg-white/40 dark:bg-black/20"}`}
        aria-hidden="true"
      >
        {getSourceInitial(feed.name)}
      </span>
      <span>{feed.name}</span>
    </button>
  );
}

// Horizontal scrollable pill bar to filter the articles feed by a single configured source.
export default function SourceSelectorBar({ feeds, selectedSource, onSelectSource }: SourceSelectorBarProps) {
  if (feeds.length <= 1) return null;

  return (
    <div role="list" aria-label="Filtra per sorgente" className="flex items-center gap-2 overflow-x-auto pb-1">
      <div role="listitem">
        <AllSourcesButton isSelected={selectedSource === ""} onSelectSource={onSelectSource} />
      </div>
      {feeds.map((feed) => (
        <div role="listitem" key={feed.url}>
          <SourcePillButton feed={feed} isSelected={selectedSource === feed.name} onSelectSource={onSelectSource} />
        </div>
      ))}
    </div>
  );
}
