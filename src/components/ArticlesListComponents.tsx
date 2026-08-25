import React from "react";
import { RefreshCw, CheckCircle, X, Filter, Tag } from "lucide-react";

// Pull-to-refresh indicator component
export function PullIndicator({ pullDistance }: { pullDistance: number }) {
  return (
    <div 
      className="flex justify-center items-center overflow-hidden transition-all duration-200"
      style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
    >
      <div className="flex flex-col items-center justify-center text-indigo-500">
        <RefreshCw 
          className={`w-6 h-6 transition-transform ${pullDistance > 60 ? 'animate-spin' : ''}`} 
          style={{ transform: `rotate(${pullDistance * 3}deg)` }} 
        />
      </div>
    </div>
  );
}

// Feedback toast component
export function FeedbackToast({ 
  message, 
  onClose 
}: { 
  message: string; 
  onClose: () => void 
}) {
  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[100] flex items-center justify-between gap-3 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-11/12 sm:w-auto">
      <div className="flex items-center gap-2.5">
        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
        <span className="text-xs sm:text-sm">{message}</span>
      </div>
      <button 
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Filter controls component
export function FilterControls({
  filter,
  sort,
  loading,
  onFilterChange,
  onSortChange,
  onRefresh
}: {
  filter: string;
  sort: string;
  loading: boolean;
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
  onRefresh: () => void;
}) {
  const FILTERS = ["All", "Today"];

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
      {/* Tutte / Oggi + Ordinamento */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <Filter className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filter === f 
                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs" 
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {f === "All" ? "Tutte" : "Oggi"}
          </button>
        ))}

        {/* Ordinamento (Più recenti) posizionato subito dopo Oggi */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-colors"
        >
          <option value="Date">Più recenti</option>
          <option value="AI Relevance">Rilevanza AI</option>
        </select>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
        title="Aggiorna notizie"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Aggiorna
      </button>
    </div>
  );
}

// Active tag filter indicator
export function ActiveTagIndicator({ 
  tag, 
  onClear 
}: { 
  tag: string; 
  onClear: () => void 
}) {
  return (
    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 px-4 py-2.5 rounded-2xl text-sm font-medium shadow-xs">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span>Filtro attivo per tag: <strong className="font-bold text-indigo-700 dark:text-indigo-300">#{tag}</strong></span>
      </div>
      <button
        onClick={onClear}
        className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
      >
        <X className="w-3.5 h-3.5" /> Mostra tutte
      </button>
    </div>
  );
}

