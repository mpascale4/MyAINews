import { BarChart2 } from "lucide-react";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";

interface SourceCount {
  name: string;
  count: number;
}

function TopSourceRow({ source }: { source: SourceCount }) {
  const accent = getSourceAccent(source.name);
  return (
    <div className={`flex items-center justify-between p-2 pl-3 rounded-xl transition-colors ${accent.bg}`}>
      <span className="flex items-center gap-2 min-w-0">
        <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-white/40 dark:bg-black/20" aria-hidden="true">
          <span className={`text-sm font-black ${accent.text}`}>{getSourceInitial(source.name)}</span>
        </span>
        <span className={`font-medium text-sm truncate ${accent.text}`}>{source.name}</span>
      </span>
      <span className={`bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full text-sm font-semibold shrink-0 ${accent.text}`}>
        {source.count} letti
      </span>
    </div>
  );
}

function RemovedSources({ removedSourcesData }: { removedSourcesData: SourceCount[] }) {
  if (removedSourcesData.length === 0) return null;
  return (
    <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700/60">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
        Sorgenti non più presenti (rimosse o modificate)
      </p>
      <div className="space-y-2">
        {removedSourcesData.map((source, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-xl opacity-60">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">{source.name}</span>
            <span className="text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 px-3 py-1 rounded-full text-sm font-semibold">
              {source.count} letti
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardTopSourcesProps {
  topSources: SourceCount[];
  removedSourcesData: SourceCount[];
}

// Most-read sources ranking, plus a de-emphasized list of sources that were
// later removed or changed.
export default function DashboardTopSources({ topSources, removedSourcesData }: DashboardTopSourcesProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        Fonti più consultate
      </h3>

      <div className="space-y-4">
        {topSources.map((source, index) => (
          <TopSourceRow key={index} source={source} />
        ))}
        {topSources.length === 0 && (
          <p className="text-slate-400 dark:text-slate-500 text-sm italic">Non hai ancora letto abbastanza articoli.</p>
        )}
      </div>

      <RemovedSources removedSourcesData={removedSourcesData} />
    </div>
  );
}
