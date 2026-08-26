import { useEffect, useState } from "react";
import { createArticlesListActions, createSourceClickCountsState, fetchAllAddedFeeds, fetchArticles, fetchSources, resetArticlesListState, resetTagSearchForModal } from "./articlesListActions";
import { useArticlesListLoadMore } from "./useArticlesListLoadMore";
import { useArticlesListRefs, usePullToRefresh } from "./useArticlesListUi";

export function useArticlesListController() {
  const [state, setState] = useState(resetArticlesListState);
  const [, setSourceClickCounts] = useState<Record<string, number>>(createSourceClickCountsState);
  const refs = useArticlesListRefs(state.loading);
  const actions = createArticlesListActions({ refs, setSourceClickCounts, state, setState });
  const touch = usePullToRefresh(actions.handleFetchFeeds, state.loading);

  useEffect(() => { void fetchAllAddedFeeds(setState); void fetchSources(setState); }, []);
  useEffect(() => { resetTagSearchForModal(setState); }, [state.tagModal]);
  useEffect(() => {
    const handleGlobalRefresh = () => { void fetchArticles(state, setState); void fetchSources(setState); };
    window.addEventListener("refresh-articles", handleGlobalRefresh);
    return () => window.removeEventListener("refresh-articles", handleGlobalRefresh);
  }, [setState, state.filter, state.selectedSource, state.selectedTag, state.sort]);
  useEffect(() => {
    if (refs.skipNextSourceFetchRef.current) {
      refs.skipNextSourceFetchRef.current = false;
      return;
    }
    void fetchArticles(state, setState);
  }, [refs.skipNextSourceFetchRef, setState, state.filter, state.selectedSource, state.selectedTag, state.sort]);

  useArticlesListLoadMore(state, setState, refs);
  return { actions, refs, state, touch };
}
