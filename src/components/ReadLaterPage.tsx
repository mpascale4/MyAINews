import React from "react";
import { Article } from "../types";
import ConfirmOverlay from "./ConfirmOverlay";
import ArticleInfoModal from "./ArticleInfoModal";
import ReadLaterSummaryModal from "./ReadLaterSummaryModal";
import { ReadLaterPageSections } from "./readLater/ReadLaterPageSections";
import { useReadLaterPageController } from "./readLater/useReadLaterPageController";

interface ReadLaterPageProps {
  onNavigateHome?: () => void;
}

function ReadLaterPageContent({ onNavigateHome }: ReadLaterPageProps) {
  const controller = useReadLaterPageController();
  const { actions, availableTags, filteredArticles, isTagExcluded, state, unreadCount } = controller;
  return (
    <>
      <ReadLaterPageSections articles={state.articles} availableTags={availableTags} feedbackMessage={state.feedbackMessage} filteredArticles={filteredArticles} isTagExcluded={isTagExcluded} loading={state.loading} onHide={actions.handleHide} onNavigateHome={onNavigateHome} onOpenInfo={actions.setInfoModalArticle} onOpenSummary={actions.handleOpenSummary} onRefresh={actions.fetchSavedArticles} onSearchQueryChange={actions.setSearchQuery} onSelectTag={actions.setSelectedTag} onShare={actions.handleShareArticle} onToggleRead={actions.handleToggleRead} onToggleSave={actions.handleToggleSave} onUndoHide={actions.undoHideArticleInline} recentlyHiddenIds={state.recentlyHiddenIds} searchQuery={state.searchQuery} selectedTag={state.selectedTag} setFeedbackMessage={actions.setFeedbackMessage} setStatusFilter={actions.setStatusFilter} statusFilter={state.statusFilter} unreadCount={unreadCount} />
      {state.selectedSummary && <ReadLaterSummaryModal article={state.selectedSummary as Article} isRegenerating={state.isRegenerating} summaryError={state.summaryError} onClose={() => actions.setSelectedSummary(null)} onToggleSave={actions.handleToggleSave} onOpenInfo={actions.setInfoModalArticle} onShare={actions.handleShareArticle} onMarkAsRead={actions.handleToggleRead} onRegenerate={actions.generateSummary} />}
      {state.infoModalArticle && <ArticleInfoModal article={state.infoModalArticle as Article} onClose={() => actions.setInfoModalArticle(null)} onExcludeSource={actions.handleExcludeSource} />}
      <ConfirmOverlay isOpen={state.pendingRegenerateId !== null} title="Rigenerare il riassunto?" message="Il riassunto AI precedente di questo articolo verrà sovrascritto con uno nuovo." confirmLabel="Rigenera" confirmingLabel="Generazione..." danger={false} isConfirming={state.isRegenerating} onConfirm={actions.confirmGenerateSummary} onCancel={() => actions.setPendingRegenerateId(null)} />
    </>
  );
}

export default function ReadLaterPage(props: ReadLaterPageProps) {
  return <ReadLaterPageContent {...props} />;
}
