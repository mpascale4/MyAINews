import { useSwipeToDismiss } from "@mp/app-kit";
import { Check, Rss, X } from "lucide-react";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";
import type { Feed } from "../types";

interface SourceSelectorOverlayProps {
  feeds: Feed[];
  selectedSource: string;
  onSelectSource: (name: string) => void;
  onClose: () => void;
}

interface SourceListItemProps {
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  initial?: string;
  accent?: { bg: string; text: string };
}

function SourceListItem({ label, isSelected, onSelect, initial, accent }: SourceListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors ${
        isSelected
          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${accent ? `${accent.bg} ${accent.text}` : "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"}`}
        aria-hidden="true"
      >
        {initial || <Rss className="h-4 w-4" />}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}

// Vertical-list overlay for choosing which source to filter articles by,
// opened via the hamburger-style menu button (SourceSelectorMenuButton).
export default function SourceSelectorOverlay({ feeds, selectedSource, onSelectSource, onClose }: SourceSelectorOverlayProps) {
  // Swipe-down dismiss is a shortcut only: the header "X" button remains
  // the primary, always-visible way to close this overlay.
  const { offset, isDragging, handlers } = useSwipeToDismiss({ onDismiss: onClose });

  const selectAndClose = (name: string) => {
    onSelectSource(name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        style={{ transform: `translateY(${Math.max(0, offset)}px)`, transition: isDragging ? "none" : "transform 0.2s ease" }}
        onClick={(event) => event.stopPropagation()}
        {...handlers}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Sorgenti</p>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div role="list" className="space-y-2 overflow-y-auto p-4">
          <div role="listitem">
            <SourceListItem label="Tutte le sorgenti" isSelected={selectedSource === ""} onSelect={() => selectAndClose("")} />
          </div>
          {feeds.map((feed) => (
            <div role="listitem" key={feed.url}>
              <SourceListItem
                label={feed.name}
                isSelected={selectedSource === feed.name}
                onSelect={() => selectAndClose(selectedSource === feed.name ? "" : feed.name)}
                initial={getSourceInitial(feed.name)}
                accent={getSourceAccent(feed.name)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
