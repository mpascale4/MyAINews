import React, { useState, useEffect, useRef } from "react";
import { Interest, Feed, SuggestedFeed } from "../types";
import { 
  Plus, Trash2, Rss, Hash, Sparkles, X, CheckCircle2, Globe, Compass, 
  Loader2, UserCheck, Bot, Info, ShieldCheck, RefreshCw, Bell, BellRing, Sliders, Check, AlertTriangle, Download, Upload
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
  const [interests, setInterests] = useState<Interest[]>([]);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feedStats, setFeedStats] = useState<Record<string, number>>({});
  
  const [newKeyword, setNewKeyword] = useState("");
  const [newType, setNewType] = useState<'positive' | 'negative'>("positive");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newFeedName, setNewFeedName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isTestingFeed, setIsTestingFeed] = useState(false);
  const [testResult, setTestResult] = useState<{
    isValidRss: boolean;
    isScrapeableHtml: boolean;
    detectedName?: string;
    itemCount?: number;
    error?: string;
  } | null>(null);

  const testFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setIsTestingFeed(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/feeds/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newFeedUrl.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
        if (data.detectedName && !newFeedName) {
          setNewFeedName(data.detectedName);
        }
      } else {
        setTestResult({ isValidRss: false, isScrapeableHtml: false, error: "Errore di connessione durante il test." });
      }
    } catch (e) {
      setTestResult({ isValidRss: false, isScrapeableHtml: false, error: "Errore imprevisto durante il test." });
    } finally {
      setIsTestingFeed(false);
    }
  };

  // Overlay modal state
  const [aiOverlayData, setAiOverlayData] = useState<{
    isOpen: boolean;
    newCount: number;
    resetCount: number;
    manualCount: number;
    suggestedFeeds: (SuggestedFeed & { isNew?: boolean })[];
  }>({
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
    } catch (e) {
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
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
    } catch (e) {
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
        // Notify other components (like ArticlesList) that sources changed
        window.dispatchEvent(new CustomEvent('refresh-articles'));
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
            const fresh = data.suggestedFeeds.filter((f: any) => !existingUrls.has(f.url));
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
        if (data.interests) setInterests(data.interests);
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
        const iData = await iRes.json();
        setInterests(Array.isArray(iData) ? iData : []);
      }
    } catch (e) {
      console.error("Error loading interests:", e);
      setInterests([]);
    }

    try {
      const fRes = await fetch('/api/feeds');
      if (fRes.ok) {
        const fData = await fRes.json();
        setFeeds(Array.isArray(fData) ? fData : []);
      }
      
      const sRes = await fetch('/api/feeds/stats');
      if (sRes.ok) {
        const sData = await sRes.json();
        const statsMap = sData.reduce((acc: Record<string, number>, item: { name: string, shownCount: number }) => {
          acc[item.name] = item.shownCount;
          return acc;
        }, {});
        setFeedStats(statsMap);
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

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const togglePushSubscription = async () => {
    setPushLoading(true);
    setPushStatusMessage(null);
    try {
      if (!('serviceWorker' in navigator && 'PushManager' in window)) {
        alert("Il tuo browser non supporta le notifiche push.");
        setPushLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const existingSub = await reg.pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existingSub.endpoint })
        });
        setPushSubscribed(false);
        setPushStatusMessage("Notifiche push disattivate con successo.");
      } else {
        if (!('Notification' in window)) {
          throw new Error("Il browser non supporta le notifiche.");
        }

        if (Notification.permission === 'denied') {
          throw new Error("I permessi per le notifiche sono bloccati dal browser o dall'iframe di anteprima. Prova ad aprire l'applicazione in una nuova scheda per abilitare le notifiche push.");
        }

        let permission: string = Notification.permission;
        if (permission !== 'granted') {
          try {
            permission = await Notification.requestPermission();
          } catch (err) {
            console.warn("Notification.requestPermission failed:", err);
          }
        }

        if (permission !== 'granted') {
          throw new Error("Permesso notifiche non concesso. Nota: all'interno dell'anteprima in iframe alcune restrizioni del browser bloccano le notifiche. Apri l'app in una nuova scheda per attivarle.");
        }

        const keyRes = await fetch('/api/push/vapid-public-key');
        if (!keyRes.ok) throw new Error("Impossibile recuperare la chiave VAPID");
        const { publicKey } = await keyRes.json();

        const convertedKey = urlBase64ToUint8Array(publicKey);
        const newSub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });

        const subJson = newSub.toJSON();
        const subRes = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subJson)
        });

        if (!subRes.ok) throw new Error("Errore durante la registrazione sul server");

        setPushSubscribed(true);
        setPushStatusMessage("Notifiche push attivate con successo!");
      }
    } catch (e: any) {
      console.error("Push subscription error:", e);
      setPushStatusMessage(`Errore: ${e.message || "Impossibile attivare le notifiche push"}`);
    } finally {
      setPushLoading(false);
      setTimeout(() => setPushStatusMessage(null), 6000);
    }
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

  const addInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    
    await fetch('/api/interests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: newKeyword.trim(), type: newType, weight: newType === 'positive' ? 1.0 : 0.5 })
    });
    setNewKeyword("");
    loadData();
  };

  const deleteInterest = async (id: number) => {
    await fetch(`/api/interests/${id}`, { method: 'DELETE' });
    setInterests(prev => prev.filter(i => i.id !== id));
  };

  const addFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl || !newFeedName) return;
    
    // Explicitly set isManual: true for user-added feeds
    await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newFeedUrl, name: newFeedName, isManual: true, addedVia: "Aggiunta manuale" })
    });
    setNewFeedUrl("");
    setNewFeedName("");
    setTestResult(null);
    loadData();
    window.dispatchEvent(new CustomEvent('refresh-articles'));
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
    } catch (e: any) {
      clearTimeout(timeoutId);
      setTransformerResults(prev => ({
        ...prev,
        [feedId]: {
          loading: false,
          reason: e.name === 'AbortError'
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

  const toggleManualStatus = async (feed: Feed) => {
    const newStatus = !feed.isManual;
    await fetch(`/api/feeds/${feed.id}/manual`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isManual: newStatus })
    });
    setFeeds(prev => prev.map(f => f.id === feed.id ? { ...f, isManual: newStatus } : f));
  };

  const generateFeedsFromInterests = async () => {
    if (!window.confirm("Vuoi procedere con la rigenerazione delle sorgenti RSS?\n\nTutte le sorgenti automatiche precedenti verranno cancellate e ricreate in base ai tuoi interessi attuali (le sorgenti manuali protette rimarranno intatte).")) {
      return;
    }
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
    } catch (e: any) {
      console.warn("Errore generazione feed:", e.message || e);
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
        .filter((f: any) => f && typeof f.url === 'string' && f.url.trim())
        .map((f: any) => ({
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
      setTimeout(() => setImportFeedback(null), 6000);
    } catch (err: any) {
      setImportFeedback(`Errore: ${err.message || "file non valido."}`);
      setTimeout(() => setImportFeedback(null), 6000);
    }
  };

  const manualFeedsCount = feeds.length;
  const autoFeedsCount = 0;

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
           <div className="flex items-center gap-2 shrink-0">
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
           <div className={`mb-4 p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
             importFeedback.startsWith('Errore')
               ? "bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
               : "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
           }`}>
             {importFeedback.startsWith('Errore') ? <X className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
             <span>{importFeedback}</span>
           </div>
         )}

          {/* AI Feed Search by Keyword (e.g. Lucca) */}
          <div className="mb-8 p-5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60">
             <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-2">
               <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
               Cerca Feed con AI per Parola Chiave o Località (es. Lucca)
             </h3>
             <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
               Inserisci un argomento o una città (es. "Lucca", "Formula 1", "Economia") e l'AI cercherà i migliori feed RSS e Google News da aggiungere come sorgenti manuali protette.
             </p>
             <form onSubmit={searchFeedsAI} className="flex flex-col sm:flex-row gap-3">
               <input
                 type="text"
                 value={feedSearchKeyword}
                 onChange={(e) => setFeedSearchKeyword(e.target.value)}
                 placeholder="Inserisci parola chiave (es. Lucca)..."
                 className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               />
               <button
                 type="submit"
                 disabled={feedSearchLoading || !feedSearchKeyword.trim()}
                 className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-xs"
               >
                 {feedSearchLoading ? (
                   <Loader2 className="w-4 h-4 animate-spin" />
                 ) : (
                   <Sparkles className="w-4 h-4 text-amber-300" />
                 )}
                 Cerca con AI
               </button>
             </form>

             {feedSearchFeedback && (
               <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                 <span>{feedSearchFeedback}</span>
               </div>
             )}

             {feedSearchResults.length > 0 && (
               <div className="mt-4 space-y-2.5">
                 <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                   Risultati Trovati dall'AI (Clicca per aggiungere come manuale):
                 </span>
                 <div className="space-y-2">
                   {feedSearchResults.map((item, idx) => {
                     const alreadyAdded = existingFeedUrls.has(normalizeFeedUrl(item.url));
                     const testState = suggestedFeedTestResults[item.url];
                     return (
                     <div key={idx} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/60 flex flex-col gap-3 shadow-xs">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                         <div className="min-w-0 flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.name}</span>
                             <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                               {item.category}
                             </span>
                             {alreadyAdded && (
                               <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                 <CheckCircle2 className="w-3 h-3" /> Già aggiunta
                               </span>
                             )}
                           </div>
                           <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.reason}</p>
                           <p className="text-[11px] text-slate-400 font-mono truncate mt-1">{item.url}</p>
                         </div>
                         <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                           <button
                             type="button"
                             onClick={() => testSuggestedFeed(item.url)}
                             disabled={testState?.loading}
                             className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                           >
                             {testState?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Testa
                           </button>
                           {!alreadyAdded && !(testState && !testState.loading && !testState.isValidRss && !testState.isScrapeableHtml) && (
                             <button
                               type="button"
                               onClick={() => addSearchedFeedManually(item)}
                               className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                             >
                               <Plus className="w-3.5 h-3.5" /> Aggiungi
                             </button>
                           )}
                         </div>
                       </div>
                       {testState && !testState.loading && (
                         <div className={`text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-2 ${
                           (testState.isValidRss && (testState.itemCount || 0) > 0) || testState.isScrapeableHtml
                             ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                             : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300"
                         }`}>
                           {(testState.isValidRss && (testState.itemCount || 0) > 0) ? (
                             <>✓ RSS valido, {testState.itemCount} articoli trovati</>
                           ) : testState.isScrapeableHtml ? (
                             <>✓ Pagina HTML analizzabile: trasformatore ad-hoc creato con successo ({testState.itemCount} articoli trovati)</>
                           ) : (
                             <>✗ {testState.error || "Sorgente non raggiungibile o vuota: impossibile creare un trasformatore"}</>
                           )}
                         </div>
                       )}
                     </div>
                   )})}
                 </div>
               </div>
             )}
                  {/* Feed items list */}
         <div className="space-y-3">
            {feeds.map(feed => {
              const transformerResult = transformerResults[feed.id];
              return (
                <div 
                  key={feed.id} 
                  className="flex flex-col gap-3 p-4 sm:px-5 sm:py-4 rounded-xl transition-all bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 hover:bg-slate-100/80 dark:hover:bg-slate-800"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate text-sm sm:text-base">{feed.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1 font-mono">{feed.url}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => createTransformerForFeed(feed.id)}
                        disabled={transformerResult?.loading}
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                        title="Prova a creare/rigenerare un trasformatore ad-hoc per questa sorgente"
                      >
                        {transformerResult?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Crea trasformatore
                      </button>
                      <button 
                        onClick={() => deleteFeed(feed.id)} 
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Elimina sorgente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {transformerResult && !transformerResult.loading && (
                    <div className={`text-xs font-medium rounded-lg px-3 py-2 flex items-center gap-2 ${
                      transformerResult.validRss || transformerResult.createdTransformer
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300"
                    }`}>
                      {transformerResult.validRss ? (
                        <>✓ RSS valido, {transformerResult.itemCount} articoli trovati</>
                      ) : transformerResult.createdTransformer ? (
                        <>✓ Trasformatore creato, {transformerResult.itemCount} articoli estratti</>
                      ) : (
                        <>✗ {transformerResult.reason || "Impossibile creare un trasformatore per questa sorgente"}</>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {feeds.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                Nessuna sorgente RSS configurata. Clicca su "Rigenera da Interessi" per farti consigliare dall'AI o aggiungine una a mano.
              </div>
            )}
         </div>
      </div>

      {/* Danger Zone: Full Reset */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-rose-200 dark:border-rose-900/60 transition-colors">
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
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
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
      {aiOverlayData.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 p-6 text-white flex items-start justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Rigenerazione Sorgenti AI</h3>
                  <p className="text-indigo-100 text-sm mt-0.5">
                    {aiOverlayData.newCount > 0 
                      ? `✨ ${aiOverlayData.newCount} nuov${aiOverlayData.newCount === 1 ? 'a sorgente aggiunta' : 'e sorgenti aggiunte'} dall'AI`
                      : "Fonti AI aggiornate e allineate"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiOverlayData(prev => ({ ...prev, isOpen: false }))}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Summary Stats Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs text-amber-800 dark:text-amber-300 font-semibold">{aiOverlayData.manualCount} Manuali</div>
                    <div className="text-[11px] text-amber-600/90 dark:text-amber-400/80">Conservate intatte</div>
                  </div>
                </div>

                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 p-3 rounded-xl flex items-center gap-2.5">
                  <RefreshCw className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <div className="text-xs text-rose-800 dark:text-rose-300 font-semibold">{aiOverlayData.resetCount} Azzerate</div>
                    <div className="text-[11px] text-rose-600/90 dark:text-rose-400/80">Vecchie fonti auto</div>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold">{aiOverlayData.newCount} Nuove Fonti</div>
                    <div className="text-[11px] text-emerald-600/90 dark:text-emerald-400/80">Generate da AI</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  Sorgenti Selezionate dall'AI
                </h4>
                
                {aiOverlayData.suggestedFeeds.map((feed, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-2xl border bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{feed.name}</span>
                        {feed.category && (
                          <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold rounded-md uppercase tracking-wider">
                            {feed.category}
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Attivo
                      </span>
                    </div>

                    {feed.reason && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {feed.reason}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-mono truncate">
                      <Globe className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{feed.url}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Totale fonti attive: <strong className="font-semibold text-slate-800 dark:text-slate-200">{feeds.length}</strong>
              </span>
              <button
                onClick={() => setAiOverlayData(prev => ({ ...prev, isOpen: false }))}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer shadow-xs"
              >
                Ho Capito
              </button>
            </div>

          </div>
        </div>
      )}

      {/* AI Profile Interview Modal */}
      {interviewOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Intervista AI per Profilo e Interessi</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Parla con l'assistente per scoprire e aggiornare i tuoi argomenti</p>
                </div>
              </div>
              <button
                onClick={() => setInterviewOpen(false)}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {interviewMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {interviewLoading && (
                <div className="flex gap-3 items-center text-slate-400 text-xs italic">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <span>L'assistente sta elaborando la risposta...</span>
                </div>
              )}
            </div>

            {/* Extracted Preview Banner & Feed Results */}
            {(pendingExtracted.length > 0 || pendingSuggestedFeeds.length > 0) && (
              <div className="px-6 py-4 bg-emerald-50/90 dark:bg-emerald-950/60 border-t border-emerald-200 dark:border-emerald-800 space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Risultati Rilevati dall'AI ({pendingExtracted.length} Interessi, {pendingSuggestedFeeds.length} Feed)
                    </span>
                  </div>
                  <button
                    onClick={applyExtractedInterests}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Applica al Profilo e Aggiungi Feed
                  </button>
                </div>

                {/* Pending Interests */}
                {pendingExtracted.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 mr-1">Interessi:</span>
                    {pendingExtracted.map((item, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                          item.type === 'negative'
                            ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200'
                        }`}
                      >
                        {item.type === 'negative' ? '⛔ ' : '⭐ '}{item.keyword}
                        <button
                          type="button"
                          onClick={() => setPendingExtracted(prev => prev.filter((_, i) => i !== idx))}
                          className="hover:opacity-75 cursor-pointer ml-1 text-xs font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Pending Feed Suggestions */}
                {pendingSuggestedFeeds.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 block">Sorgenti RSS Suggerite:</span>
                    {pendingSuggestedFeeds.map((feed, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-900/90 p-2 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{feed.name}</div>
                          {feed.reason && <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{feed.reason}</div>}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
                          {feed.category || 'Generale'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPendingSuggestedFeeds(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                          title="Rimuovi questo feed"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat Input */}
            <form onSubmit={sendInterviewMessage} className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
              <input
                type="text"
                value={interviewInput}
                onChange={(e) => setInterviewInput(e.target.value)}
                placeholder="Scrivi qui la tua risposta..."
                className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs transition-all"
              />
              <button
                type="submit"
                disabled={interviewLoading || !interviewInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-2"
              >
                Invia
              </button>
            </form>

          </div>
        </div>
      )}

      {/* Reset All Confirmation Overlay */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isResetting && setIsResetConfirmOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Resettare tutto?
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Verranno cancellati definitivamente tutte le sorgenti, gli articoli, gli interessi e le preferenze. Al riavvio ti verrà riproposta la ricerca guidata delle sorgenti tramite parole chiave. Questa azione non può essere annullata.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={handleResetAll}
                disabled={isResetting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isResetting ? "Reset in corso..." : "Resetta tutto"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}
