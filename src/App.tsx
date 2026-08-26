import { useState } from "react";
import { BookOpen, Home, Moon, Settings, Sun } from "lucide-react";
import { MpBranding } from "@mp/app-kit";
import ArticlesList from "./components/ArticlesList";
import Onboarding from "./components/Onboarding";
import SettingsPanel from "./components/SettingsPanel";
import { isOnboardingComplete, markOnboardingComplete } from "./lib/feedsStorage";
import { useTheme } from "./lib/theme";

type TabId = "home" | "settings";

function AppHeader({ activeTab, theme, toggleTheme }: { activeTab: TabId; theme: string; toggleTheme: () => void }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 transition-colors dark:border-slate-800 dark:bg-slate-900 md:px-8">
      <div className="flex items-center gap-3">
        <img src="/icon.svg" alt="" className="h-8 w-8 rounded-xl object-cover shadow-sm" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{activeTab === "home" ? "Le tue notizie" : "Impostazioni"}</h2>
      </div>
      <button type="button" onClick={toggleTheme} className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800">
        {theme === "dark" ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
      </button>
    </header>
  );
}

function DesktopSidebar({ activeTab, onTabChange, theme, toggleTheme }: { activeTab: TabId; onTabChange: (tab: TabId) => void; theme: string; toggleTheme: () => void }) {
  const navItems = [
    { id: "home" as const, label: "Notizie", icon: <Home className="h-5 w-5" /> },
    { id: "settings" as const, label: "Impostazioni", icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="p-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
          <BookOpen className="h-6 w-6" />
          MyNewsAI
        </h1>
      </div>
      <nav className="flex-1 space-y-2 px-4">
        {navItems.map((item) => (
          <button key={item.id} type="button" onClick={() => onTabChange(item.id)} className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-colors ${activeTab === item.id ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50"}`}>
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <button type="button" onClick={toggleTheme} className="flex w-full cursor-pointer items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800">
          <span className="flex items-center gap-2.5">
            {theme === "dark" ? <Moon className="h-4 w-4 text-indigo-400" /> : <Sun className="h-4 w-4 text-amber-500" />}
            {theme === "dark" ? "Tema scuro" : "Tema chiaro"}
          </span>
        </button>
      </div>
    </aside>
  );
}

function MobileNavigation({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  const navItems = [
    { id: "home" as const, label: "Notizie", icon: <Home className="h-5 w-5" /> },
    { id: "settings" as const, label: "Profilo", icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900 md:hidden">
      {navItems.map((item) => (
        <button key={item.id} type="button" onClick={() => onTabChange(item.id)} className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 ${activeTab === item.id ? "font-semibold text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>
          {item.icon}
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [onboardingComplete, setOnboardingComplete] = useState(isOnboardingComplete());

  if (!onboardingComplete) {
    return <Onboarding onComplete={() => { markOnboardingComplete(); setOnboardingComplete(true); }} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <DesktopSidebar activeTab={activeTab} onTabChange={setActiveTab} theme={theme} toggleTheme={toggleTheme} />
      <main className="flex flex-1 flex-col overflow-hidden">
        <AppHeader activeTab={activeTab} theme={theme} toggleTheme={toggleTheme} />
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
          {activeTab === "home" ? <ArticlesList /> : <SettingsPanel />}
        </div>
      </main>
      <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      <MpBranding />
    </div>
  );
}
