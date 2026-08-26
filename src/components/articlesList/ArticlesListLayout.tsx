import React from "react";
import ConfirmOverlay from "../ConfirmOverlay";
import TagActionModal from "../TagActionModal";
import ArticleInfoModal from "../ArticleInfoModal";
import ArticleSummaryModal from "../ArticleSummaryModal";
import SourceSelectorBar from "../SourceSelectorBar";
import ArticlesGrid from "../ArticlesGrid";
import { PullIndicator, FeedbackToast, FilterControls, ActiveTagIndicator } from "../ArticlesListComponents";
import { type ArticlesListState } from "./articlesListTypes";

export function ArticlesListLayout({ actions, refs, state, touch }: { actions: ReturnType<typeof import("./articlesListActions").createArticlesListActions>; refs: ReturnType<typeof import("./useArticlesListUi").useArticlesListRefs>; state: ArticlesListState; touch: ReturnType<typeof import("./useArticlesListUi").usePullToRefresh> }) {
  return (
    <div className="max-w-5xl mx-auto space-y-6" onTouchStart={touch.handleTouchStart} onTouchMove={touch.handleTouchMove} onTouchEnd={touch.handleTouchEnd}>
      <PullIndicator pullDistance={touch.pullDistance} />
      {state.feedbackMessage && <FeedbackToast message={state.feedbackMessage} onClose={() => actions.setFeedbackMessage(null)} />}
      <FilterControls filter={state.filter} sort={state.sort} loading={state.loading} onFilterChange={actions.setFilter} onSortChange={actions.setSort} onRefresh={actions.handleFetchFeeds} />
      <SourceSelectorBar configuredFeeds={state.configuredFeeds} selectedSource={state.selectedSource} onSelectSource={actions.handleSelectSource} />
      {state.selectedTag && <ActiveTagIndicator tag={state.selectedTag} onClear={() => actions.setSelectedTag(null)} />}
      <ArticlesGrid loading={state.loading} articles={state.articles} visibleCount={state.visibleCount} selectedSource={state.selectedSource} selectedTag={state.selectedTag} isCreatingTransformer={state.isCreatingTransformer} isRemovingSource={state.isRemovingSource} transformerFeedback={state.transformerFeedback} isLoadMoreLoading={state.isLoadMoreLoading} recentlyHiddenQueue={state.recentlyHiddenQueue} sentinelRef={refs.sentinelRef} isTagExcluded={actions.isTagExcluded} onTagClick={(tag) => actions.setTagModal({ tag })} onOpenSummary={actions.handleOpenSummary} onToggleRead={actions.toggleReadArticle} onToggleSave={actions.toggleSaveArticle} onHide={actions.hideArticle} onShare={actions.handleShareArticle} onOpenInfo={actions.setInfoModalArticle} onUndoHide={actions.undoHideArticleInline} onCreateTransformer={actions.handleCreateTransformerForSelectedSource} onRequestRemoveSource={() => actions.setIsRemoveSourceConfirmOpen(true)} onShowMore={actions.showMore} />
      {state.tagModal && <TagActionModal tag={state.tagModal.tag} selectedTag={state.selectedTag} searchLoading={state.tagSearchLoading} searchResults={state.tagSearchResults} searchFeedback={state.tagSearchFeedback} allAddedFeeds={state.allAddedFeeds} onSearch={actions.searchFeedsForTag} onAddFeed={actions.addTagFeed} onToggleFilter={(tag) => { actions.setSelectedTag(state.selectedTag === tag ? null : tag); actions.setTagModal(null); }} onClose={() => actions.setTagModal(null)} />}
      {state.selectedSummary && <ArticleSummaryModal article={state.selectedSummary} isRegenerating={state.isRegenerating} summaryError={state.summaryError} isTagExcluded={actions.isTagExcluded} onClose={() => actions.setSelectedSummary(null)} onToggleSave={actions.toggleSaveArticle} onOpenInfo={actions.setInfoModalArticle} onShare={actions.handleShareArticle} onMarkAsRead={actions.markAsRead} onRegenerate={actions.setPendingRegenerateId} onTagClick={(tag) => { actions.setSelectedSummary(null); actions.setTagModal({ tag }); }} />}
      {state.infoModalArticle && <ArticleInfoModal article={state.infoModalArticle} onClose={() => actions.setInfoModalArticle(null)} onExcludeSource={actions.handleExcludeSource} />}
      <ConfirmOverlay isOpen={state.isRemoveSourceConfirmOpen} title="Rimuovere la sorgente?" message={`Vuoi rimuovere definitivamente la sorgente "${state.selectedSource}"? Questa azione non pu� essere annullata.`} confirmLabel="Rimuovi" confirmingLabel="Rimozione..." isConfirming={state.isRemovingSource} danger onConfirm={actions.handleRemoveSelectedSource} onCancel={() => actions.setIsRemoveSourceConfirmOpen(false)} />
      <ConfirmOverlay isOpen={state.pendingRegenerateId !== null} title="Rigenerare il riassunto?" message="Il riassunto AI precedente di questo articolo verr� sovrascritto con uno nuovo." confirmLabel="Rigenera" confirmingLabel="Generazione..." danger={false} isConfirming={state.isRegenerating} onConfirm={actions.confirmGenerateSummary} onCancel={() => actions.setPendingRegenerateId(null)} />
    </div>
  );
}
