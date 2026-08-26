import React from "react";
import { ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { Feed } from "../types";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";

export interface TransformerTestResult {
  loading: boolean;
  createdTransformer?: boolean;
  validRss?: boolean;
  itemCount?: number;
  reason?: string;
}

interface FeedListItemProps {
  key?: React.Key;
  feed: Feed;
  transformerResult?: TransformerTestResult;
  onTest: (feedId: number) => void;
  onDelete: (feedId: number) => void;
}

interface FeedInfoProps {
  feed: Feed;
  accentText: string;
}

function FeedInfo({ feed, accentText }: FeedInfoProps) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-white/40 dark:bg-black/20" aria-hidden="true">
          <span className={`text-sm font-black ${accentText}`}>{getSourceInitial(feed.name)}</span>
        </span>
        <h4 className={`font-bold truncate text-sm sm:text-base ${accentText}`}>{feed.name}</h4>
      </div>
      <p className={`text-sm truncate mt-1 font-mono opacity-70 ${accentText}`}>{feed.url}</p>
    </div>
  );
}

interface FeedActionsProps {
  feedId: number;
  transformerLoading?: boolean;
  onTest: (feedId: number) => void;
  onDelete: (feedId: number) => void;
}

function FeedActions({ feedId, transformerLoading, onTest, onDelete }: FeedActionsProps) {
  return (
    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
      <button
        onClick={() => onTest(feedId)}
        disabled={transformerLoading}
        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
        title="Testa questa sorgente: verifica quanti articoli vengono trovati (creando un trasformatore ad-hoc se serve)"
      >
        {transformerLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Testa
      </button>
      <button
        onClick={() => onDelete(feedId)}
        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
        title="Elimina sorgente"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

interface TestResultBadgeProps {
  result: TransformerTestResult;
}

function TestResultBadge({ result }: TestResultBadgeProps) {
  const isSuccess = result.validRss || result.createdTransformer;
  const bgClass = isSuccess
    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
    : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300";

  return (
    <div className={`text-sm font-medium rounded-lg px-3 py-2 flex items-center gap-2 ${bgClass}`}>
      {result.validRss ? (
        <>✓ RSS valido, {result.itemCount} articoli trovati</>
      ) : result.createdTransformer ? (
        <>✓ Trasformatore creato, {result.itemCount} articoli estratti</>
      ) : (
        <>✗ {result.reason || "Impossibile creare un trasformatore per questa sorgente"}</>
      )}
    </div>
  );
}

// Single row in the configured-feeds list: name/url, "test" and "delete"
// actions, and the inline result of the last transformer test (if any).
export default function FeedListItem({ feed, transformerResult, onTest, onDelete }: FeedListItemProps) {
  const accent = getSourceAccent(feed.name);

  return (
    <div className={`flex flex-col gap-3 p-4 sm:px-5 sm:py-4 rounded-xl transition-all border border-transparent ${accent.bg}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <FeedInfo feed={feed} accentText={accent.text} />
        <FeedActions 
          feedId={feed.id} 
          transformerLoading={transformerResult?.loading} 
          onTest={onTest} 
          onDelete={onDelete} 
        />
      </div>
      {transformerResult && !transformerResult.loading && (
        <TestResultBadge result={transformerResult} />
      )}
    </div>
  );
}
