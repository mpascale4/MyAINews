import { useState, useEffect } from "react";
import { registerSourceNames } from "../lib/sourceStyle";

export interface WeeklyTopic {
  topic: string;
  count: number;
  avgRelevance: number;
}

export interface DashboardStats {
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

const EMPTY_STATS: DashboardStats = {
  readCount: 0,
  unreadCount: 0,
  topSources: [],
  removedSources: [],
  weeklyTopics: [],
  removedWeeklyTopics: [],
};

// Fetches and normalizes the /api/dashboard payload, registering source
// names for consistent color/initial styling across the app.
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data && typeof data === "object" && "readCount" in data) {
          const topSources = Array.isArray(data.topSources) ? data.topSources : [];
          const removedSources = Array.isArray(data.removedSources) ? data.removedSources : [];
          registerSourceNames([...topSources, ...removedSources].map((s: DashboardSource) => s.name));
          setStats({
            readCount: Number(data.readCount) || 0,
            unreadCount: Number(data.unreadCount) || 0,
            topSources,
            removedSources,
            weeklyTopics: Array.isArray(data.weeklyTopics) ? data.weeklyTopics : [],
            removedWeeklyTopics: Array.isArray(data.removedWeeklyTopics) ? data.removedWeeklyTopics : [],
          });
        } else {
          setStats(EMPTY_STATS);
        }
      })
      .catch((err) => {
        console.error("Error loading dashboard stats:", err);
        setStats(EMPTY_STATS);
      });
  }, []);

  return stats;
}
