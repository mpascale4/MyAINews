import { useEffect, useState } from "react";
import { createReadLaterActions, fetchInterests, fetchSavedArticles } from "./readLaterActions";
import { getAvailableTags, filterArticles, getUnreadCount, isTagExcluded } from "./readLaterUtils";
import { INITIAL_READ_LATER_STATE, type ReadLaterState } from "./readLaterTypes";

function loadInitialData(setState: React.Dispatch<React.SetStateAction<ReadLaterState>>) {
  void fetchInterests(setState);
  void fetchSavedArticles(setState);
}

function buildController(state: ReadLaterState, setState: React.Dispatch<React.SetStateAction<ReadLaterState>>) {
  const actions = createReadLaterActions({ state, setState });
  return {
    actions,
    availableTags: getAvailableTags(state.articles),
    filteredArticles: filterArticles(state.articles, state.searchQuery, state.statusFilter, state.selectedTag),
    isTagExcluded: (tagName: string) => isTagExcluded(state.interestsList, tagName),
    state,
    unreadCount: getUnreadCount(state.articles),
  };
}

export function useReadLaterPageController() {
  const [state, setState] = useState(INITIAL_READ_LATER_STATE);
  useEffect(() => { loadInitialData(setState); }, []);
  return buildController(state, setState);
}
