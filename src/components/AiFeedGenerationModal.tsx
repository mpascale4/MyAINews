import { Sparkles, X, ShieldCheck, RefreshCw, CheckCircle2, Globe } from "lucide-react";
import { SuggestedFeed } from "../types";

export interface AiOverlayData {
  isOpen: boolean;
  newCount: number;
  resetCount: number;
  manualCount: number;
  suggestedFeeds: (SuggestedFeed & { isNew?: boolean })[];
}

interface AiFeedGenerationModalProps {
  data: AiOverlayData;
  totalFeedsCount: number;
  onClose: () => void;
}

interface ModalHeaderProps {
  newCount: number;
  onClose: () => void;
}

function ModalHeader({ newCount, onClose }: ModalHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 p-6 text-white flex items-start justify-between shrink-0">
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
          <Sparkles className="w-6 h-6 text-amber-300" />
        </div>
        <div>
          <h3 className="text-xl font-bold">Rigenerazione Sorgenti AI</h3>
          <p className="text-indigo-100 text-sm mt-0.5">
            {newCount > 0
              ? `✨ ${newCount} nuov${newCount === 1 ? "a sorgente aggiunta" : "e sorgenti aggiunte"} dall'AI`
              : "Fonti AI aggiornate e allineate"}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
        title="Chiudi"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

interface StatsSummaryProps {
  manualCount: number;
  resetCount: number;
  newCount: number;
}

function StatsSummary({ manualCount, resetCount, newCount }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          <div className="text-sm text-amber-800 dark:text-amber-300 font-semibold">{manualCount} Manuali</div>
          <div className="text-sm text-amber-600/90 dark:text-amber-400/80">Conservate intatte</div>
        </div>
      </div>

      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-3 rounded-xl flex items-center gap-2.5">
        <RefreshCw className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
        <div>
          <div className="text-sm text-rose-800 dark:text-rose-300 font-semibold">{resetCount} Azzerate</div>
          <div className="text-sm text-rose-600/90 dark:text-rose-400/80">Vecchie fonti auto</div>
        </div>
      </div>

      <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl flex items-center gap-2.5">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <div className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold">{newCount} Nuove Fonti</div>
          <div className="text-sm text-emerald-600/90 dark:text-emerald-400/80">Generate da AI</div>
        </div>
      </div>
    </div>
  );
}

interface FeedCardProps {
  feed: SuggestedFeed & { isNew?: boolean };
  index: number;
}

function FeedCard({ feed, index }: FeedCardProps) {
  return (
    <div
      key={index}
      className="p-4 rounded-2xl border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-xs"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{feed.name}</span>
          {feed.category && (
            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-md uppercase tracking-wider">
              {feed.category}
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded-full shrink-0">
          <CheckCircle2 className="w-3 h-3" /> Attivo
        </span>
      </div>

      {feed.reason && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">{feed.reason}</p>
      )}

      <div className="flex items-center gap-1.5 mt-2.5 text-sm text-indigo-600 dark:text-indigo-400 font-mono truncate">
        <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
        <span className="truncate">{feed.url}</span>
      </div>
    </div>
  );
}

interface ModalFooterProps {
  totalFeedsCount: number;
  onClose: () => void;
}

function ModalFooter({ totalFeedsCount, onClose }: ModalFooterProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
      <span className="text-sm text-slate-500 dark:text-slate-400">
        Totale fonti attive: <strong className="font-semibold text-slate-800 dark:text-slate-200">{totalFeedsCount}</strong>
      </span>
      <button
        onClick={onClose}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-xs"
      >
        Ho Capito
      </button>
    </div>
  );
}

// Modal shown after an AI-driven feed regeneration, summarizing which feeds
// were kept manual, reset, or newly added, plus the list of active AI feeds.
export default function AiFeedGenerationModal({ data, totalFeedsCount, onClose }: AiFeedGenerationModalProps) {
  if (!data.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        <ModalHeader newCount={data.newCount} onClose={onClose} />

        <div className="p-6 overflow-y-auto space-y-4">
          <StatsSummary 
            manualCount={data.manualCount} 
            resetCount={data.resetCount} 
            newCount={data.newCount} 
          />

          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
              Sorgenti Selezionate dall'AI
            </h4>
            {data.suggestedFeeds.map((feed, index) => (
              <FeedCard key={index} feed={feed} index={index} />
            ))}
          </div>
        </div>

        <ModalFooter totalFeedsCount={totalFeedsCount} onClose={onClose} />
      </div>
    </div>
  );
}
