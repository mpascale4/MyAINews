import React, { useState } from "react";
import { Sparkles, Send, Loader2, Plus, Rss, X, ArrowRight, HelpCircle, Compass } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

interface SuggestedFeed {
  name: string;
  url: string;
  reason?: string;
  category?: string;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedFeed[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [suggestedFeeds, setSuggestedFeeds] = useState<SuggestedFeed[]>([]);
  const [finishing, setFinishing] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim() || searchLoading) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch('/api/feeds/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: searchKeyword.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.feeds || []);
      } else {
        setSearchError("Errore durante la ricerca. Riprova.");
      }
    } catch (err) {
      console.error("Error searching feeds by keyword:", err);
      setSearchError("Errore di connessione durante la ricerca. Riprova.");
    } finally {
      setSearchLoading(false);
    }
  };

  const addFeed = (feed: SuggestedFeed) => {
    setSuggestedFeeds(prev => {
      if (prev.some(f => f.url.toLowerCase() === feed.url.toLowerCase())) return prev;
      return [...prev, feed];
    });
    setSearchResults(prev => prev.filter(f => f.url.toLowerCase() !== feed.url.toLowerCase()));
  };

  const removeFeed = (url: string) => {
    setSuggestedFeeds(prev => prev.filter(f => f.url.toLowerCase() !== url.toLowerCase()));
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      // If the user hasn't added any feeds, provide a couple of high quality Italian feeds as basic default
      const finalFeeds = suggestedFeeds.length > 0 ? suggestedFeeds : [
        { name: "ANSA Notizie", url: "https://www.ansa.it/sito/ansait_rss.xml", category: "Attualità", reason: "Sorgente di notizie generale predefinita." },
        { name: "Il Post", url: "https://www.ilpost.it/feed", category: "Attualità", reason: "Spiegazioni chiare e notizie approfondite." }
      ];

      await fetch('/api/profile/interests/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newInterests: [],
          newFeeds: finalFeeds
        })
      });

      // Trigger feed fetch with newly defined feeds
      await fetch('/api/fetch', { method: 'POST' });

      localStorage.setItem("onboardingComplete", "true");
      onComplete();
    } catch (err) {
      console.error("Error completing onboarding:", err);
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] md:h-[80vh] transition-colors">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 p-6 text-white shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Configurazione Profilo</h2>
              <p className="text-indigo-100 text-sm mt-0.5">Cerca per argomento o città e scegli le fonti da seguire</p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Inizia a Leggere</span>}
            {!finishing && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Content Area - Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50 dark:bg-slate-950/50">

          {/* Left Column: Keyword Search */}
          <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Cerca fonti per argomento o città (es. Lucca, tecnologia, sport)
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Inserisci un termine e troverò subito gli URL delle migliori fonti di notizie corrispondenti.
            </p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 shrink-0">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Es. Lucca, tecnologia, Formula 1..."
                className="flex-1 min-w-0 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs transition-all"
                disabled={searchLoading}
              />
              <button
                type="submit"
                disabled={searchLoading || !searchKeyword.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Cerca</span>
              </button>
            </form>

            {searchError && (
              <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-xl text-sm font-medium">
                {searchError}
              </div>
            )}

            <div className="mt-4 space-y-2.5">
              {searchResults.map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                      {item.category && (
                        <span className="px-2 py-0.5 rounded text-sm font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {item.category}
                        </span>
                      )}
                    </div>
                    {item.reason && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.reason}</p>
                    )}
                    <p className="text-sm text-slate-400 font-mono truncate mt-1">{item.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addFeed(item)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 self-end sm:self-center shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Aggiungi
                  </button>
                </div>
              ))}
              {!searchLoading && searchResults.length === 0 && !searchError && (
                <div className="text-sm text-slate-400 dark:text-slate-500 italic p-1">
                  I risultati della ricerca (nome e URL delle fonti trovate) compariranno qui.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Sources Panel */}
          <div className="w-full md:w-80 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40 p-6 space-y-5 overflow-y-auto shrink-0">

            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <Rss className="w-4 h-4 text-indigo-500" />
                Fonti Selezionate ({suggestedFeeds.length})
              </h3>

              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {suggestedFeeds.map((feed, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-sm shadow-3xs flex flex-col gap-1 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{feed.name}</div>
                      <button
                        type="button"
                        onClick={() => removeFeed(feed.url)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 absolute top-2 right-2 transition-all"
                        title="Rimuovi"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {feed.reason && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {feed.reason}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="px-1.5 py-0.5 rounded text-sm font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {feed.category || 'Generale'}
                      </span>
                    </div>
                  </div>
                ))}
                {suggestedFeeds.length === 0 && (
                  <div className="text-sm text-slate-400 dark:text-slate-500 italic p-1">
                    Le fonti che aggiungi dai risultati della ricerca compariranno qui.
                  </div>
                )}
              </div>
            </div>

            {/* Context Notice */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-3.5 border border-indigo-100 dark:border-indigo-900/60 text-sm text-slate-500 dark:text-slate-400 leading-relaxed shrink-0">
              <HelpCircle className="w-4 h-4 text-indigo-500 inline mr-1 mb-0.5" />
              Cerca per argomento o città a sinistra e premi <strong>Aggiungi</strong> sulle fonti che ti interessano. Quando hai terminato, premi su <strong>Inizia a Leggere</strong> in alto.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
