import React, { useState, useEffect } from "react";
import { Article, Interest } from "../types";
import { 
  Bookmark, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  BookOpen, 
  X, 
  RotateCcw,
  EyeOff
} from "lucide-react";
import ArticleCardItem from "./ArticleCardItem";
import ConfirmOverlay from "./ConfirmOverlay";
import ArticleInfoModal from "./ArticleInfoModal";
import ReadLaterSummaryModal from "./ReadLaterSummaryModal";
import { shareArticleHelper } from "./shareArticleHelper";

// Helper: check if article matches search query
function matchesSearchQuery(article: Article, query: string): boolean {
  const q = query.toLowerCase();
  const matchTitle = article.title.toLowerCase().includes(q);
  const matchSource = (article.source || "").toLowerCase().includes(q);
  const matchTags = (article.aiTags || []).some(t => t.toLowerCase().includes(q));
  return matchTitle || matchSource || matchTags;
}

// Helper: check if article matches status filter
function matchesStatusFilter(article: Article, statusFilter: "all" | "unread" | "read"): boolean {
  if (statusFilter === "unread") return !article.isRead;
  if (statusFilter === "read") return article.isRead;
  return true;
}

// Helper: check if article matches tag filter
function matchesTagFilter(article: Article, selectedTag: string | null): boolean {
  if (!selectedTag) return true;
  return !!article.aiTags && article.aiTags.includes(selectedTag);
}

// Helper: filter articles by search, status, and tag
function filterArticles(
  articles: Article[],
  searchQuery: string,
  statusFilter: "all" | "unread" | "read",
  selectedTag: string | null
): Article[] {
  return articles.filter(article => {
    if (searchQuery.trim() && !matchesSearchQuery(article, searchQuery)) return false;
    if (!matchesStatusFilter(article, statusFilter)) return false;
    if (!matchesTagFilter(article, selectedTag)) return false;
    return true;
  });
}

type HiddenArticlePlaceholderProps = {
  article: Article;
  onUndo: () => void | Promise<void>;
};

function HiddenArticlePlaceholder({ article, onUndo }: HiddenArticlePlaceholderProps & React.JSX.IntrinsicAttributes) {
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
            Questa notizia non comparirÃ  piÃ¹ nel tuo feed personalizzato.
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

  const [interestsList, setInterestsList] = useState<Interest[]>([]);

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
    await shareArticleHelper(article, setFeedbackMessage, "Notizia condivisa!");
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
        setSummaryError("Impossibile generare il riassunto. Riprova piÃ¹ tardi.");
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

  const handleExcludeSource = async (srcToExclude: string) => {
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
  const filteredArticles = filterArticles(articles, searchQuery, statusFilter, selectedTag);

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
              I tuoi articoli archiviati per una lettura approfondita quando hai piÃ¹ tempo.
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
              ? "Clicca sull'icona del segnalibro ðŸ“Œ su qualsiasi notizia nel feed per salvarla qui e leggerla comodamente in un secondo momento."
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
        <ReadLaterSummaryModal
          article={selectedSummary}
          isRegenerating={isRegenerating}
          summaryError={summaryError}
          onClose={() => setSelectedSummary(null)}
          onToggleSave={handleToggleSave}
          onOpenInfo={setInfoModalArticle}
          onShare={handleShareArticle}
          onMarkAsRead={handleToggleRead}
          onRegenerate={generateSummary}
        />
      )}
      {/* Criteri di Visualizzazione Modal */}
      {infoModalArticle && (
        <ArticleInfoModal
          article={infoModalArticle}
          onClose={() => setInfoModalArticle(null)}
          onExcludeSource={handleExcludeSource}
        />
      )}

      <ConfirmOverlay
        isOpen={pendingRegenerateId !== null}
        title="Rigenerare il riassunto?"
        message="Il riassunto AI precedente di questo articolo verrÃ  sovrascritto con uno nuovo."
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
