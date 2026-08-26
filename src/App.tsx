/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BookOpen, Home, Settings, BarChart2, Bell, Sun, Moon, Bookmark, Trash2 } from "lucide-react";
import { MpBranding } from "@mp/app-kit";
import ArticlesList from "./components/ArticlesList";
import ReadLaterPage from "./components/ReadLaterPage";

type ArticleNotificationCandidate = {
  isRead?: boolean;
  aiRelevance?: number;
};
import Dashboard from "./components/Dashboard";
import SettingsPanel from "./components/SettingsPanel";
import TrashPage from "./components/TrashPage";
import Onboarding from "./components/Onboarding";
import { useTheme } from "./lib/theme";

const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

function useAppInitialization() {
  const [notifications, setNotifications] = useState<string[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isComplete = localStorage.getItem("onboardingComplete");
    if (!isComplete) {
      setOnboardingComplete(false);
    } else {
      const today = getTodayDateString();
      const lastPromptDate = localStorage.getItem("lastDailyFeedPromptDate");
      if (lastPromptDate !== today) {
        localStorage.setItem("lastDailyFeedPromptDate", today);
        fetch('/api/fetch', { method: 'POST' })
          .then(() => window.dispatchEvent(new CustomEvent('refresh-articles')))
          .catch(e => console.error("Error during daily feed update:", e));
      }
    }
    setIsLoading(false);

    fetch('/api/articles?filter=AI')
      .then(res => {
        if (!res.ok) return [];
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const unreadHigh = data.filter((a: ArticleNotificationCandidate) => a && !a.isRead && (a.aiRelevance ?? 0) >= 80);
          if (unreadHigh.length > 0) {
             setNotifications([`Hai ${unreadHigh.length} nuove notizie ad alta rilevanza!`]);
          }
        }
      })
      .catch(err => {
        console.warn("Could not fetch high relevance articles:", err);
      });
  }, []);

  return { notifications, onboardingComplete, isLoading, setOnboardingComplete };
}

function getHeaderTitle(activeTab: string): string {
  if (activeTab === "home") return "Le Tue Notizie";
  if (activeTab === "saved") return "Leggi Dopo";
  if (activeTab === "dashboard") return "Statistiche";
  if (activeTab === "trash") return "Cestino";
  return "Sorgenti Feed";
}

interface NavButtonProps {
  activeTab: string;
  targetTab: string;
  icon: React.ReactNode;
  label: string;
  onTabChange: (tab: string) => void;
}

