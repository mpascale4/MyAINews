import { Sparkles, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { WeeklyTopic } from "../hooks/useDashboardStats";

export const BAR_COLORS = [
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#3b82f6", // blue-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#f97316", // orange-500
];

function TopicTooltip({ active, payload }: { active?: boolean; payload?: { payload: WeeklyTopic }[] }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-slate-900/95 text-white dark:bg-slate-800/95 dark:text-slate-100 px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-sm space-y-1.5 backdrop-blur-xs">
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

function TopicsBarChart({ topicsData }: { topicsData: WeeklyTopic[] }) {
  return (
    <div className="h-72 sm:h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={topicsData} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
          <XAxis
            dataKey="topic"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "currentColor", fontSize: 12 }}
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
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-slate-500 dark:text-slate-400"
          />
          <Tooltip cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} content={TopicTooltip} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={48}>
            {topicsData.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopicPills({ topicsData }: { topicsData: WeeklyTopic[] }) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500 dark:text-slate-400 font-medium mr-1">Argomenti in evidenza:</span>
      {topicsData.map((t, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }} />
          {t.topic}
          <span className="text-slate-400 dark:text-slate-500 font-bold ml-0.5">({t.count})</span>
        </span>
      ))}
    </div>
  );
}

function NoTopicsPlaceholder() {
  return (
    <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60">
      <Sparkles className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-60" />
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nessun argomento settimanale rilevato</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
        Aggiorna o sincronizza i feed RSS per consentire all'AI di aggregare le tematiche di tendenza della settimana.
      </p>
    </div>
  );
}

function RemovedTopics({ removedTopicsData }: { removedTopicsData: WeeklyTopic[] }) {
  if (removedTopicsData.length === 0) return null;
  return (
    <div className="mt-6 pt-4 border-t border-dashed border-slate-200 dark:border-slate-700/60">
      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
        Argomenti da sorgenti non più presenti (rimosse o modificate)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {removedTopicsData.map((t, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/70"
          >
            {t.topic}
            <span className="font-bold ml-0.5">({t.count})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface DashboardTopicsChartProps {
  topicsData: WeeklyTopic[];
  removedTopicsData: WeeklyTopic[];
}

// Weekly AI-analyzed trending topics: bar chart, pills summary, and topics
// from sources that were later removed/changed.
export default function DashboardTopicsChart({ topicsData, removedTopicsData }: DashboardTopicsChartProps) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Argomenti più discussi della settimana
          </h3>
          <p className="text-sm sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Frequenza tematica e rilevanza estratti dall'analisi AI degli articoli degli ultimi 7 giorni
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold self-start sm:self-auto">
          <TrendingUp className="w-3.5 h-3.5" />
          AI Trend Report
        </div>
      </div>

      {topicsData.length > 0 ? (
        <div className="w-full">
          <TopicsBarChart topicsData={topicsData} />
          <TopicPills topicsData={topicsData} />
        </div>
      ) : (
        <NoTopicsPlaceholder />
      )}

      <RemovedTopics removedTopicsData={removedTopicsData} />
    </div>
  );
}
