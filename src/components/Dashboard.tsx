import { useState, useEffect } from "react";
import { BarChart2, Sparkles, TrendingUp } from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid 
} from "recharts";
import { getSourceAccent, getSourceInitial, registerSourceNames } from "../lib/sourceStyle";

interface WeeklyTopic {
  topic: string;
  count: number;
  avgRelevance: number;
}

interface DashboardStats {
  readCount: number;
  unreadCount: number;
  topSources: { name: string; count: number }[];
  removedSources?: { name: string; count: number }[];
  weeklyTopics?: WeeklyTopic[];
  removedWeeklyTopics?: WeeklyTopic[];
}

type DashboardSource = {
  name: string;
};

const BAR_COLORS = [
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#3b82f6", // blue-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#f97316", // orange-500
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && typeof data === 'object' && 'readCount' in data) {
          const topSources = Array.isArray(data.topSources) ? data.topSources : [];
          const removedSources = Array.isArray(data.removedSources) ? data.removedSources : [];
          registerSourceNames([...topSources, ...removedSources].map((s: DashboardSource) => s.name));
          setStats({
            readCount: Number(data.readCount) || 0,
            unreadCount: Number(data.unreadCount) || 0,
            topSources,
            removedSources,
            weeklyTopics: Array.isArray(data.weeklyTopics) ? data.weeklyTopics : [],
            removedWeeklyTopics: Array.isArray(data.removedWeeklyTopics) ? data.removedWeeklyTopics : []
          });
        } else {
          setStats({ readCount: 0, unreadCount: 0, topSources: [], removedSources: [], weeklyTopics: [], removedWeeklyTopics: [] });
        }
      })
      .catch(err => {
        console.error("Error loading dashboard stats:", err);
        setStats({ readCount: 0, unreadCount: 0, topSources: [], removedSources: [], weeklyTopics: [], removedWeeklyTopics: [] });
      });
  }, []);

  if (!stats) return <div className="text-slate-500 dark:text-slate-400 p-8 text-center">Caricamento statistiche...</div>;

  const topicsData = stats.weeklyTopics || [];
  const removedTopicsData = stats.removedWeeklyTopics || [];
  const removedSourcesData = stats.removedSources || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Recharts Bar Chart: Argomenti più discussi della settimana analizzati dall'AI */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Argomenti più discussi della settimana
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Frequenza tematica e rilevanza estratti dall'analisi AI degli articoli degli ultimi 7 giorni
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold self-start sm:self-auto">
            <TrendingUp className="w-3.5 h-3.5" />
            AI Trend Report
          </div>
        </div>

        {topicsData.length > 0 ? (
          <div className="w-full">
            <div className="h-72 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topicsData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="currentColor" 
                    className="text-slate-200 dark:text-slate-800" 
                  />
                  <XAxis 
                    dataKey="topic" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    className="text-slate-600 dark:text-slate-400"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis 
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                    className="text-slate-500 dark:text-slate-400"
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as WeeklyTopic;
                        return (
                          <div className="bg-slate-900/95 text-white dark:bg-slate-800/95 dark:text-slate-100 px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 backdrop-blur-xs">
                            <p className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                              {item.topic}
                            </p>
                            <p className="text-slate-200">
                              Articoli pubblicati: <span className="font-semibold text-white">{item.count}</span>
                            </p>
                            <div className="flex items-center gap-2 pt-1 border-t border-slate-700/60">
                              <span className="text-slate-300">Rilevanza media AI:</span>
                              <span className="font-bold text-amber-400">{item.avgRelevance}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  >
                    {topicsData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={BAR_COLORS[index % BAR_COLORS.length]} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Topic pills summary */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Argomenti in evidenza:</span>
              {topicsData.map((t, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  <span 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                  />
                  {t.topic}
                  <span className="text-slate-400 dark:text-slate-500 font-bold ml-0.5">({t.count})</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60">
            <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nessun argomento settimanale rilevato</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Aggiorna o sincronizza i feed RSS per consentire all'AI di aggregare le tematiche di tendenza della settimana.
            </p>
          </div>
        )}

        {removedTopicsData.length > 0 && (
          <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700/60">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
              Argomenti da sorgenti non più presenti (rimosse o modificate)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {removedTopicsData.map((t, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/70"
                >
                  {t.topic}
                  <span className="font-bold ml-0.5">({t.count})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
         {/* Top Sources */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2">
               <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
               Fonti più consultate
            </h3>
            
            <div className="space-y-4">
               {stats.topSources.map((source, index) => {
                 const accent = getSourceAccent(source.name);
                 return (
                 <div key={index} className={`flex items-center justify-between p-2 pl-3 rounded-xl transition-colors ${accent.bg}`}>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 bg-white/40 dark:bg-black/20" aria-hidden="true">
                        <span className={`text-[10px] font-black ${accent.text}`}>{getSourceInitial(source.name)}</span>
                      </span>
                      <span className={`font-medium text-sm truncate ${accent.text}`}>{source.name}</span>
                    </span>
                    <span className={`bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${accent.text}`}>
                      {source.count} letti
                    </span>
                 </div>
                 );
               })}
               {stats.topSources.length === 0 && (
                  <p className="text-slate-400 dark:text-slate-500 text-sm italic">Non hai ancora letto abbastanza articoli.</p>
               )}
            </div>

            {removedSourcesData.length > 0 && (
              <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700/60">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Sorgenti non più presenti (rimosse o modificate)
                </p>
                <div className="space-y-2">
                  {removedSourcesData.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-xl opacity-60">
                      <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">{source.name}</span>
                      <span className="text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 px-3 py-1 rounded-full text-xs font-semibold">
                        {source.count} letti
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
         </div>
         
      </div>
    </div>
  );
}
