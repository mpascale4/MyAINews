import { Rss } from "lucide-react";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";

interface ConfiguredFeed {
  id: number;
  name: string;
  url: string;
  addedVia?: string | null;
}

interface SourceSelectorBarProps {
  configuredFeeds: ConfiguredFeed[];
  selectedSource: string;
  onSelectSource: (name: string) => void;
}

// Flat pill list of all configured sources, plus an "all sources" option.
export default function SourceSelectorBar({
  configuredFeeds,
  selectedSource,
  onSelectSource,
}: SourceSelectorBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-3.5 px-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
      <button
        onClick={() => onSelectSource("")}
        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
          selectedSource === ""
            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40"
            : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
        }`}
        title="Mostra tutte le sorgenti"
      >
        <Rss className="w-3.5 h-3.5 shrink-0" />
        <span>Tutte le sorgenti</span>
      </button>
      {configuredFeeds.map((feed) => {
        const isSelected = selectedSource === feed.name;
        const accent = getSourceAccent(feed.name);
        return (
          <button
            key={feed.name}
            onClick={() => onSelectSource(isSelected ? "" : feed.name)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-start gap-1.5 border shrink-0 ${
              isSelected
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40"
                : `${accent.bg} ${accent.text} border-transparent hover:opacity-80`
            }`}
            title={feed.addedVia ? `Filtra per ${feed.name} — aggiunta tramite: ${feed.addedVia}` : `Filtra per ${feed.name}`}
          >
            <span
              className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-white/20" : "bg-white/40 dark:bg-black/20"}`}
              aria-hidden="true"
            >
              <span className={`text-[9px] font-black ${isSelected ? "text-white" : accent.text}`}>
                {getSourceInitial(feed.name)}
              </span>
            </span>
            <span className="flex flex-col items-start gap-0">
              {feed.addedVia && (
                <span
                  className={`text-[9px] font-normal opacity-70 truncate max-w-[160px] leading-none ${
                    isSelected ? "text-indigo-100" : accent.text
                  }`}
                >
                  {feed.addedVia}
                </span>
              )}
              <span className="truncate max-w-[160px]">{feed.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