function DesktopNavButton({ activeTab, targetTab, icon, label, onTabChange }: NavButtonProps) {
  return (
    <button
      onClick={() => onTabChange(targetTab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
        activeTab === targetTab
          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium"
          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface DesktopSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  theme: string;
  toggleTheme: () => void;
}

function DesktopSidebar({ activeTab, onTabChange, theme, toggleTheme }: DesktopSidebarProps) {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
      <div className="p-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          MyNewsAI
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <DesktopNavButton activeTab={activeTab} targetTab="home" icon={<Home className="w-5 h-5" />} label="Notizie" onTabChange={onTabChange} />
        <DesktopNavButton activeTab={activeTab} targetTab="saved" icon={<Bookmark className="w-5 h-5" />} label="Leggi dopo" onTabChange={onTabChange} />
        <DesktopNavButton activeTab={activeTab} targetTab="dashboard" icon={<BarChart2 className="w-5 h-5" />} label="Dashboard" onTabChange={onTabChange} />
        <DesktopNavButton activeTab={activeTab} targetTab="trash" icon={<Trash2 className="w-5 h-5" />} label="Cestino" onTabChange={onTabChange} />
        <DesktopNavButton activeTab={activeTab} targetTab="settings" icon={<Settings className="w-5 h-5" />} label="Impostazioni" onTabChange={onTabChange} />
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          title={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
        >
          <span className="flex items-center gap-2.5">
            {theme === "dark" ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span>{theme === "dark" ? "Tema Scuro" : "Tema Chiaro"}</span>
          </span>
          <span className="text-sm px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
            {theme === "dark" ? "Scuro" : "Chiaro"}
          </span>
        </button>
      </div>
    </aside>
  );
}

interface MobileNavButtonProps {
  activeTab: string;
  targetTab: string;
  icon: React.ReactNode;
  label: string;
  onTabChange: (tab: string) => void;
}

function MobileNavButton({ activeTab, targetTab, icon, label, onTabChange }: MobileNavButtonProps) {
  return (
    <button
      onClick={() => onTabChange(targetTab)}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer ${
        activeTab === targetTab ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500 dark:text-slate-400"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 z-50 pb-safe transition-colors">
      <MobileNavButton activeTab={activeTab} targetTab="home" icon={<Home className="w-5 h-5" />} label="Notizie" onTabChange={onTabChange} />
      <MobileNavButton activeTab={activeTab} targetTab="saved" icon={<Bookmark className="w-5 h-5" />} label="Leggi dopo" onTabChange={onTabChange} />
      <MobileNavButton activeTab={activeTab} targetTab="dashboard" icon={<BarChart2 className="w-5 h-5" />} label="Dashboard" onTabChange={onTabChange} />
      <MobileNavButton activeTab={activeTab} targetTab="trash" icon={<Trash2 className="w-5 h-5" />} label="Cestino" onTabChange={onTabChange} />
      <MobileNavButton activeTab={activeTab} targetTab="settings" icon={<Settings className="w-5 h-5" />} label="Profilo" onTabChange={onTabChange} />
    </nav>
  );
}

interface MainContentProps {
  activeTab: string;
  onNavigateHome: () => void;
}

function MainContent({ activeTab, onNavigateHome }: MainContentProps) {
  return (
    <div id="main-scroll-container" className="flex-1 overflow-y-auto overscroll-y-none p-4 md:p-8 pb-24 md:pb-8">
      {activeTab === "home" && <ArticlesList />}
      {activeTab === "saved" && <ReadLaterPage onNavigateHome={onNavigateHome} />}
      {activeTab === "dashboard" && <Dashboard />}
      {activeTab === "trash" && <TrashPage />}
      {activeTab === "settings" && <SettingsPanel />}
    </div>
  );
}

interface AppHeaderProps {
  activeTab: string;
  notifications: string[];
  theme: string;
  toggleTheme: () => void;
}

function AppHeader({ activeTab, notifications, theme, toggleTheme }: AppHeaderProps) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 transition-colors">
       <div className="flex items-center gap-3">
         <img src="/icon.svg" alt="" className="h-8 w-8 rounded-xl shadow-sm hidden sm:block" />
         <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {getHeaderTitle(activeTab)}
         </h2>
       </div>
       <div className="flex items-center gap-3">
          {notifications.length > 0 && (
             <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-full text-sm font-medium">
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{notifications[0]}</span>
                <span className="sm:hidden">Notizie</span>
             </div>
          )}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
            title={theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
       </div>
    </header>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const { notifications, onboardingComplete, isLoading, setOnboardingComplete } = useAppInitialization();

  if (isLoading) {
    return <div className="h-screen bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 flex items-center justify-center">Caricamento...</div>;
  }

  if (!onboardingComplete) {
    return (
      <Onboarding 
        onComplete={() => {
          localStorage.setItem("lastDailyFeedPromptDate", getTodayDateString());
          setOnboardingComplete(true);
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      <DesktopSidebar activeTab={activeTab} onTabChange={setActiveTab} theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        <AppHeader activeTab={activeTab} notifications={notifications} theme={theme} toggleTheme={toggleTheme} />
        <MainContent activeTab={activeTab} onNavigateHome={() => setActiveTab("home")} />
      </main>
      <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <MpBranding />
    </div>
  );
}
