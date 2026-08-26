import React from "react";
import { Bookmark, BookOpen, CheckCircle, RefreshCw, Search, X } from "lucide-react";
import { Article } from "../../types";
import ArticleCardItem from "../ArticleCardItem";
import { HiddenArticlePlaceholder } from "./HiddenArticlePlaceholder";
import type { StatusFilter } from "./readLaterTypes";

function ToastNotification({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed top-20 right-4 sm:right-6 z-[100] flex items-center justify-between gap-3 bg-slate-900 dark:bg-slate-800 text-white px-5 py-3.5 rounded-2xl text-sm font-medium shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-top-4 duration-300 max-w-md w-11/12 sm:w-auto">
      <div className="flex items-center gap-2.5"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /><span className="text-sm sm:text-sm">{message}</span></div>
      <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
}

function ReadLaterHeader({ articleCount, loading, onRefresh, unreadCount }: { articleCount: number; loading: boolean; onRefresh: () => void | Promise<void>; unreadCount: number }) {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-indigo-500/10 dark:from-amber-500/20 dark:via-amber-500/10 dark:to-indigo-500/20 rounded-3xl p-6 sm:p-8 border border-amber-200/60 dark:border-amber-900/50 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-4"><div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0"><Bookmark className="w-6 h-6 fill-white" /></div><div><div className="flex items-center gap-2.5"><h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leggi Dopo</h1><span className="text-sm font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">{articleCount} {articleCount === 1 ? "notizia salvata" : "notizie salvate"}</span></div><p className="text-sm text-slate-600 dark:text-slate-400 mt-1">I tuoi articoli archiviati per una lettura approfondita quando hai pi� tempo.</p></div></div>
      <div className="flex items-center gap-2 self-start sm:self-auto">{unreadCount > 0 && <span className="text-sm font-medium px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80"><strong>{unreadCount}</strong> da leggere</span>}<button onClick={onRefresh} disabled={loading} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs" title="Ricarica elenco salvati"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></button></div>
    </div>
  );
}

function ReadLaterFiltersBar(props: { articlesCount: number; onSearchQueryChange: (value: string) => void; searchQuery: string; setStatusFilter: (statusFilter: StatusFilter) => void; statusFilter: StatusFilter; unreadCount: number }) {
  const { articlesCount, onSearchQueryChange, searchQuery, setStatusFilter, statusFilter, unreadCount } = props;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      <div className="relative flex-1"><Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Cerca nei salvati per titolo, fonte o tag..." className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />{searchQuery && <button onClick={() => onSearchQueryChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"><X className="w-3.5 h-3.5" /></button>}</div>
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl shrink-0"><button onClick={() => setStatusFilter("all")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${statusFilter === "all" ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>Tutti ({articlesCount})</button><button onClick={() => setStatusFilter("unread")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${statusFilter === "unread" ? "bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>Da leggere ({unreadCount})</button><button onClick={() => setStatusFilter("read")} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${statusFilter === "read" ? "bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}>Letti ({articlesCount - unreadCount})</button></div>
    </div>
  );
}

