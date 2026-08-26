import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ArticlesListState } from "./articlesListTypes";
import { LOAD_MORE_BATCH, LOAD_MORE_DELAY_MS } from "./articlesListTypes";

export function useArticlesListLoadMore(
  state: ArticlesListState,
  setState: Dispatch<SetStateAction<ArticlesListState>>,
  refs: {
    isLoadMoreLoadingRef: React.MutableRefObject<boolean>;
    loadMoreTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
    loadingRef: React.MutableRefObject<boolean>;
    sentinelRef: React.RefObject<HTMLDivElement | null>;
  },
) {
  useEffect(() => {
    if (!refs.sentinelRef.current || state.articles.length <= state.visibleCount) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !refs.isLoadMoreLoadingRef.current && !refs.loadingRef.current) {
        refs.isLoadMoreLoadingRef.current = true;
        setState((prev) => ({ ...prev, isLoadMoreLoading: true }));
        if (refs.loadMoreTimeoutRef.current) {
          clearTimeout(refs.loadMoreTimeoutRef.current);
        }

        refs.loadMoreTimeoutRef.current = setTimeout(() => {
          refs.isLoadMoreLoadingRef.current = false;
          refs.loadMoreTimeoutRef.current = null;
          setState((prev) => ({ ...prev, isLoadMoreLoading: false, visibleCount: Math.min(prev.visibleCount + LOAD_MORE_BATCH, prev.articles.length) }));
        }, LOAD_MORE_DELAY_MS);
      }
    }, { rootMargin: "250px", threshold: 0.1 });

    observer.observe(refs.sentinelRef.current);
    return () => observer.disconnect();
  }, [refs, setState, state.articles.length, state.visibleCount]);

  useEffect(() => () => {
    if (refs.loadMoreTimeoutRef.current) {
      clearTimeout(refs.loadMoreTimeoutRef.current);
    }
  }, [refs]);
}
