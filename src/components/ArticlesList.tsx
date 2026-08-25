import React, { useState, useEffect, useRef } from "react";
import { Article } from "../types";
import ConfirmOverlay from "./ConfirmOverlay";
import TagActionModal from "./TagActionModal";
import ArticleInfoModal from "./ArticleInfoModal";
import ArticleSummaryModal from "./ArticleSummaryModal";
import SourceSelectorBar from "./SourceSelectorBar";
import ArticlesGrid from "./ArticlesGrid";
import { registerSourceNames } from "../lib/sourceStyle";
import { 
  PullIndicator, 
  FeedbackToast, 
  FilterControls, 
  ActiveTagIndicator 
} from "./ArticlesListComponents";
import { shareArticleHelper as sharedShareHelper } from "./shareArticleHelper";

type FeedListEntry = {
  id?: number;
  url: string;
  name: string;
};

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
  // Excluded / Negative Interests list for reactive tag state
  const [tagModal, setTagModal] = useState<{ tag: string } | null>(null);
  const [tagSearchLoading, setTagSearchLoading] = useState(false);
  const [tagSearchResults, setTagSearchResults] = useState<{ name: string; url: string; reason: string; category: string }[]>([]);
  const [tagSearchFeedback, setTagSearchFeedback] = useState<string | null>(null);
  const [allAddedFeeds, setAllAddedFeeds] = useState<Record<string, boolean>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [, setSourceClickCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem("source_click_counts");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [recentlyHiddenQueue, setRecentlyHiddenQueue] = useState<Article[]>([]);
  const [infoModalArticle, setInfoModalArticle] = useState<Article | null>(null);

  // Fetch all added feeds
  useEffect(() => {
    fetch('/api/feeds')
      .then(res => res.json())
      .then(feeds => {
        const addedMap = feeds.reduce((acc: Record<string, boolean>, feed: FeedListEntry) => {
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

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/feeds");
      if (res.ok) {
        const feedsData = await res.json();
        const feedList = Array.isArray(feedsData) ? feedsData : [];
        registerSourceNames(feedList.map((f: FeedListEntry) => f.name));
        setConfiguredFeeds(feedList);
      }
    } catch (e) {
      console.error("Error fetching sources:", e);
    }
  };

  const fetchArticles = (overrideSource?: string) => {
    setLoading(true);
    const effectiveSource = overrideSource !== undefined ? overrideSource : selectedSource;
    const tagParam = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : "";
    const sourceParam = effectiveSource ? `&source=${encodeURIComponent(effectiveSource)}` : "";
    
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
    fetchSources();
    
    const handleGlobalRefresh = () => {
      fetchArticles();
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
  // TODO: currently a stub (interest-exclusion UI marks tags but doesn't cross-check
  // against the negative interests list yet) — always returns false.
  const isTagExcluded = () => false;

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
      .finally(() => fetchArticles(srcName));
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
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      console.error("Error creating transformer:", err);
      setTransformerFeedback(
        err instanceof Error && err.name === 'AbortError'
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
    } catch (err: unknown) {
      console.error("Error removing source:", err);
      setTransformerFeedback("Errore durante la rimozione della sorgente. Riprova.");
    } finally {
      setIsRemovingSource(false);
    }
  };

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
    setRecentlyHiddenQueue(prev => [...prev, article]);

    // Call hide API immediately
    await fetch(`/api/articles/${id}/hide`, { method: "POST" });

    // In 3 seconds, if it has not been restored, drop it from the undo toast queue
    setTimeout(() => {
      setRecentlyHiddenQueue(prev => prev.filter(a => a.id !== id));
    }, 3000);
  };

  const handleShareArticle = async (article: Article, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await sharedShareHelper(article, setFeedbackMessage);
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

  const handleExcludeSource = async (srcToExclude: string) => {
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
      <PullIndicator pullDistance={pullDistance} />

      {/* Temporary Floating Feedback Toast */}
      {feedbackMessage && (
        <FeedbackToast 
          message={feedbackMessage} 
          onClose={() => setFeedbackMessage(null)} 
        />
      )}

      {/* Controls */}
      <FilterControls
        filter={filter}
        sort={sort}
        loading={loading}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onRefresh={handleFetchFeeds}
      />

      {/* Selezione Sorgente: lista piatta completa di tutte le sorgenti disponibili */}
      <SourceSelectorBar
        configuredFeeds={configuredFeeds}
        selectedSource={selectedSource}
        onSelectSource={handleSelectSource}
      />

      {/* Active Tag Filter Indicator */}
      {selectedTag && (
        <ActiveTagIndicator 
          tag={selectedTag} 
          onClear={() => setSelectedTag(null)} 
        />
      )}

      {/* List */}
      <ArticlesGrid
        loading={loading}
        articles={articles}
        visibleCount={visibleCount}
        selectedSource={selectedSource}
        selectedTag={selectedTag}
        isCreatingTransformer={isCreatingTransformer}
        isRemovingSource={isRemovingSource}
        transformerFeedback={transformerFeedback}
        isLoadMoreLoading={isLoadMoreLoading}
        recentlyHiddenQueue={recentlyHiddenQueue}
        sentinelRef={sentinelRef}
        isTagExcluded={isTagExcluded}
        onTagClick={(tag) => setTagModal({ tag })}
        onOpenSummary={handleOpenSummary}
        onToggleRead={toggleReadArticle}
        onToggleSave={toggleSaveArticle}
        onHide={hideArticle}
        onShare={handleShareArticle}
        onOpenInfo={(art) => setInfoModalArticle(art)}
        onUndoHide={undoHideArticleInline}
        onCreateTransformer={handleCreateTransformerForSelectedSource}
        onRequestRemoveSource={() => setIsRemoveSourceConfirmOpen(true)}
        onShowMore={() => setVisibleCount((prev) => prev + 24)}
      />

      {/* Tag Action Modal (AI Feed search & Filter) */}
      {tagModal && (
        <TagActionModal
          tag={tagModal.tag}
          selectedTag={selectedTag}
          searchLoading={tagSearchLoading}
          searchResults={tagSearchResults}
          searchFeedback={tagSearchFeedback}
          allAddedFeeds={allAddedFeeds}
          onSearch={searchFeedsForTag}
          onAddFeed={addTagFeed}
          onToggleFilter={(tag) => {
            setSelectedTag(selectedTag === tag ? null : tag);
            setTagModal(null);
          }}
          onClose={() => setTagModal(null)}
        />
      )}

      {/* Summary Modal */}
      {selectedSummary && (
        <ArticleSummaryModal
          article={selectedSummary}
          isRegenerating={isRegenerating}
          summaryError={summaryError}
          isTagExcluded={isTagExcluded}
          onClose={() => setSelectedSummary(null)}
          onToggleSave={toggleSaveArticle}
          onOpenInfo={(article) => setInfoModalArticle(article)}
          onShare={handleShareArticle}
          onMarkAsRead={markAsRead}
          onRegenerate={generateSummary}
          onTagClick={(tag) => {
            setSelectedSummary(null);
            setTagModal({ tag });
          }}
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

      {/* Remove Source Confirmation Overlay */}
      <ConfirmOverlay
        isOpen={isRemoveSourceConfirmOpen}
        title="Rimuovere la sorgente?"
        message={`Vuoi rimuovere definitivamente la sorgente "${selectedSource}"? Questa azione non può essere annullata.`}
        confirmLabel="Rimuovi"
        confirmingLabel="Rimozione..."
        isConfirming={isRemovingSource}
        danger
        onConfirm={handleRemoveSelectedSource}
        onCancel={() => setIsRemoveSourceConfirmOpen(false)}
      />

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
