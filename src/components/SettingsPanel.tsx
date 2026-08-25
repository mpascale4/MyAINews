import React, { useState, useEffect, useRef } from "react";
import { Feed } from "../types";
import { registerSourceNames } from "../lib/sourceStyle";
import { togglePushSubscription as togglePushHelper } from "./pushNotificationHelpers";

type WebAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

type SuggestedFeed = {
  url: string;
  name: string;
  reason?: string;
  category?: string;
};

type ImportFeedCandidate = {
  url?: string;
  name?: string;
  addedVia?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

import ConfirmOverlay from "./ConfirmOverlay";
import AiFeedGenerationModal, { AiOverlayData } from "./AiFeedGenerationModal";
import AiProfileInterviewModal from "./AiProfileInterviewModal";
import FeedListItem from "./FeedListItem";
import FeedSearchByKeyword from "./FeedSearchByKeyword";
import { 
  Trash2, Rss, Sparkles, X, CheckCircle2,
  Loader2, Bell, BellRing, Sliders, AlertTriangle, Download, Upload
} from "lucide-react";

export interface WeeklyTopic {
  topic: string;
  count: number;
  avgRelevance: number;
}

export interface DashboardStats {
  readCount: number;
  unreadCount: number;
  topSources: { name: string; count: number }[];
  weeklyTopics?: WeeklyTopic[];
}

export default function SettingsPanel() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);

  // Overlay modal state
  const [aiOverlayData, setAiOverlayData] = useState<AiOverlayData>({
    isOpen: false,
    newCount: 0,
    resetCount: 0,
    manualCount: 0,
    suggestedFeeds: []
  });

  const [pushThreshold, setPushThreshold] = useState<number>(80);
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);

  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewMessages, setInterviewMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: "Ciao! Sono il tuo assistente IA per profilazione e ricerca feed. Dimmi quali argomenti ti appassionano (es. tecnologia, geopolitica, cinema, Formula 1) o quali notizie cerchi in una città/regione specifica (es. Lucca, Toscana, Milano). Cercherò subito sia i tuoi interessi sia le migliori sorgenti RSS per te!" }
  ]);
  const [interviewInput, setInterviewInput] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [pendingExtracted, setPendingExtracted] = useState<{ keyword: string, type: 'positive' | 'negative', weight: number }[]>([]);
  const [pendingSuggestedFeeds, setPendingSuggestedFeeds] = useState<{ name: string; url: string; reason?: string; category?: string }[]>([]);

  const [feedSearchKeyword, setFeedSearchKeyword] = useState("");
  const [feedSearchResults, setFeedSearchResults] = useState<{ name: string; url: string; reason: string; category: string }[]>([]);
  const [feedSearchLoading, setFeedSearchLoading] = useState(false);
  const [feedSearchFeedback, setFeedSearchFeedback] = useState<string | null>(null);
  const [suggestedFeedTestResults, setSuggestedFeedTestResults] = useState<Record<string, {
    loading: boolean;
    isValidRss?: boolean;
    isScrapeableHtml?: boolean;
    transformerCreated?: boolean;
    itemCount?: number;
    error?: string;
  }>>({});

  // Normalizes a feed URL for "already added" comparisons: strips trailing
  // slashes and protocol so http/https or trailing-slash variants still match.
  const normalizeFeedUrl = (url: string) => url.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const existingFeedUrls = React.useMemo(
    () => new Set(feeds.map(f => normalizeFeedUrl(f.url))),
    [feeds]
  );

  const testSuggestedFeed = async (url: string) => {
    setSuggestedFeedTestResults(prev => ({ ...prev, [url]: { loading: true } }));
    try {
      const res = await fetch('/api/feeds/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = res.ok ? await res.json() : null;
      setSuggestedFeedTestResults(prev => ({
        ...prev,
        [url]: data
          ? { loading: false, isValidRss: data.isValidRss, isScrapeableHtml: data.isScrapeableHtml, transformerCreated: data.transformerCreated, itemCount: data.itemCount, error: data.error }
          : { loading: false, error: "Errore di connessione durante il test." }
      }));
    } catch {
      setSuggestedFeedTestResults(prev => ({ ...prev, [url]: { loading: false, error: "Errore imprevisto durante il test." } }));
    }
  };

  const searchFeedsAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedSearchKeyword.trim() || feedSearchLoading) return;

    setFeedSearchLoading(true);
    setFeedSearchResults([]);
    setFeedSearchFeedback(null);

    try {
      const res = await fetch('/api/feeds/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: feedSearchKeyword.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setFeedSearchResults(data.feeds || []);
      }
    } catch (e) {
      console.error("Error searching feeds:", e);
    } finally {
      setFeedSearchLoading(false);
    }
  };

  const playAddSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.25);
    } catch {
      // Web Audio API not available/blocked: fail silently, sound feedback is a nice-to-have.
    }
  };

  const addSearchedFeedManually = async (item: { name: string; url: string; reason: string; category: string }) => {
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, name: item.name, isManual: true, addedVia: feedSearchKeyword.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        loadData();
        playAddSound();
        // Trigger an immediate fetch for the newly added source so its articles show up right away.
        fetch('/api/fetch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedName: item.name })
        }).catch(err => console.error("Error fetching new source:", err))
          .finally(() => window.dispatchEvent(new CustomEvent('refresh-articles')));
        // If the RSS URL wasn't valid but the page is scrapeable, the server
        // generates an ad-hoc HTML transformer in the background right after
        // insertion (fire-and-forget); mention that here for HTML-type sources.
        setFeedSearchFeedback(
          `Sorgente "${item.name}" aggiunta con successo (feed #${data.id})! ${
            !item.reason?.toLowerCase().includes("rss") ? "Se non è un RSS valido, verrà creato automaticamente un trasformatore ad-hoc per estrarre le notizie dalla pagina HTML." : ""
          }`
        );
        setTimeout(() => setFeedSearchFeedback(null), 6000);
        setFeedSearchResults(prev => prev.filter(f => f.url !== item.url));
      }
    } catch (e) {
      console.error("Error adding searched feed:", e);
    }
  };

  const sendInterviewMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewInput.trim() || interviewLoading) return;

    const userMsg = interviewInput.trim();
    setInterviewInput("");
    const newMsgs = [...interviewMessages, { role: 'user' as const, content: userMsg }];
    setInterviewMessages(newMsgs);
    setInterviewLoading(true);

    try {
      const res = await fetch('/api/profile/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs })
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (Array.isArray(data.extractedInterests) && data.extractedInterests.length > 0) {
          setPendingExtracted(data.extractedInterests);
        }
        if (Array.isArray(data.suggestedFeeds) && data.suggestedFeeds.length > 0) {
          setPendingSuggestedFeeds(prev => {
            const existingUrls = new Set(prev.map(f => f.url));
            const fresh = data.suggestedFeeds.filter((f: SuggestedFeed) => !existingUrls.has(f.url));
            return [...prev, ...fresh];
          });
        }
      }
    } catch (e) {
      console.error("Interview error:", e);
    } finally {
      setInterviewLoading(false);
    }
  };

  const applyExtractedInterests = async () => {
    if (pendingExtracted.length === 0 && pendingSuggestedFeeds.length === 0) return;
    try {
      const res = await fetch('/api/profile/interests/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newInterests: pendingExtracted,
          newFeeds: pendingSuggestedFeeds
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feeds) setFeeds(data.feeds);
        setInterviewOpen(false);
        setPendingExtracted([]);
        setPendingSuggestedFeeds([]);
        
        // Trigger background fetch for new feeds
        fetch('/api/fetch', { method: 'POST' });
        
        // Notify other components
        window.dispatchEvent(new CustomEvent('refresh-articles'));
        
        setFeedSearchFeedback("Interessi e sorgenti RSS aggiunti con successo tramite l'assistente AI! 🎉");
        setTimeout(() => setFeedSearchFeedback(null), 5000);
      }
    } catch (e) {
      console.error("Error applying extracted interests and feeds:", e);
    }
  };

  const loadData = async () => {
    try {
      const iRes = await fetch('/api/interests');
      if (iRes.ok) {
        await iRes.json();
      }
    } catch (e) {
      console.error("Error loading interests:", e);
    }

    try {
      const fRes = await fetch('/api/feeds');
      if (fRes.ok) {
        const fData = await fRes.json();
        const fList = Array.isArray(fData) ? fData : [];
        registerSourceNames(fList.map((f: SuggestedFeed) => f.name));
        setFeeds(fList);
      }
    } catch (e) {
      console.error("Error loading feeds:", e);
      setFeeds([]);
    }
  };

  useEffect(() => {
    loadData();

    // Load push threshold
    fetch('/api/settings/push-threshold')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.threshold === 'number') {
          setPushThreshold(data.threshold);
        }
      })
      .catch(() => {});

    // Check push subscription status
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setPushSubscribed(Boolean(sub));
        });
      });
    }
  }, []);

  const handleThresholdChange = async (val: number) => {
    setPushThreshold(val);
    try {
      await fetch('/api/settings/push-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: val })
      });
    } catch (e) {
      console.error("Error saving threshold:", e);
    }
  };

  const togglePushSubscription = async () => {
    await togglePushHelper(setPushLoading, setPushStatusMessage, setPushSubscribed);
  };

  const sendTestNotification = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        const endpoint = sub ? sub.endpoint : undefined;

        const res = await fetch('/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint })
        });
        const data = await res.json();
        if (data.success) {
          setPushStatusMessage("🔔 Notifica di test inviata con successo!");
        } else {
          setPushStatusMessage("Impossibile inviare la notifica di test.");
        }
        setTimeout(() => setPushStatusMessage(null), 5000);
      }
    } catch (e) {
      console.error("Test notification error:", e);
    }
  };

  const deleteFeed = async (id: number) => {
    await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
    setFeeds(prev => prev.filter(f => f.id !== id));
    window.dispatchEvent(new CustomEvent('refresh-articles'));
  };

  const [transformerResults, setTransformerResults] = useState<Record<number, {
    loading: boolean;
    createdTransformer?: boolean;
    validRss?: boolean;
    itemCount?: number;
    reason?: string;
  }>>({});

  const createTransformerForFeed = async (feedId: number) => {
    setTransformerResults(prev => ({ ...prev, [feedId]: { loading: true } }));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // up to 90s: AI retries can be slow
    try {
      const res = await fetch(`/api/feeds/${feedId}/create-transformer`, { method: 'POST', signal: controller.signal });
      clearTimeout(timeoutId);
      const data = res.ok ? await res.json() : null;
      setTransformerResults(prev => ({
        ...prev,
        [feedId]: data
          ? { loading: false, createdTransformer: data.createdTransformer, validRss: data.validRss, itemCount: data.itemCount, reason: data.reason }
          : { loading: false, reason: "Errore di connessione durante la creazione del trasformatore." }
      }));
      if (data?.createdTransformer || data?.validRss) {
        window.dispatchEvent(new CustomEvent('refresh-articles'));
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      setTransformerResults(prev => ({
        ...prev,
        [feedId]: {
          loading: false,
          reason: e instanceof Error && e.name === 'AbortError'
            ? "L'operazione sta impiegando troppo tempo (probabile limite di quota AI raggiunto). Riprova tra qualche minuto."
            : "Errore imprevisto durante la creazione del trasformatore."
        }
      }));
    }
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset-all', { method: 'POST' });
      if (res.ok) {
        // Force the onboarding (AI keyword search) flow to show again on next load.
        localStorage.removeItem("onboardingComplete");
        localStorage.removeItem("lastDailyFeedPromptDate");
        window.location.reload();
      } else {
        setIsResetting(false);
      }
    } catch (e) {
      console.error("Error resetting app data:", e);
      setIsResetting(false);
    }
  };

  const [isRegenerateConfirmOpen, setIsRegenerateConfirmOpen] = useState(false);

  const generateFeedsFromInterests = async () => {
    setIsRegenerateConfirmOpen(false);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/feeds/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error("Errore durante la generazione dei feed con AI");
      }

      const data = await response.json();
      
      if (data.feeds) {
        setFeeds(data.feeds);
      } else {
        const freshFeeds = await fetch('/api/feeds').then(res => res.json());
        setFeeds(freshFeeds);
      }

      window.dispatchEvent(new CustomEvent('refresh-articles'));

      // Open AI results overlay modal with details
      setAiOverlayData({
        isOpen: true,
        newCount: data.newCount || 0,
        resetCount: data.resetCount || 0,
        manualCount: data.manualCount || 0,
        suggestedFeeds: data.suggestedFeeds || []
      });
    } catch (e: unknown) {
      console.warn("Errore generazione feed:", getErrorMessage(e));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportFeeds = () => {
    const exportData = feeds.map(f => ({
      url: f.url,
      name: f.name,
      addedVia: f.addedVia || null
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myainews-sorgenti-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const handleImportFeedsClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFeedsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Il file deve contenere un array di sorgenti.");
      const cleaned = parsed
        .filter((f: ImportFeedCandidate) => f && typeof f.url === 'string' && f.url.trim())
        .map((f: ImportFeedCandidate) => ({
          url: f.url.trim(),
          name: f.name ? String(f.name).trim() : f.url.trim(),
          isManual: true,
          addedVia: f.addedVia ? String(f.addedVia).trim() : null
        }));
      if (cleaned.length === 0) throw new Error("Nessuna sorgente valida trovata nel file.");

      const res = await fetch('/api/feeds/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeds: cleaned })
      });
      if (!res.ok) throw new Error("Errore del server durante l'importazione.");

      const freshFeeds = await fetch('/api/feeds').then(r => r.json());
      setFeeds(freshFeeds);
      window.dispatchEvent(new CustomEvent('refresh-articles'));
      const newCount = freshFeeds.length - feeds.length;
      setImportFeedback(
        newCount > 0
          ? `Importate ${newCount} nuove sorgenti (le altre già presenti sono state ignorate, aggiornando solo la chiave di ricerca mancante).`
          : `Nessuna nuova sorgente da aggiungere: tutte già presenti (chiave di ricerca aggiornata dove mancante).`
      );
    } catch (err: unknown) {
      setImportFeedback(`Errore: ${getErrorMessage(err) || "file non valido."}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      


      {/* Feeds Section */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
           <div>
             <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Rss className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                Sorgenti Notizie (RSS)
             </h2>
             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
               Gestisci i tuoi feed RSS e Google News attivi per raccogliere notizie aggiornate.
             </p>
           </div>
           <div className="flex items-center gap-2 shrink-0 flex-wrap">
             <button
               type="button"
               onClick={() => setIsRegenerateConfirmOpen(true)}
               disabled={isGenerating}
               className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
               title="Rigenera le sorgenti automatiche in base ai tuoi interessi attuali"
             >
               {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
               Rigenera da Interessi
             </button>
             <button
               type="button"
               onClick={handleExportFeeds}
               disabled={feeds.length === 0}
               className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
               title="Esporta tutte le sorgenti (URL e chiave di ricerca) in un file JSON"
             >
               <Download className="w-3.5 h-3.5" /> Esporta
             </button>
             <button
               type="button"
               onClick={handleImportFeedsClick}
               className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
               title="Importa sorgenti da un file JSON esportato in precedenza"
             >
               <Upload className="w-3.5 h-3.5" /> Importa
             </button>
             <input
               ref={importFileInputRef}
               type="file"
               accept="application/json"
               onChange={handleImportFeedsFile}
               className="hidden"
             />
           </div>
         </div>

         {importFeedback && (
           <div className={`mb-4 p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 border-2 shadow-md animate-in fade-in zoom-in-95 duration-200 ${
             importFeedback.startsWith('Errore')
               ? "bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200"
               : "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100"
           }`}>
             {importFeedback.startsWith('Errore')
               ? <X className="w-6 h-6 shrink-0 text-red-600 dark:text-red-400" />
               : <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600 dark:text-emerald-400" />}
             <span className="flex-1">{importFeedback}</span>
             <button
               type="button"
               onClick={() => setImportFeedback(null)}
               className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
               title="Chiudi"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
         )}

          {/* AI Feed Search by Keyword (e.g. Lucca) */}
          <FeedSearchByKeyword
            keyword={feedSearchKeyword}
            onKeywordChange={setFeedSearchKeyword}
            loading={feedSearchLoading}
            feedback={feedSearchFeedback}
            results={feedSearchResults}
            existingFeedUrls={existingFeedUrls}
            normalizeFeedUrl={normalizeFeedUrl}
            testResults={suggestedFeedTestResults}
            onSearch={searchFeedsAI}
            onTest={testSuggestedFeed}
            onAdd={addSearchedFeedManually}
          />
                  {/* Feed items list */}
         <div className="space-y-3 mt-6">
            {feeds.map(feed => (
              <FeedListItem
                key={feed.id}
                feed={feed}
                transformerResult={transformerResults[feed.id]}
                onTest={createTransformerForFeed}
                onDelete={deleteFeed}
              />
            ))}
            {feeds.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                Nessuna sorgente RSS configurata. Clicca su "Rigenera da Interessi" per farti consigliare dall'AI o aggiungine una a mano.
              </div>
            )}
         </div>
      </div>

      {/* Danger Zone: Full Reset */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-rose-200 dark:border-rose-900/60 transition-colors mt-8">
        <h2 className="text-xl font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2 mb-2">
          <AlertTriangle className="w-6 h-6" />
          Zona Pericolosa
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Cancella definitivamente tutte le sorgenti, gli articoli, gli interessi e le preferenze salvate. Al riavvio dell'app ti verrà riproposta la ricerca guidata delle sorgenti tramite parole chiave, come alla prima apertura.
        </p>
        <button
          type="button"
          onClick={() => setIsResetConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
        >
          <Trash2 className="w-4 h-4" /> Resetta tutto
        </button>
      </div>

      {/* Push Notifications & Threshold Settings Section */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors mt-8">
         <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
               <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
               Notifiche Push & Soglia Rilevanza AI
            </h2>
            <button
              onClick={togglePushSubscription}
              disabled={pushLoading}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                pushSubscribed
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : pushSubscribed ? (
                <>
                  <BellRing className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Notifiche Attive
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  Attiva Notifiche Push
                </>
              )}
            </button>
         </div>

         {pushStatusMessage && (
           <div className="mb-6 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs font-medium flex items-center justify-between flex-wrap gap-3">
             <span>{pushStatusMessage}</span>
             <button
               onClick={() => window.open(window.location.href, '_blank')}
               className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
             >
               Apri in nuova scheda ↗
             </button>
           </div>
         )}

         <div className="space-y-6">
           <div>
             <div className="flex items-center justify-between mb-2">
               <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                 <Sliders className="w-4 h-4 text-indigo-500" />
                 Soglia Minima AI Score per Notifiche:
               </label>
               <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold text-sm rounded-lg border border-indigo-200 dark:border-indigo-800">
                 {pushThreshold}%
               </span>
             </div>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
               Riceverai una notifica push in background solo per gli articoli la cui rilevanza calcolata dall'AI è superiore o uguale a questa soglia.
             </p>
             <input
               type="range"
               min="50"
               max="95"
               step="5"
               value={pushThreshold}
               onChange={(e) => handleThresholdChange(parseInt(e.target.value, 10))}
               className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
             />
             <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
               <span>50% (Molti articoli)</span>
               <span>75% (Bilanciato)</span>
               <span>90% (Solo eccellenze)</span>
             </div>
           </div>

           {pushSubscribed && (
             <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
               <span className="text-xs text-slate-500 dark:text-slate-400">
                 Il dispositivo è correttamente registrato per ricevere notifiche push in background.
               </span>
               <button
                 onClick={sendTestNotification}
                 className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
               >
                 Invia Notifica di Test
               </button>
             </div>
           )}
         </div>
      </div>



      {/* AI Feed Generation Result Overlay Modal */}
      <AiFeedGenerationModal
        data={aiOverlayData}
        totalFeedsCount={feeds.length}
        onClose={() => setAiOverlayData(prev => ({ ...prev, isOpen: false }))}
      />

      {/* AI Profile Interview Modal */}
      <AiProfileInterviewModal
        isOpen={interviewOpen}
        messages={interviewMessages}
        loading={interviewLoading}
        input={interviewInput}
        pendingExtracted={pendingExtracted}
        pendingSuggestedFeeds={pendingSuggestedFeeds}
        onClose={() => setInterviewOpen(false)}
        onInputChange={setInterviewInput}
        onSubmit={sendInterviewMessage}
        onApplyExtracted={applyExtractedInterests}
        onRemovePendingInterest={(index) => setPendingExtracted(prev => prev.filter((_, i) => i !== index))}
        onRemovePendingFeed={(index) => setPendingSuggestedFeeds(prev => prev.filter((_, i) => i !== index))}
      />

      {/* Reset All Confirmation Overlay */}
      <ConfirmOverlay
        isOpen={isResetConfirmOpen}
        title="Resettare tutto?"
        message="Verranno cancellati definitivamente tutte le sorgenti, gli articoli, gli interessi e le preferenze. Al riavvio ti verrà riproposta la ricerca guidata delle sorgenti tramite parole chiave. Questa azione non può essere annullata."
        confirmLabel="Resetta tutto"
        confirmingLabel="Reset in corso..."
        isConfirming={isResetting}
        onConfirm={handleResetAll}
        onCancel={() => setIsResetConfirmOpen(false)}
      />

      {/* Regenerate Feeds from Interests Confirmation Overlay */}
      <ConfirmOverlay
        isOpen={isRegenerateConfirmOpen}
        title="Rigenerare le sorgenti?"
        message="Tutte le sorgenti automatiche precedenti verranno cancellate e ricreate in base ai tuoi interessi attuali (le sorgenti manuali protette rimarranno intatte)."
        confirmLabel="Rigenera"
        confirmingLabel="Generazione in corso..."
        danger={false}
        isConfirming={isGenerating}
        onConfirm={generateFeedsFromInterests}
        onCancel={() => setIsRegenerateConfirmOpen(false)}
      />

    </div>
  );
}
