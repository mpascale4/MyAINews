import { useDashboardStats } from "../hooks/useDashboardStats";
import DashboardTopicsChart from "./DashboardTopicsChart";
import DashboardTopSources from "./DashboardTopSources";

export default function Dashboard() {
  const stats = useDashboardStats();

  if (!stats) {
    return <div className="text-slate-500 dark:text-slate-400 p-8 text-center">Caricamento statistiche...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <DashboardTopicsChart
        topicsData={stats.weeklyTopics || []}
        removedTopicsData={stats.removedWeeklyTopics || []}
      />
      <div className="grid grid-cols-1 gap-6">
        <DashboardTopSources topSources={stats.topSources} removedSourcesData={stats.removedSources || []} />
      </div>
    </div>
  );
}
