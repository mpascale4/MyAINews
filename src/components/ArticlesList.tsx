import { Loader2, RefreshCw, Rss } from "lucide-react";
import { shareArticle } from "../lib/shareArticleHelper";
import ArticleCardItem from "./ArticleCardItem";
import ArticleInfoModal from "./ArticleInfoModal";
import ArticleSummaryModal from "./ArticleSummaryModal";
import { useArticlesFeed, useArticleSummary } from "./articlesListHooks";
import SourceSelectorBar from "./SourceSelectorBar";

function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <Rss className="mx-auto h-8 w-8 text-indigo-500" />
      <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">Nessun feed configurato</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Apri Impostazioni per aggiungere almeno una sorgente RSS.</p>
    </div>
  );
}

function ArticlesGrid({ visibleArticles, onOpenSummary, onOpenInfo }: { visibleArticles: ReturnType<typeof useArticlesFeed>["visibleArticles"]; onOpenSummary: (article: (typeof visibleArticles)[number]) => void; onOpenInfo: (article: (typeof visibleArticles)[number]) => void }) {
  return (
    <div role="list" className="grid grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-6">
      {visibleArticles.map((article) => (
        <div key={article.guid} role="listitem">
          <ArticleCardItem article={article} onOpenSummary={(item) => void onOpenSummary(item)} onShare={(item) => { void shareArticle(item); }} onOpenInfo={onOpenInfo} />
        </div>
      ))}
    </div>
  );
}

function ArticlesOverlay({
  selectedArticle,
  isRegenerating,
  summaryError,
  infoArticle,
  onCloseSummary,
  onShareSummary,
  onRegenerateSummary,
  onCloseInfo,
}: {
  selectedArticle: ReturnType<typeof useArticleSummary>["selectedArticle"];
  isRegenerating: boolean;
  summaryError: string | null;
  infoArticle: ReturnType<typeof useArticleSummary>["infoArticle"];
  onCloseSummary: () => void;
  onShareSummary: (article: NonNullable<ReturnType<typeof useArticleSummary>["selectedArticle"]>) => void;
  onRegenerateSummary: (article: NonNullable<ReturnType<typeof useArticleSummary>["selectedArticle"]>) => void;
  onCloseInfo: () => void;
}) {
  return (
    <>
      {selectedArticle ? <ArticleSummaryModal article={selectedArticle} isRegenerating={isRegenerating} summaryError={summaryError} onClose={onCloseSummary} onShare={onShareSummary} onRegenerate={onRegenerateSummary} /> : null}
      {infoArticle ? <ArticleInfoModal article={infoArticle} onClose={onCloseInfo} /> : null}
    </>
  );
}

function ArticlesHeader({ feedState }: { feedState: ReturnType<typeof useArticlesFeed> }) {
  const isBusy = feedState.loading || feedState.refreshing;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Notizie</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Articoli caricati in tempo reale dai feed configurati.</p>
      </div>
      <button type="button" onClick={() => void feedState.load(true)} disabled={isBusy} className={`inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${isBusy ? "" : "cursor-pointer"}`}>
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Aggiorna
      </button>
    </div>
  );
}

export default function ArticlesList() {
  const feedState = useArticlesFeed();
  const summaryState = useArticleSummary(feedState.setArticles);
  const showEmptyState = !feedState.loading && feedState.feeds.length === 0;
  const showLoadingState = feedState.loading;
  const showLoadMore = feedState.articles.length > feedState.visibleCount;

  if (showEmptyState) {
    return <EmptyState />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ArticlesHeader feedState={feedState} />
      {feedState.errors.length > 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{feedState.errors.map((error) => <p key={error}>{error}</p>)}</div> : null}
      {feedState.feeds.length > 0 ? <SourceSelectorBar feeds={feedState.feeds} selectedSource={feedState.selectedSource} onSelectSource={feedState.setSelectedSource} /> : null}
      {showLoadingState ? (
        <div className="flex items-center justify-center py-16 text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          Caricamento notizie...
        </div>
      ) : (
        <ArticlesGrid visibleArticles={feedState.visibleArticles} onOpenSummary={summaryState.handleOpenSummary} onOpenInfo={summaryState.setInfoArticle} />
      )}
      {showLoadMore ? <button type="button" onClick={() => feedState.setVisibleCount((count) => count + 24)} className="mx-auto block cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">Mostra altre notizie</button> : null}
      <ArticlesOverlay
        selectedArticle={summaryState.selectedArticle}
        isRegenerating={summaryState.isRegenerating}
        summaryError={summaryState.summaryError}
        infoArticle={summaryState.infoArticle}
        onCloseSummary={() => summaryState.setSelectedArticle(null)}
        onShareSummary={(article) => {
          void shareArticle(article);
        }}
        onRegenerateSummary={(article) => {
          void summaryState.handleRegenerateSummary(article);
        }}
        onCloseInfo={() => summaryState.setInfoArticle(null)}
      />
    </div>
  );
}
