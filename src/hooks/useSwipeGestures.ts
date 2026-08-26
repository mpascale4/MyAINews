import { useState, useRef } from "react";
import { Article } from "../types";

const SWIPE_DIRECTION_LOCK_PX = 8;
const SWIPE_RUBBER_BAND_LIMIT_PX = 120;
const SWIPE_RUBBER_BAND_STRENGTH = 4;

// Applies a "rubber band" resistance past SWIPE_RUBBER_BAND_LIMIT_PX so the
// card doesn't slide indefinitely with the finger.
function applyRubberBandResistance(deltaX: number): number {
  if (Math.abs(deltaX) <= SWIPE_RUBBER_BAND_LIMIT_PX) return deltaX;
  const excess = Math.abs(deltaX) - SWIPE_RUBBER_BAND_LIMIT_PX;
  const sign = deltaX > 0 ? 1 : -1;
  return sign * SWIPE_RUBBER_BAND_LIMIT_PX + sign * Math.sqrt(excess) * SWIPE_RUBBER_BAND_STRENGTH;
}

// Touch-swipe gesture handling for article cards: swipe right opens the AI
// summary, swipe left hides the article. Only fires once a mostly-horizontal
// gesture is detected, so vertical scrolling isn't hijacked.
export function useSwipeGestures(
  article: Article,
  onOpenSummary: (article: Article) => void,
  onHide: (articleId: number) => void,
  threshold: number
) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalGesture = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalGesture.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const deltaX = e.touches[0].clientX - startXRef.current;
    const deltaY = e.touches[0].clientY - startYRef.current;

    if (isHorizontalGesture.current === null && (Math.abs(deltaX) > SWIPE_DIRECTION_LOCK_PX || Math.abs(deltaY) > SWIPE_DIRECTION_LOCK_PX)) {
      isHorizontalGesture.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (isHorizontalGesture.current) {
      setOffsetX(applyRubberBandResistance(deltaX));
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (isHorizontalGesture.current) {
      if (offsetX > threshold) onOpenSummary(article);
      else if (offsetX < -threshold) onHide(article.id);
    }

    setOffsetX(0);
    isHorizontalGesture.current = null;
  };

  return { offsetX, isSwiping, handleTouchStart, handleTouchMove, handleTouchEnd };
}
