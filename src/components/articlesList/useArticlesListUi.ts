import { useEffect, useRef, useState } from "react";

export function useArticlesListRefs(loading: boolean) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipNextSourceFetchRef = useRef(false);
  const isLoadMoreLoadingRef = useRef(false);
  const loadingRef = useRef(loading);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  return { isLoadMoreLoadingRef, loadMoreTimeoutRef, loadingRef, sentinelRef, skipNextSourceFetchRef };
}

export function usePullToRefresh(onRefresh: () => Promise<void>, loading: boolean) {
  const [pullDistance, setPullDistance] = useState(0);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = (event: React.TouchEvent) => {
    const scrollContainer = document.getElementById("main-scroll-container");
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      startYRef.current = event.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isPullingRef.current) {
      return;
    }

    const distance = event.touches[0].clientY - startYRef.current;
    setPullDistance(distance > 0 ? Math.min(distance * 0.4, 100) : 0);
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) {
      return;
    }

    const shouldRefresh = pullDistance > 60 && !loading;
    setPullDistance(0);
    isPullingRef.current = false;
    startYRef.current = 0;
    if (shouldRefresh) {
      await onRefresh();
    }
  };

  return { handleTouchEnd, handleTouchMove, handleTouchStart, pullDistance };
}
