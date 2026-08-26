import { Trash2 } from "lucide-react";
import type { Feed } from "../types";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";

type FeedListItemProps = {
  feed: Feed;
  onDelete: (url: string) => void;
};

export default function FeedListItem({ feed, onDelete }: FeedListItemProps) {
  const accent = getSourceAccent(feed.name);

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border border-transparent p-4 ${accent.bg}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/40 dark:bg-black/20" aria-hidden="true">
            <span className={`text-sm font-black ${accent.text}`}>{getSourceInitial(feed.name)}</span>
          </span>
          <p className={`truncate text-sm font-bold ${accent.text}`}>{feed.name}</p>
        </div>
        <p className={`mt-1 truncate text-sm opacity-75 ${accent.text}`}>{feed.url}</p>
      </div>
      <button type="button" onClick={() => onDelete(feed.url)} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
