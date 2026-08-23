import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Article, Interest } from "../types";
import { 
  Bookmark, 
  BookmarkCheck, 
  ExternalLink, 
  CheckCircle, 
  Sparkles, 
  Trash2, 
  Search, 
  Filter, 
  RefreshCw, 
  Share2, 
  BookOpen, 
  Clock, 
  SlidersHorizontal,
  Tag,
  ShieldMinus,
  X,
  Info,
  RotateCcw,
  EyeOff
} from "lucide-react";
import ArticleCardItem from "./ArticleCardItem";
import FormattedSummary from "./FormattedSummary";
import ConfirmOverlay from "./ConfirmOverlay";

function HiddenArticlePlaceholder({ article, onUndo }: { article: Article; onUndo: () => void | Promise<void>; key?: any }) {
  const [timeLeft, setTimeLeft] = useState(6);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full min-h-[300px] flex flex-col justify-between p-6 bg-slate-900 text-white rounded-2xl border-2 border-indigo-500/30 overflow-hidden shadow-lg transition-all duration-300 animate-in fade-in zoom-in-95">
      {/* Background visual element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
          <EyeOff className="w-4 h-4" />
          <span>Notizia Nascosta</span>
        </div>
        
        <div className="space-y-1.5">
          <p className="text-sm font-bold leading-snug line-clamp-3 text-slate-100">
            {article.title}
          </p>
          <p className="text-xs text-slate-400">
            Questa notizia non comparirà più nel tuo feed personalizzato.
          </p>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-800 shrink-0">
        <button
          onClick={onUndo}
          className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Annulla (Riavvia in {timeLeft}s)</span>
        </button>
        
        {/* Animated Progress Bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" 
            style={{ width: `${(timeLeft / 6) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

interface ReadLaterPageProps {
  onNavigateHome?: () => void;
}

export default function ReadLaterPage({ onNavigateHome }: ReadLaterPageProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSummary, setSelectedSummary] = useState<Article | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [pendingRegenerateId, setPendingRegenerateId] = useState<number | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [hiddenArticle, setHiddenArticle] = useState<Article | null>(null);
  const [recentlyHiddenIds, setRecentlyHiddenIds] = useState<Record<number, boolean>>({});
  const [infoModalArticle, setInfoModalArticle] = useState<Article | null>(null);

  const undoHideArticleInline = async (id: number) => {
    setRecentlyHiddenIds(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    await fetch(`/api/articles/${id}/unhide`, { method: "POST" });
  };

  const undoHideArticle = async () => {
    if (!hiddenArticle) return;
    const articleToRestore = hiddenArticle;
    setHiddenArticle(null);
    setArticles(prev => [articleToRestore, ...prev]);
    await fetch(`/api/articles/${articleToRestore.id}/unhide`, { method: "POST" });
  };
  const [interestsList, setInterestsList] = useState<Interest[]>([]);
  const [tagModal, setTagModal] = useState<{ tag: string } | null>(null);

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

  const fetchSavedArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/articles?filter=Saved&sort=Date");
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error("Error loading saved articles:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterests();
    fetchSavedArticles();
  }, []);

  const isTagExcluded = (tagName: string) => {
    const norm = tagName.trim().toLowerCase();
    return interestsList.some(
      i => i.type === "negative" && (i.keyword.trim().toLowerCase() === norm || norm.includes(i.keyword.trim().toLowerCase()))
    );
  };

  const handleToggleRead = async (article: Article) => {
    const newStatus = !article.isRead;
    const endpoint = newStatus ? `/api/articles/${article.id}/read` : `/api/articles/${article.id}/unread`;
    
    // Optimistic UI update
    setArticles(prev => prev.map(a => a.id === article.id ? { ...a, isRead: newStatus } : a));
    if (selectedSummary && selectedSummary.id === article.id) {
      setSelectedSummary(prev => prev ? { ...prev, isRead: newStatus } : null);
    }

    setFeedbackMessage(newStatus ? "Notizia segnata come letta" : "Notizia segnata come non letta");
    setTimeout(() => setFeedbackMessage(null), 3000);

    try {
      await fetch(endpoint, { method: "POST" });
    } catch (err) {
      console.error("Error toggling read status:", err);
    }
  };

  const handleToggleSave = async (article: Article) => {
    // Remove from saved list in this page
    setArticles(prev => prev.filter(a => a.id !== article.id));
    if (selectedSummary && selectedSummary.id === article.id) {
      setSelectedSummary(null);
    }

    setFeedbackMessage("Notizia rimossa da 'Leggi dopo'");
    setTimeout(() => setFeedbackMessage(null), 3000);

    try {
      await fetch(`/api/articles/${article.id}/unsave`, { method: "POST" });
    } catch (err) {
      console.error("Error removing from saved:", err);
    }
  };

  const handleHide = async (id: number) => {
    const article = articles.find(a => a.id === id);
    if (!article) return;
    
    // Set as recently hidden to render inline placeholder
    setRecentlyHiddenIds(prev => ({ ...prev, [id]: true }));
    
    if (selectedSummary && selectedSummary.id === id) {
      setSelectedSummary(null);
    }
    try {
      await fetch(`/api/articles/${id}/hide`, { method: "POST" });
    } catch (err) {
      console.error("Error hiding article:", err);
    }
    
    // In 6 seconds, if it has not been restored, remove it from the articles array and clean up the state
    setTimeout(() => {
      setRecentlyHiddenIds(prev => {
        if (prev[id]) {
          setArticles(currentArticles => currentArticles.filter(a => a.id !== id));
          const updated = { ...prev };
          delete updated[id];
          return updated;
        }
        return prev;
      });
    }, 6000);
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
        setFeedbackMessage("Notizia condivisa!");
        setTimeout(() => setFeedbackMessage(null), 4000);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(`${title}\n${url}`);
      setFeedbackMessage("Link copiato negli appunti!");
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
      setSummaryError("Errore durante la generazione del riassunto.");
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

  // Collect all unique tags in saved articles
  const availableTags = React.useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => {
      if (a.aiTags) {
        a.aiTags.forEach(t => set.add(t));
      }
    });
    return Array.from(set);
  }, [articles]);

  // Filtered articles
  const filteredArticles = articles.filter(article => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = article.title.toLowerCase().includes(q);
      const matchSource = (article.source || "").toLowerCase().includes(q);
      const matchTags = (article.aiTags || []).some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchSource && !matchTags) return false;
    }

    // Status filter
    if (statusFilter === "unread" && article.isRead) return false;
    if (statusFilter === "read" && !article.isRead) return false;

    // Tag filter
    if (selectedTag && (!article.aiTags || !article.aiTags.includes(selectedTag))) return false;

    return true;
  });

  const unreadCount = articles.filter(a => !a.isRead).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
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



      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-indigo-500/20 rounded-3xl p-6 sm:p-8 border border-amber-200/60 dark:border-amber-900/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Bookmark className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Leggi Dopo
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                {articles.length} {articles.length === 1 ? 'notizia salvata' : 'notizie salvate'}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              I tuoi articoli archiviati per una lettura approfondita quando hai più tempo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {unreadCount > 0 && (
            <span className="text-xs font-medium px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
              <strong>{unreadCount}</strong> da leggere
            </span>
          )}
          <button
            onClick={fetchSavedArticles}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
            title="Ricarica elenco salvati"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca nei salvati per titolo, fonte o tag..."
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Tutti ({articles.length})
          </button>
          <button
            onClick={() => setStatusFilter("unread")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "unread"
                ? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Da leggere ({unreadCount})
          </button>
          <button
            onClick={() => setStatusFilter("read")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "read"
                ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Letti ({articles.length - unreadCount})
          </button>
        </div>
      </div>

      {/* Tags Filter Row (if any) */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Filtra Tag:
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              selectedTag === null
                ? "bg-amber-500 text-white font-semibold shadow-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Tutti i tag
          </button>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                selectedTag === tag
                  ? "bg-amber-500 text-white font-semibold shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60"
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {/* Main Articles Grid or Empty State */}
      {loading ? (
        <div className="text-center py-16 flex flex-col items-center justify-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-500" />
          <p className="text-sm font-medium">Caricamento articoli salvati...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/60">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            {articles.length === 0 
              ? "Nessun articolo salvato in 'Leggi dopo'" 
              : "Nessun articolo corrisponde ai filtri"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            {articles.length === 0 
              ? "Clicca sull'icona del segnalibro 📌 su qualsiasi notizia nel feed per salvarla qui e leggerla comodamente in un secondo momento."
              : "Prova a modificare i termini di ricerca o a reimpostare i filtri per visualizzare gli articoli salvati."}
          </p>
          {articles.length === 0 && onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Esplora il Feed Notizie</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article) => {
            const isRecentlyHidden = recentlyHiddenIds[article.id];
            if (isRecentlyHidden) {
              return (
                <HiddenArticlePlaceholder 
                  key={article.id} 
                  article={article} 
                  onUndo={() => undoHideArticleInline(article.id)} 
                />
              );
            }
            return (
              <ArticleCardItem
                key={article.id}
                article={article}
                isTagExcluded={isTagExcluded}
                selectedTag={selectedTag}
                onTagClick={(tag) => setSelectedTag(selectedTag === tag ? null : tag)}
                onOpenSummary={handleOpenSummary}
                onToggleRead={handleToggleRead}
                onToggleSave={handleToggleSave}
                onHide={handleHide}
                onShare={handleShareArticle}
                onOpenInfo={(art) => setInfoModalArticle(art)}
              />
            );
          })}
        </div>
      )}

      {/* AI Summary Modal */}
      {selectedSummary && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSelectedSummary(null)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-slate-50 dark:from-amber-950/40 dark:via-indigo-950/20 dark:to-slate-900 shrink-0">
              <div className="flex items-center gap-2.5 text-indigo-700 dark:text-indigo-300 font-bold">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Bookmark className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Summary • Leggi Dopo</h2>
                  <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    {selectedSummary.source} • {selectedSummary.pubDate ? format(new Date(selectedSummary.pubDate), "d MMMM yyyy, HH:mm", { locale: it }) : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleSave(selectedSummary)}
                  className="p-1.5 text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400 rounded-full transition-colors cursor-pointer"
                  title="Rimuovi da Leggi dopo"
                >
                  <BookmarkCheck className="w-5 h-5 fill-amber-500 dark:fill-amber-400" />
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
                  title="Condividi"
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
                  onClick={() => handleToggleRead(selectedSummary)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
                >
                  <span>Apri link remoto</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {isRegenerating ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                   <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                   <p className="font-medium text-sm">Generazione quadro completo con l'AI...</p>
                </div>
              ) : summaryError ? (
                <div className="py-6 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-100 dark:border-rose-800/40 mb-4 text-center">
                  <p className="font-medium text-sm">{summaryError}</p>
                </div>
              ) : (
                <>
                  {selectedSummary.aiTags && selectedSummary.aiTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {selectedSummary.aiTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60"
                        >
                          <span className="opacity-60 text-[10px]">#</span>
                          <span>{tag}</span>
                        </span>
                      ))}
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
                  onClick={() => handleToggleSave(selectedSummary)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 font-medium rounded-xl text-sm transition-colors cursor-pointer"
                  title="Rimuovi dai salvati"
                >
                  <BookmarkCheck className="w-4 h-4 fill-amber-500" />
                  <span>Salvato</span>
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
                    handleToggleRead(selectedSummary);
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
                      
                      setArticles(prev => prev.filter(a => (a.source || "").toLowerCase().trim() !== srcToExclude.toLowerCase().trim()));
                      setFeedbackMessage(`Sorgente "${srcToExclude}" esclusa! Notizie rimosse.`);
                      setTimeout(() => setFeedbackMessage(null), 5000);
                      
                      setInfoModalArticle(null);
                      setSelectedSummary(null);
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