function ReadLaterTagsRow({ availableTags, selectedTag, onSelectTag }: { availableTags: string[]; selectedTag: string | null; onSelectTag: (tag: string | null) => void }) {
  if (availableTags.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">Filtra Tag:</span>
      <button onClick={() => onSelectTag(null)} className={`px-2.5 py-1 rounded-lg text-sm font-medium shrink-0 transition-colors cursor-pointer ${selectedTag === null ? "bg-amber-500 text-white font-semibold shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"}`}>Tutti i tag</button>
      {availableTags.map((tag) => <button key={tag} onClick={() => onSelectTag(selectedTag === tag ? null : tag)} className={`px-2.5 py-1 rounded-lg text-sm font-medium shrink-0 transition-colors cursor-pointer ${selectedTag === tag ? "bg-amber-500 text-white font-semibold shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60"}`}>#{tag}</button>)}
    </div>
  );
}

function ReadLaterEmptyState({ articleCount, onNavigateHome }: { articleCount: number; onNavigateHome?: () => void }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-xs max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800/60"><Bookmark className="w-8 h-8" /></div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">{articleCount === 0 ? "Nessun articolo salvato in 'Leggi dopo'" : "Nessun articolo corrisponde ai filtri"}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{articleCount === 0 ? "Clicca sull'icona del segnalibro ?? su qualsiasi notizia nel feed per salvarla qui e leggerla comodamente in un secondo momento." : "Prova a modificare i termini di ricerca o a reimpostare i filtri per visualizzare gli articoli salvati."}</p>
      {articleCount === 0 && onNavigateHome && <button onClick={onNavigateHome} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs cursor-pointer"><BookOpen className="w-4 h-4" /><span>Esplora il Feed Notizie</span></button>}
    </div>
  );
}

function ReadLaterArticlesGrid(props: { articles: Article[]; isTagExcluded: (tag: string) => boolean; onHide: (articleId: number) => void; onOpenInfo: (article: Article) => void; onOpenSummary: (article: Article) => void; onShare: (article: Article, event?: React.MouseEvent) => void | Promise<void>; onTagClick: (tag: string) => void; onToggleRead: (article: Article) => void; onToggleSave: (article: Article) => void; recentlyHiddenIds: Record<number, boolean>; selectedTag: string | null; onUndoHide: (articleId: number) => void | Promise<void> }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{props.articles.map((article) => props.recentlyHiddenIds[article.id] ? <HiddenArticlePlaceholder key={article.id} article={article} onUndo={() => props.onUndoHide(article.id)} /> : <ArticleCardItem key={article.id} article={article} isTagExcluded={props.isTagExcluded} selectedTag={props.selectedTag} onTagClick={props.onTagClick} onOpenSummary={props.onOpenSummary} onToggleRead={props.onToggleRead} onToggleSave={props.onToggleSave} onHide={props.onHide} onShare={props.onShare} onOpenInfo={props.onOpenInfo} />)}</div>;
}

export function ReadLaterPageSections(props: { articles: Article[]; availableTags: string[]; feedbackMessage: string | null; filteredArticles: Article[]; isTagExcluded: (tag: string) => boolean; loading: boolean; onHide: (articleId: number) => void; onNavigateHome?: () => void; onOpenInfo: (article: Article) => void; onOpenSummary: (article: Article) => void; onRefresh: () => void | Promise<void>; onSearchQueryChange: (value: string) => void; onSelectTag: (tag: string | null) => void; onShare: (article: Article, event?: React.MouseEvent) => void | Promise<void>; onToggleRead: (article: Article) => void; onToggleSave: (article: Article) => void; onUndoHide: (articleId: number) => void | Promise<void>; recentlyHiddenIds: Record<number, boolean>; searchQuery: string; selectedTag: string | null; setFeedbackMessage: (message: string | null) => void; setStatusFilter: (statusFilter: StatusFilter) => void; statusFilter: StatusFilter; unreadCount: number }) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {props.feedbackMessage && <ToastNotification message={props.feedbackMessage} onClose={() => props.setFeedbackMessage(null)} />}
      <ReadLaterHeader articleCount={props.articles.length} loading={props.loading} onRefresh={props.onRefresh} unreadCount={props.unreadCount} />
      <ReadLaterFiltersBar articlesCount={props.articles.length} searchQuery={props.searchQuery} onSearchQueryChange={props.onSearchQueryChange} setStatusFilter={props.setStatusFilter} statusFilter={props.statusFilter} unreadCount={props.unreadCount} />
      <ReadLaterTagsRow availableTags={props.availableTags} selectedTag={props.selectedTag} onSelectTag={props.onSelectTag} />
      {props.loading ? <div className="text-center py-16 flex flex-col items-center justify-center text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-3 text-amber-500" /><p className="text-sm font-medium">Caricamento articoli salvati...</p></div> : props.filteredArticles.length === 0 ? <ReadLaterEmptyState articleCount={props.articles.length} onNavigateHome={props.onNavigateHome} /> : <ReadLaterArticlesGrid articles={props.filteredArticles} isTagExcluded={props.isTagExcluded} onHide={props.onHide} onOpenInfo={props.onOpenInfo} onOpenSummary={props.onOpenSummary} onShare={props.onShare} onTagClick={(tag) => props.onSelectTag(props.selectedTag === tag ? null : tag)} onToggleRead={props.onToggleRead} onToggleSave={props.onToggleSave} onUndoHide={props.onUndoHide} recentlyHiddenIds={props.recentlyHiddenIds} selectedTag={props.selectedTag} />}
    </div>
  );
}
