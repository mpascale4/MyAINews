import type { Dispatch, RefObject, SetStateAction } from "react";
import { addSearchedFeedManually, createTransformerForFeed, deleteFeed, generateFeedsFromInterests, handleExportFeeds, handleImportFeedsClick, handleImportFeedsFile, handleResetAll, loadData, normalizeFeedUrl, searchFeedsAI, testSuggestedFeed } from "./settingsPanelFeedActions";
import { applyExtractedInterests, handleThresholdChange, loadPushSettings, sendInterviewMessage, sendTestNotification, togglePushSubscription } from "./settingsPanelSupportActions";
import type { SettingsPanelState } from "./settingsPanelTypes";

export { loadData, loadPushSettings, normalizeFeedUrl };

type SettingsPanelSetState = Dispatch<SetStateAction<SettingsPanelState>>;

export function createFeedController(
  existingFeedUrls: Set<string>,
  importFileInputRef: RefObject<HTMLInputElement | null>,
  state: SettingsPanelState,
  setState: SettingsPanelSetState,
) {
  return {
    existingFeedUrls,
    importFileInputRef,
    state,
    actions: {
      addSearchedFeedManually: (item: { name: string; url: string; reason: string; category: string }) => addSearchedFeedManually(item, state, setState),
      applyExtractedInterests: () => applyExtractedInterests(state, setState),
      createTransformerForFeed: (feedId: number) => createTransformerForFeed(feedId, setState),
      deleteFeed: (feedId: number) => deleteFeed(feedId, setState),
      generateFeedsFromInterests: () => generateFeedsFromInterests(setState),
      handleExportFeeds: () => handleExportFeeds(state.feeds),
      handleImportFeedsClick: () => handleImportFeedsClick(importFileInputRef),
      handleImportFeedsFile: (event: React.ChangeEvent<HTMLInputElement>) => handleImportFeedsFile(event, state, setState),
      handleResetAll: () => handleResetAll(setState),
      handleThresholdChange: (value: number) => handleThresholdChange(value, setState),
      searchFeedsAI: (event: React.FormEvent) => searchFeedsAI(event, state, setState),
      sendInterviewMessage: (event: React.FormEvent) => sendInterviewMessage(event, state, setState),
      sendTestNotification: () => sendTestNotification(setState),
      setAiOverlayData: (aiOverlayData: SettingsPanelState["aiOverlayData"]) => setState((prev) => ({ ...prev, aiOverlayData })),
      setFeedSearchFeedback: (feedSearchFeedback: string | null) => setState((prev) => ({ ...prev, feedSearchFeedback })),
      setFeedSearchKeyword: (feedSearchKeyword: string) => setState((prev) => ({ ...prev, feedSearchKeyword })),
      setInterviewInput: (interviewInput: string) => setState((prev) => ({ ...prev, interviewInput })),
      setInterviewOpen: (interviewOpen: boolean) => setState((prev) => ({ ...prev, interviewOpen })),
      setImportFeedback: (importFeedback: string | null) => setState((prev) => ({ ...prev, importFeedback })),
      setIsRegenerateConfirmOpen: (isRegenerateConfirmOpen: boolean) => setState((prev) => ({ ...prev, isRegenerateConfirmOpen })),
      setIsResetConfirmOpen: (isResetConfirmOpen: boolean) => setState((prev) => ({ ...prev, isResetConfirmOpen })),
      removePendingFeed: (index: number) => setState((prev) => ({ ...prev, pendingSuggestedFeeds: prev.pendingSuggestedFeeds.filter((_, currentIndex) => currentIndex !== index) })),
      removePendingInterest: (index: number) => setState((prev) => ({ ...prev, pendingExtracted: prev.pendingExtracted.filter((_, currentIndex) => currentIndex !== index) })),
      testSuggestedFeed: (url: string) => testSuggestedFeed(url, setState),
      togglePushSubscription: () => togglePushSubscription(setState),
    },
  };
}
