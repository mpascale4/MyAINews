import { useOnboardingSearch, useSelectedFeeds } from "./onboardingHooks";

export function useOnboardingFeeds(onComplete: () => void) {
  const search = useOnboardingSearch();
  const selected = useSelectedFeeds();

  return {
    searchKeyword: search.searchKeyword,
    setSearchKeyword: search.setSearchKeyword,
    manualName: selected.manualName,
    setManualName: selected.setManualName,
    manualUrl: selected.manualUrl,
    setManualUrl: selected.setManualUrl,
    searchResults: search.searchResults,
    searchLoading: search.searchLoading,
    searchError: search.searchError,
    selectedFeeds: selected.selectedFeeds,
    finishing: selected.finishing,
    handleSearch: search.handleSearch,
    addFeed: selected.addFeed,
    addManualFeed: selected.addManualFeed,
    removeFeed: selected.removeFeed,
    handleFinish: () => selected.complete(onComplete),
  };
}
