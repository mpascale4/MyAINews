/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { BookOpen, Home, Settings, BarChart2, Bell, Sun, Moon, RefreshCw, Sparkles, Calendar, X, CheckCircle2, Bookmark } from "lucide-react";
import ArticlesList from "./components/ArticlesList";
import ReadLaterPage from "./components/ReadLaterPage";
import Dashboard from "./components/Dashboard";
import SettingsPanel from "./components/SettingsPanel";
import Onboarding from "./components/Onboarding";
import { useTheme } from "./lib/theme";

const getTodayDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const [notifications, setNotifications] = useState<string[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(true); // Default to true, let useEffect override
  const [isLoading, setIsLoading] = useState(true);
  
  // Daily Feed Prompt State
  const [showDailyPrompt, setShowDailyPrompt] = useState(false);
  const [isUpdatingDaily, setIsUpdatingDaily] = useState(false);
  const [dailyUpdateDone, setDailyUpdateDone] = useState(false);

  useEffect(() => {
    // Check onboarding status
    const isComplete = localStorage.getItem("onboardingComplete");
    if (!isComplete) {
      setOnboardingComplete(false);
    } else {
      // Check if it's the first app open of the day
      const today = getTodayDateString();
      const lastPromptDate = localStorage.getItem("lastDailyFeedPromptDate");
      if (lastPromptDate !== today) {
        setShowDailyPrompt(true);
      }
    }
    setIsLoading(false);

    // Check for high relevance articles
    fetch('/api/articles?filter=AI')
      .then(res => {
        if (!res.ok) return [];
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const unreadHigh = data.filter((a: any) => a && !a.isRead && a.aiRelevance >= 80);
          if (unreadHigh.length > 0) {
             setNotifications([`Hai ${unreadHigh.length} nuove notizie ad alta rilevanza!`]);
          }
        }
      })
      .catch(err => {
        console.warn("Could not fetch high relevance articles:", err);
      });
  }, []);

  const handleDismissDailyPrompt = () => {
    localStorage.setItem("lastDailyFeedPromptDate", getTodayDateString());
    setShowDailyPrompt(false);
  };

  const handleConfirmDailyUpdate = async () => {
    setIsUpdatingDaily(true);
    try {
      await fetch('/api/fetch', { method: 'POST' });
      localStorage.setItem("lastDailyFeedPromptDate", getTodayDateString());
      setDailyUpdateDone(true);
      window.dispatchEvent(new CustomEvent('refresh-articles'));
      
      // Close modal smoothly after brief success display
      setTimeout(() => {
        setShowDailyPrompt(false);
        setIsUpdatingDaily(false);
        setDailyUpdateDone(false);
      }, 1200);
    } catch (e) {
      console.error("Error during daily feed update:", e);
      localStorage.setItem("lastDailyFeedPromptDate", getTodayDateString());
      setShowDailyPrompt(false);
      setIsUpdatingDaily(false);
    }
  };

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
      {/* Sidebar (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            MyNewsAI
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              activeTab === "home"
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Home className="w-5 h-5" />
            Notizie
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              activeTab === "saved"
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Bookmark className="w-5 h-5" />
            Leggi dopo
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
              activeTab === "settings"
                ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            }`}
          >
            <Settings className="w-5 h-5" />
            Impostazioni
          </button>
        </nav>

        {/* Sidebar Footer with Theme Toggle */}
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
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
              {theme === "dark" ? "Scuro" : "Chiaro"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        {/* Header */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 shrink-0 transition-colors">
           <div className="flex items-center gap-3">
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {activeTab === "home" 
                  ? "Le Tue Notizie" 
                  : activeTab === "saved" 
                  ? "Leggi Dopo" 
                  : activeTab === "dashboard" 
                  ? "Statistiche" 
                  : "Sorgenti Feed"}
             </h2>
           </div>
           <div className="flex items-center gap-3">
              {notifications.length > 0 && (
                 <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 px-3 py-1.5 rounded-full text-xs font-medium">
                    <Bell className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{notifications[0]}</span>
                    <span className="sm:hidden">Notizie</span>
                 </div>
              )}

              {/* Theme Toggle Button in Header */}
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
        
        {/* Scrollable Area */}
        <div id="main-scroll-container" className="flex-1 overflow-y-auto overscroll-y-none p-4 md:p-8 pb-24 md:pb-8">
           {activeTab === "home" && <ArticlesList />}
           {activeTab === "saved" && <ReadLaterPage onNavigateHome={() => setActiveTab("home")} />}
           {activeTab === "dashboard" && <Dashboard />}
           {activeTab === "settings" && <SettingsPanel />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 z-50 pb-safe transition-colors">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer ${
            activeTab === "home" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Notizie</span>
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer ${
            activeTab === "saved" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Bookmark className="w-5 h-5" />
          <span className="text-[10px] font-medium">Leggi dopo</span>
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer ${
            activeTab === "dashboard" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <BarChart2 className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer ${
            activeTab === "settings" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-slate-500 dark:text-slate-400"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium">Profilo</span>
        </button>
      </nav>

      {/* First Daily Open Prompt Modal */}
      {showDailyPrompt && (
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={handleDismissDailyPrompt}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-50/80 via-indigo-50/40 to-slate-50 dark:from-indigo-950/50 dark:via-indigo-950/30 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <RefreshCw className={`w-6 h-6 ${isUpdatingDaily ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>{format(new Date(), "EEEE d MMMM", { locale: it })}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">
                    Primo Accesso di Oggi
                  </h3>
                </div>
              </div>
              <button 
                onClick={handleDismissDailyPrompt} 
                disabled={isUpdatingDaily}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                Buongiorno! Vuoi controllare e aggiornare subito i tuoi feed RSS per scaricare e analizzare con l'AI le ultime notizie pubblicate?
              </p>

              {dailyUpdateDone ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Feed aggiornati con successo! Caricamento notizie...</span>
                </div>
              ) : isUpdatingDaily ? (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 text-sm font-medium">
                  <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                  <span>Scaricamento e analisi AI in corso...</span>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={handleConfirmDailyUpdate}
                  disabled={isUpdatingDaily || dailyUpdateDone}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl text-sm transition-all shadow-xs active:scale-[0.99] disabled:opacity-70 cursor-pointer"
                >
                  {isUpdatingDaily ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Aggiornamento in corso...</span>
                    </>
                  ) : dailyUpdateDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aggiornato!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Aggiorna Notizie Ora</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismissDailyPrompt}
                  disabled={isUpdatingDaily}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-2xl text-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  Più tardi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

