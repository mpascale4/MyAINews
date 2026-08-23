import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Article, Interest } from "../types";
import { 
  ExternalLink, 
  CheckCircle, 
  Sparkles, 
  Filter, 
  RefreshCw, 
  EyeOff, 
  X, 
  Tag, 
  ShieldMinus, 
  Check, 
  Share2,
  SlidersHorizontal,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Info,
  Rss,
  RotateCcw,
  Compass,
  Loader2,
  Plus,
  Trash2
} from "lucide-react";
import ArticleCardItem from "./ArticleCardItem";
import FormattedSummary from "./FormattedSummary";
import ConfirmOverlay from "./ConfirmOverlay";
import { getSourceAccent, getSourceInitial, registerSourceNames } from "../lib/sourceStyle";

function HiddenArticleToast({ article, onUndo }: { article: Article; onUndo: () => void | Promise<void> }) {
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-72 max-w-[calc(100vw-2rem)] p-4 bg-slate-900 text-white rounded-2xl border-2 border-indigo-500/30 overflow-hidden shadow-2xl animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="flex items-center gap-2.5 text-indigo-400 font-bold uppercase tracking-wider text-[11px] mb-1.5">
        <EyeOff className="w-4 h-4" />
        <span>Notizia Nascosta</span>
      </div>
      <p className="text-xs font-semibold leading-snug line-clamp-2 text-slate-100 mb-3">
        {article.title}
      </p>
      <button
        onClick={onUndo}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Annulla ({timeLeft}s)</span>
      </button>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
        <div
          className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

const FILTERS = ["All", "Today"];

export default function ArticlesList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("Date");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [configuredFeeds, setConfiguredFeeds] = useState<{ id: number; name: string; url: string; addedVia?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<Article | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [pendingRegenerateId, setPendingRegenerateId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const [isLoadMoreLoading, setIsLoadMoreLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextSourceFetchRef = useRef(false);

  // "Create transformer" flow for a broken/empty source (shown in the empty-state box)
  const [isCreatingTransformer, setIsCreatingTransformer] = useState(false);
  const [transformerFeedback, setTransformerFeedback] = useState<string | null>(null);

  // Source click frequency tracking
  const [sourceClickCounts, setSourceClickCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("source_click_counts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Excluded / Negative Interests list for reactive tag state
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [tagModal, setTagModal] = useState<{ tag: string } | null>(null);
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
  const [tagSearchResults, setTagSearchResults] = useState<{ name: string; url: string; reason: string; category: string }[]>([]);
  const [tagSearchFeedback, setTagSearchFeedback] = useState<string | null>(null);
  const [allAddedFeeds, setAllAddedFeeds] = useState<Record<string, boolean>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [recentlyHiddenIds, setRecentlyHiddenIds] = useState<Record<number, boolean>>({});
  const [recentlyHiddenQueue, setRecentlyHiddenQueue] = useState<Article[]>([]);
  const [infoModalArticle, setInfoModalArticle] = useState<Article | null>(null);

  // Fetch all added feeds
  useEffect(() => {
    fetch('/api/feeds')
      .then(res => res.json())
      .then(feeds => {
        const addedMap = feeds.reduce((acc: Record<string, boolean>, feed: any) => {
          acc[feed.url] = true;
          return acc;
        }, {});
        setAllAddedFeeds(addedMap);
      })
      .catch(console.error);
  }, []);

  // When tagModal changes, reset search results and loading state
  useEffect(() => {
    setTagSearchLoading(false);
    setTagSearchResults([]);
    setTagSearchFeedback(null);
  }, [tagModal]);

  const undoHideArticleInline = async (id: number) => {
    setRecentlyHiddenIds(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    const article = recentlyHiddenQueue.find(a => a.id === id);
    setRecentlyHiddenQueue(prev => prev.filter(a => a.id !== id));
    if (article) {
      setArticles(prev => [article, ...prev]);
    }
    await fetch(`/api/articles/${id}/unhide`, { method: "POST" });
  };

  // Pull to refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const fetchInterests = async () => {
    try {
      const res = await fetch("/api/interests");
      if (res.ok) {
        const data = await res.json();
        setInterestsList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Error fetching interests:", e);
      setInterestsList([]);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/feeds");
      if (res.ok) {
        const feedsData = await res.json();
        const feedList = Array.isArray(feedsData) ? feedsData : [];
        registerSourceNames(feedList.map((f: any) => f.name));
        setConfiguredFeeds(feedList);
      }
    } catch (e) {
      console.error("Error fetching sources:", e);
    }
  };

  const fetchArticles = () => {
    setLoading(true);
    const tagParam = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : "";
    const sourceParam = selectedSource ? `&source=${encodeURIComponent(selectedSource)}` : "";
    
    // Use a timeout to ensure we don't stay in loading forever if the request hangs
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for UI fetch

    fetch(`/api/articles?filter=${filter}&sort=${sort}${tagParam}${sourceParam}`, {
      signal: controller.signal
    })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setArticles(list);
        setVisibleCount(10);
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.error("Error loading articles:", err);
        setArticles([]);
        if (err.name === 'AbortError') {
          setFeedbackMessage("Il caricamento sta impiegando troppo tempo. Riprova tra poco.");
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInterests();
    fetchSources();
    
    const handleGlobalRefresh = () => {
      fetchArticles();
      fetchInterests();
      fetchSources();
    };

    window.addEventListener("refresh-articles", handleGlobalRefresh);
    return () => {
      window.removeEventListener("refresh-articles", handleGlobalRefresh);
    };
  }, []);

  useEffect(() => {
    if (skipNextSourceFetchRef.current) {
      skipNextSourceFetchRef.current = false;
      return;
    }
    fetchArticles();
  }, [filter, sort, selectedTag, selectedSource]);

  // Refs mirror the loading state so the observer callback always reads the
  // latest value without forcing the effect below to be torn down and
  // recreated mid-flight (which was cancelling the pending "load more" timeout).
  const isLoadMoreLoadingRef = useRef(false);
  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (!sentinelRef.current || articles.length <= visibleCount) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !isLoadMoreLoadingRef.current && !loadingRef.current) {
        isLoadMoreLoadingRef.current = true;
        setIsLoadMoreLoading(true);

        // Clear any existing timeout
        if (loadMoreTimeoutRef.current) clearTimeout(loadMoreTimeoutRef.current);

        // Add a small delay for smoother transition
        loadMoreTimeoutRef.current = setTimeout(() => {
          setVisibleCount(prev => Math.min(prev + 12, articles.length));
          isLoadMoreLoadingRef.current = false;
          setIsLoadMoreLoading(false);
          loadMoreTimeoutRef.current = null;
        }, 400);
      }
    }, {
      rootMargin: "250px",
      threshold: 0.1
    });

    observer.observe(sentinelRef.current);
    return () => {
      observer.disconnect();
    };
  }, [articles.length, visibleCount]);

  // Clear any pending "load more" timeout only on unmount.
  useEffect(() => {
    return () => {
      if (loadMoreTimeoutRef.current) clearTimeout(loadMoreTimeoutRef.current);
    };
  }, []);

  // Check if a given tag is in the negative / excluded interests
  const isTagExcluded = (tagName: string) => false;
  const isTagPositiveInterest = (tagName: string) => false;

  const searchFeedsForTag = async (tag: string) => {
    if (tagSearchLoading) return;
    setTagSearchLoading(true);
    setTagSearchResults([]);
    setTagSearchFeedback(null);
    try {
      const res = await fetch('/api/feeds/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: tag })
      });
      if (res.ok) {
        const data = await res.json();
        setTagSearchResults(data.feeds || []);
      } else {
        setTagSearchFeedback("Impossibile trovare feed per questo tag al momento.");
      }
    } catch (err) {
      console.error("Error searching feeds for tag:", err);
      setTagSearchFeedback("Errore di connessione durante la ricerca.");
    } finally {
      setTagSearchLoading(false);
    }
  };

  const addTagFeed = async (item: { name: string; url: string; reason: string; category: string }) => {
    try {
      const res = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: item.url, name: item.name, isManual: true })
      });
      if (res.ok) {
        setAllAddedFeeds(prev => ({ ...prev, [item.url]: true }));
        setTagSearchFeedback(`Sorgente "${item.name}" aggiunta!`);
        // Trigger background fetch for new feeds
        fetch('/api/fetch', { method: 'POST' });
      } else {
        setTagSearchFeedback("Impossibile aggiungere la sorgente.");
      }
    } catch (err) {
      console.error("Error adding tag feed:", err);
      setTagSearchFeedback("Errore durante l'aggiunta della sorgente.");
    }
  };

  const markAsRead = async (id: number) => {
    await fetch(`/api/articles/${id}/read`, { method: "POST" });
    setArticles(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const toggleReadArticle = async (article: Article) => {
    const newStatus = !article.isRead;
    const endpoint = newStatus ? `/api/articles/${article.id}/read` : `/api/articles/${article.id}/unread`;
    
    // Optimistic UI update
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isRead: newStatus } : a));
    setFeedbackMessage(newStatus ? "Notizia segnata come letta" : "Notizia segnata come non letta");
    setTimeout(() => setFeedbackMessage(null), 3000);

    try {
      await fetch(endpoint, { method: "POST" });
    } catch (err) {
      console.error("Error toggling read status:", err);
    }
  };

  const handleSelectSource = (srcName: string) => {
    if (srcName) {
      const feed = configuredFeeds.find(f => f.name === srcName);
      console.log(`[Sorgente selezionata] "${srcName}" -> feed URL: ${feed?.url || "N/D"} | articoli richiesti a: /api/articles?source=${encodeURIComponent(srcName)}`);
      setSourceClickCounts(prev => {
        const updated = { ...prev, [srcName]: (prev[srcName] || 0) + 1 };
        try {
          localStorage.setItem("source_click_counts", JSON.stringify(updated));
        } catch (e) {
          console.error("Error saving source click counts:", e);
        }
        return updated;
      });
      setSort("Date");
      setFilter("All");
      setSelectedTag(null);
    }
    setTransformerFeedback(null);

    // Update the selected source immediately for instant visual feedback (highlight),
    // but skip the auto-fetch from the filter/sort/source effect below — we perform a
    // single fetchArticles() ourselves after the /api/fetch refresh completes, to avoid
    // a double-fetch flicker.
    skipNextSourceFetchRef.current = true;
    setSelectedSource(srcName);

    // Refresh fresh news: scoped to the selected source, or all sources for
    // "Tutte le sorgenti".
    setLoading(true);
    fetch('/api/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(srcName ? { feedName: srcName } : {})
    })
      .catch(err => console.error("Error refreshing source:", err))
      .finally(() => fetchArticles());
  };

  const handleCreateTransformerForSelectedSource = async () => {
    const feed = configuredFeeds.find(f => f.name === selectedSource);
    if (!feed) return;

    setIsCreatingTransformer(true);
    setTransformerFeedback(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // up to 90s: AI retries can be slow
    try {
      const res = await fetch(`/api/feeds/${feed.id}/create-transformer`, { method: "POST", signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (data.validRss) {
        setTransformerFeedback(`L'RSS risulta valido (${data.itemCount} articoli): riprovo a caricare le notizie.`);
      } else if (data.createdTransformer) {
        setTransformerFeedback(`Trasformatore creato! Trovati ${data.itemCount} articoli. Aggiorno la lista...`);
      } else {
        setTransformerFeedback(data.reason || "Non è stato possibile creare un trasformatore per questa sorgente.");
      }
      fetchArticles();
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error("Error creating transformer:", err);
      setTransformerFeedback(
        err.name === 'AbortError'
          ? "L'operazione sta impiegando troppo tempo (probabile limite di quota AI raggiunto). Riprova tra qualche minuto."
          : "Errore durante il tentativo di creazione del trasformatore. Riprova."
      );
    } finally {
      setIsCreatingTransformer(false);
    }
  };

  const [isRemovingSource, setIsRemovingSource] = useState(false);
  const [isRemoveSourceConfirmOpen, setIsRemoveSourceConfirmOpen] = useState(false);

  const handleRemoveSelectedSource = async () => {
    const feed = configuredFeeds.find(f => f.name === selectedSource);
    if (!feed) return;

    setIsRemoveSourceConfirmOpen(false);
    setIsRemovingSource(true);
    try {
      const res = await fetch(`/api/feeds/${feed.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      setConfiguredFeeds(prev => prev.filter(f => f.id !== feed.id));
      setSelectedSource("");
      fetchArticles();
    } catch (err: any) {
      console.error("Error removing source:", err);
      setTransformerFeedback("Errore durante la rimozione della sorgente. Riprova.");
    } finally {
      setIsRemovingSource(false);
    }
  };

  const top10Sources = React.useMemo(() => {
    const list = configuredFeeds.map(f => f.name);

    if (list.length === 0) return [];

    // For the main bar, we prefer showing all configured feeds alphabetically or in original order
    // to "align" with the user settings as requested.
    return [...list].sort((a, b) => a.localeCompare(b));
  }, [configuredFeeds]);

  const toggleSaveArticle = async (article: Article) => {
    const newSaveStatus = !article.isSaved;
    
    if (newSaveStatus) {
      // Remove article from active feed immediately when saved to "Leggi dopo"
      setArticles(prev => prev.filter(a => a.id !== article.id));
      if (selectedSummary && selectedSummary.id === article.id) {
        setSelectedSummary(null);
      }
      setFeedbackMessage("Articolo salvato in 'Leggi dopo' e rimosso dal feed 📌");
    } else {
      setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isSaved: false } : a));
      if (selectedSummary && selectedSummary.id === article.id) {
        setSelectedSummary(prev => prev ? { ...prev, isSaved: false } : null);
      }
      setFeedbackMessage("Articolo rimosso da 'Leggi dopo'");
    }

    setTimeout(() => setFeedbackMessage(null), 3500);

    try {
      await fetch(`/api/articles/${article.id}/toggle-save`, { method: "POST" });
    } catch (err) {
      console.error("Error toggling save status:", err);
    }
  };

  const hideArticle = async (id: number) => {
    const article = articles.find(a => a.id === id);
    if (!article) return;

    // Remove immediately from the main list so it doesn't shift while reading others,
    // and show an undo toast instead of an inline placeholder.
    setArticles(prev => prev.filter(a => a.id !== id));
    setRecentlyHiddenIds(prev => ({ ...prev, [id]: true }));
    setRecentlyHiddenQueue(prev => [...prev, article]);

    // Call hide API immediately
    await fetch(`/api/articles/${id}/hide`, { method: "POST" });

    // In 3 seconds, if it has not been restored, drop it from the undo toast queue
    setTimeout(() => {
      setRecentlyHiddenIds(prev => {
        if (prev[id]) {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        }
        return prev;
      });
      setRecentlyHiddenQueue(prev => prev.filter(a => a.id !== id));
    }, 3000);
  };

  const handleShareArticle = async (article: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const title = article.title || "Notizia FeedAI";
    const text = article.aiSummary 
      ? `${title}\n\nRiassunto AI:\n${article.aiSummary}\n\n` 
      : `${title}\n\n`;
    const url = article.link || window.location.href;

    const shareData = {
      title,
      text,
      url,
    };

    if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setFeedbackMessage("Notizia condivisa con successo!");
        setTimeout(() => setFeedbackMessage(null), 4000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // User cancelled
      }
    }

    // Fallback to Clipboard API
    try {
      const copyText = `${title}\n${url}`;
      await navigator.clipboard.writeText(copyText);
      setFeedbackMessage("Link dell'articolo copiato negli appunti!");
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      setFeedbackMessage("Impossibile copiare il link.");
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const autoGenerateSummary = async (id: number) => {
    setIsRegenerating(true);
    setSummaryError(null);
    try {
      const res = await fetch(`/api/articles/${id}/regenerate-summary`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setArticles(prev => prev.map(a => a.id === id ? { ...a, aiSummary: data.aiSummary, aiTags: data.aiTags, aiRelevance: data.aiRelevance } : a));
        setSelectedSummary(prev => prev ? { ...prev, aiSummary: data.aiSummary, aiTags: data.aiTags, aiRelevance: data.aiRelevance } : null);
      } else {
        setSummaryError("Impossibile generare il riassunto. Riprova più tardi.");
      }
    } catch (e) {
      console.error(e);
      setSummaryError("Errore di connessione durante la generazione del riassunto.");
    }
    setIsRegenerating(false);
  };

  const generateSummary = (id: number) => {
    setPendingRegenerateId(id);
  };

  const confirmGenerateSummary = async () => {
    if (pendingRegenerateId == null) return;
    const id = pendingRegenerateId;
    setPendingRegenerateId(null);
    await autoGenerateSummary(id);
  };

  const handleOpenSummary = (article: Article) => {
    setSelectedSummary(article);
    setSummaryError(null);
    if (!article.aiSummary) {
      autoGenerateSummary(article.id);
    }
  };

  const handleFetchFeeds = async () => {
    setLoading(true);
    await fetch('/api/fetch', { method: 'POST' });
    fetchArticles();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = document.getElementById('main-scroll-container');
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    
    const y = e.touches[0].clientY;
    const diff = y - startYRef.current;
    
    if (diff > 0) {
      // Add resistance
      const distance = Math.min(diff * 0.4, 100);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (isPullingRef.current) {
      if (pullDistance > 60 && !loading) {
        setPullDistance(0);
        await handleFetchFeeds();
      } else {
        setPullDistance(0);
      }
      isPullingRef.current = false;
      startYRef.current = 0;
    }
  };

  return (
    <div 
      className="max-w-5xl mx-auto space-y-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull Indicator */}
      <div 
        className="flex justify-center items-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : '0px' }}
      >
        <div className="flex flex-col items-center justify-center text-indigo-500">
          <RefreshCw 
            className={`w-6 h-6 transition-transform ${pullDistance > 60 ? 'animate-spin' : ''}`} 
            style={{ transform: `rotate(${pullDistance * 3}deg)` }} 
          />
        </div>
      </div>

      {/* Temporary Floating Feedback Toast */}
      {feedbackMessage && (
        <div className="fixed top-20 right-4 sm:right-6 z-[100] flex items-center justify-between gap-3 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-11/12 sm:w-auto">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm">{feedbackMessage}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}



      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
        {/* Tutte / Oggi + Ordinamento */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filter === f 
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {f === "All" ? "Tutte" : "Oggi"}
            </button>
          ))}

          {/* Ordinamento (Più recenti) posizionato subito dopo Oggi */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-full px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer transition-colors"
          >
            <option value="Date">Più recenti</option>
            <option value="AI Relevance">Rilevanza AI</option>
          </select>
        </div>

        <button
          onClick={handleFetchFeeds}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
          title="Aggiorna notizie"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {/* Selezione Sorgente: lista piatta completa di tutte le sorgenti disponibili */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-3.5 px-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 transition-colors">
        <button
          onClick={() => handleSelectSource("")}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shrink-0 ${
            selectedSource === ""
              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40"
              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80"
          }`}
          title="Mostra tutte le sorgenti"
        >
          <Rss className="w-3.5 h-3.5 shrink-0" />
          <span>Tutte le sorgenti</span>
        </button>
        {configuredFeeds.map((feed) => {
          const isSelected = selectedSource === feed.name;
          const accent = getSourceAccent(feed.name);
          return (
            <button
              key={feed.name}
              onClick={() => handleSelectSource(isSelected ? "" : feed.name)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-start gap-1.5 border shrink-0 ${
                isSelected
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-400/40"
                  : `${accent.bg} ${accent.text} border-transparent hover:opacity-80`
              }`}
              title={feed.addedVia ? `Filtra per ${feed.name} — aggiunta tramite: ${feed.addedVia}` : `Filtra per ${feed.name}`}
            >
              <span
                className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? "bg-white/20" : "bg-white/40 dark:bg-black/20"}`}
                aria-hidden="true"
              >
                <span className={`text-[9px] font-black ${isSelected ? "text-white" : accent.text}`}>{getSourceInitial(feed.name)}</span>
              </span>
              <span className="flex flex-col items-start gap-0">
                {feed.addedVia && (
                  <span
                    className={`text-[9px] font-normal opacity-70 truncate max-w-[160px] leading-none ${
                      isSelected ? "text-indigo-100" : accent.text
                    }`}
                  >
                    {feed.addedVia}
                  </span>
                )}
                <span className="truncate max-w-[160px]">{feed.name}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Tag Filter Indicator */}
      {selectedTag && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 px-4 py-2.5 rounded-2xl text-sm font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Filtro attivo per tag: <strong className="font-bold text-indigo-700 dark:text-indigo-300">#{selectedTag}</strong></span>
          </div>
          <button
            onClick={() => setSelectedTag(null)}
            className="inline-flex items-center gap-1 text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Mostra tutte
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-12">Caricamento notizie...</div>
      ) : articles.length === 0 ? (
        <div className="text-center text-slate-500 dark:text-slate-400 py-12 px-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <p>Nessuna notizia trovata per i criteri selezionati.</p>

          {selectedSource && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={handleCreateTransformerForSelectedSource}
                  disabled={isCreatingTransformer}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingTransformer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Prova a creare trasformatore per "{selectedSource}"
                </button>
                <button
                  onClick={() => setIsRemoveSourceConfirmOpen(true)}
                  disabled={isRemovingSource}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isRemovingSource ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Rimuovi sorgente
                </button>
              </div>
              {transformerFeedback && (
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 max-w-md mx-auto">{transformerFeedback}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick gesture hint for mobile/touch users */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500 px-1 py-0.5 select-none gap-2">
            <span className="flex items-center gap-1.5">
              <span>👉</span> <span><strong>Swipe a destra:</strong> apri AI summary</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span>👈</span> <span><strong>Swipe a sinistra:</strong> nascondi notizia</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.slice(0, visibleCount).map((article) => (
              <ArticleCardItem
                key={article.id}
                article={article}
                isTagExcluded={isTagExcluded}
                selectedTag={selectedTag}
                onTagClick={(tag) => setTagModal({ tag })}
                onOpenSummary={handleOpenSummary}
                onToggleRead={toggleReadArticle}
                onToggleSave={toggleSaveArticle}
                onHide={hideArticle}
                onShare={handleShareArticle}
                onOpenInfo={(art) => setInfoModalArticle(art)}
              />
            ))}
          </div>

          {/* Undo-hide toasts, stacked bottom-left */}
          {recentlyHiddenQueue.length > 0 && (
            <div className="fixed bottom-4 left-4 z-[80] flex flex-col-reverse gap-2 pointer-events-none">
              {recentlyHiddenQueue.slice(-3).map((article) => (
                <div key={article.id} className="pointer-events-auto">
                  <HiddenArticleToast
                    article={article}
                    onUndo={() => undoHideArticleInline(article.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {articles.length > visibleCount && (
            <div 
              ref={sentinelRef} 
              className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400 select-none animate-in fade-in duration-500"
            >
              <div className="relative flex items-center justify-center">
                <Loader2 className={`w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400 ${isLoadMoreLoading ? 'opacity-100' : 'opacity-40'}`} />
                {!isLoadMoreLoading && <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-500">...</div>}
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  {isLoadMoreLoading ? "Caricamento in corso" : "Scorri per altre notizie"}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Mostrate {Math.min(visibleCount, articles.length)} di {articles.length}</span>
                </div>
              </div>
              
              {!isLoadMoreLoading && (
                <button 
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="mt-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Mostra di più ora
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tag Action Modal (AI Feed search & Filter) */}
      {tagModal && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" 
          onClick={() => setTagModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 transition-colors" 
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-50/70 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
                    Trova Fonti Correlate con AI
                  </h3>
                  <span className="inline-block font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                    #{tagModal.tag}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setTagModal(null)} 
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* AI Search Area */}
              {tagSearchResults.length === 0 && !tagSearchLoading && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    Vuoi utilizzare l'Intelligenza Artificiale per scoprire nuovi feed RSS e sorgenti di notizie aggiornate dedicate a <strong className="text-indigo-600 dark:text-indigo-400">#{tagModal.tag}</strong>?
                  </div>
                  <button
                    onClick={() => searchFeedsForTag(tagModal.tag)}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-2xl text-sm transition-all shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Cerca Fonti con AI
                  </button>
                </div>
              )}

              {/* Loading State */}
              {tagSearchLoading && (
                <div className="py-8 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    L'AI sta cercando i migliori feed per #{tagModal.tag}...
                  </p>
                </div>
              )}

              {/* Feed Search Feedback */}
              {tagSearchFeedback && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>{tagSearchFeedback}</span>
                </div>
              )}

              {/* Search Results */}
              {tagSearchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Sorgenti consigliate trovate:
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {tagSearchResults.map((feed, idx) => {
                      const isAdded = !!allAddedFeeds[feed.url];
                      return (
                        <div 
                          key={idx} 
                          className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-3xs"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                              {feed.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                              {feed.reason || feed.category || "Feed correlato"}
                            </span>
                          </div>
                          <button
                            onClick={() => addTagFeed(feed)}
                            disabled={isAdded}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1 ${
                              isAdded 
                                ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                                : "bg-indigo-600 hover:bg-indigo-700 text-white"
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Aggiunto
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Aggiungi
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setSelectedTag(selectedTag === tagModal.tag ? null : tagModal.tag);
                    setTagModal(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 font-semibold rounded-2xl text-sm transition-all cursor-pointer"
                >
                  <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  {selectedTag === tagModal.tag ? "Disattiva filtro tag" : `Filtra notizie per #${tagModal.tag}`}
                </button>

                <button
                  onClick={() => setTagModal(null)}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl text-sm transition-all cursor-pointer"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSelectedSummary(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 transition-colors" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-indigo-950/20 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Summary Completo</h2>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {selectedSummary.source} â€¢ {selectedSummary.pubDate ? format(new Date(selectedSummary.pubDate), "d MMMM yyyy, HH:mm", { locale: it }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleSaveArticle(selectedSummary)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    selectedSummary.isSaved
                      ? "text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400"
                      : "text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                  title={selectedSummary.isSaved ? "Rimuovi da Leggi dopo" : "Salva in Leggi dopo"}
                >
                  {selectedSummary.isSaved ? (
                    <BookmarkCheck className="w-5 h-5 fill-amber-500 dark:fill-amber-400" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setInfoModalArticle(selectedSummary)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                  title="Criteri di visualizzazione"
                >
                  <Info className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleShareArticle(selectedSummary)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                  title="Condividi riassunto e notizia"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button onClick={() => setSelectedSummary(null)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl leading-snug">{selectedSummary.title}</h3>
                <a
                  href={selectedSummary.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markAsRead(selectedSummary.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
                >
                  <span>Apri link remoto</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {isRegenerating ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                   <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                   <p className="font-medium text-sm">Generazione quadro completo della notizia con l'AI...</p>
                </div>
              ) : summaryError ? (
                <div className="py-6 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-100 dark:border-rose-800/40 mb-4 text-center">
                  <p className="font-medium text-sm">{summaryError}</p>
                </div>
              ) : (
                <>
                  {selectedSummary.aiTags && selectedSummary.aiTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {selectedSummary.aiTags.map((tag, idx) => {
                        const isExcluded = isTagExcluded(tag);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedSummary(null);
                              setTagModal({ tag });
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              isExcluded
                                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 line-through"
                                : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100"
                            }`}
                            title="Clicca per gestire o escludere questo tag"
                          >
                            {isExcluded ? (
                              <ShieldMinus className="w-3 h-3 text-rose-500" />
                            ) : (
                              <span className="opacity-60 text-[10px]">#</span>
                            )}
                            <span>{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="max-w-none">
                    <FormattedSummary summaryText={selectedSummary.aiSummary} />
                  </div>
                </>
              )}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {selectedSummary.aiRelevance > 0 && (
                  <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-700">
                    Rilevanza: {selectedSummary.aiRelevance}/100
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleSaveArticle(selectedSummary)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 border font-medium rounded-xl text-sm transition-colors cursor-pointer ${
                    selectedSummary.isSaved
                      ? "bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100"
                      : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                  title={selectedSummary.isSaved ? "Rimuovi dai salvati" : "Salva in Leggi dopo"}
                >
                  {selectedSummary.isSaved ? (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
                      <span>Salvato</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Leggi dopo</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleShareArticle(selectedSummary)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                  title="Condividi notizia e riassunto"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Condividi</span>
                </button>
                <button 
                  onClick={() => generateSummary(selectedSummary.id)}
                  disabled={isRegenerating}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer"
                  title="Rigenera con il nuovo modello approfondito"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Rigenera
                </button>
                <button 
                  onClick={() => setSelectedSummary(null)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
                <a
                  href={selectedSummary.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    markAsRead(selectedSummary.id);
                    setSelectedSummary(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs"
                >
                  Fonte originale <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Criteri di Visualizzazione Modal */}
      {infoModalArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base sm:text-lg">
                <Info className="w-5 h-5" />
                <span>Criteri di Visualizzazione</span>
              </div>
              <button 
                onClick={() => setInfoModalArticle(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Titolo Notizia</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5">{infoModalArticle.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Sorgente</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{infoModalArticle.source || "RSS Feed"}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Rilevanza AI</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-400">{infoModalArticle.aiRelevance}/100</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Questa notizia compare nel tuo feed perché è pubblicata da <strong className="text-slate-900 dark:text-slate-100">{infoModalArticle.source || 'RSS Feed'}</strong> ed è associata ai tuoi temi di interesse.
              </p>

              {infoModalArticle.aiTags && infoModalArticle.aiTags.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-slate-400 block mb-1.5">Tag Tematici:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {infoModalArticle.aiTags.map((tag, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-100 dark:border-indigo-900">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              {infoModalArticle.source && (
                <button
                  onClick={async () => {
                    const srcToExclude = infoModalArticle.source;
                    try {
                      await fetch('/api/interests', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ keyword: srcToExclude, type: 'negative', weight: 1.0 })
                      });
                      
                      // Filter local feed instantly
                      setArticles(prev => prev.filter(a => (a.source || "").toLowerCase().trim() !== srcToExclude.toLowerCase().trim()));
                      setFeedbackMessage(`Sorgente "${srcToExclude}" esclusa! Notizie rimosse dal feed.`);
                      setTimeout(() => setFeedbackMessage(null), 5000);
                      
                      setInfoModalArticle(null);
                      setSelectedSummary(null);
                      fetchArticles();
                    } catch (e) {
                      console.error(e);
                      setFeedbackMessage(`Errore durante l'esclusione della sorgente "${srcToExclude}".`);
                      setTimeout(() => setFeedbackMessage(null), 5000);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
                >
                  <ShieldMinus className="w-4 h-4" /> Escludi sorgente "{infoModalArticle.source}"
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Source Confirmation Overlay */}
      {isRemoveSourceConfirmOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[90] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsRemoveSourceConfirmOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Rimuovere la sorgente?
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Vuoi rimuovere definitivamente la sorgente "{selectedSource}"? Questa azione non può essere annullata.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsRemoveSourceConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleRemoveSelectedSource}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Rimuovi
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmOverlay
        isOpen={pendingRegenerateId !== null}
        title="Rigenerare il riassunto?"
        message="Il riassunto AI precedente di questo articolo verrà sovrascritto con uno nuovo."
        confirmLabel="Rigenera"
        confirmingLabel="Generazione..."
        danger={false}
        isConfirming={isRegenerating}
        onConfirm={confirmGenerateSummary}
        onCancel={() => setPendingRegenerateId(null)}
      />

    </div>
  );
}

