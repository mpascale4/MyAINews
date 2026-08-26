import { useState } from "react";
import type { Key, MouseEvent } from "react";
import { Article } from "../types";
import { getSourceAccent, getSourceFaviconUrl } from "../lib/sourceStyle";
import { useSwipeGestures } from "../hooks/useSwipeGestures";
import { SwipeActionBackground, ArticleCardBody, SwipeableCardFrame } from "./ArticleCardItemParts";

const SWIPE_THRESHOLD = 80;

interface ArticleCardItemProps {
  key?: Key;
  article: Article;
  isTagExcluded: (tag: string) => boolean;
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  onOpenSummary: (article: Article) => void;
  onToggleRead: (article: Article) => void;
  onToggleSave?: (article: Article) => void;
  onHide: (articleId: number) => void;
  onShare: (article: Article, e?: MouseEvent) => void;
  onOpenInfo?: (article: Article) => void;
  onRestore?: (articleId: number) => void;
  isRestoring?: boolean;
}

export default function ArticleCardItem({
  article,
  selectedTag,
  onTagClick,
  onOpenSummary,
  onToggleRead,
  onToggleSave,
  onHide,
  onShare,
  onOpenInfo,
  onRestore,
  isRestoring,
}: ArticleCardItemProps) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const sourceAccent = getSourceAccent(article.source);
  const faviconUrl = getSourceFaviconUrl(article.link);
  const swipe = useSwipeGestures(article, onOpenSummary, onHide, SWIPE_THRESHOLD);

  return (
    <div className="relative rounded-2xl overflow-hidden group shadow-xs">
      <SwipeActionBackground offsetX={swipe.offsetX} threshold={SWIPE_THRESHOLD} />
      <SwipeableCardFrame
        article={article}
        offsetX={swipe.offsetX}
        isSwiping={swipe.isSwiping}
        onTouchStart={swipe.handleTouchStart}
        onTouchMove={swipe.handleTouchMove}
        onTouchEnd={swipe.handleTouchEnd}
      >
        <ArticleCardBody
          article={article}
          sourceAccent={sourceAccent}
          faviconUrl={faviconUrl}
          faviconFailed={faviconFailed}
          onFaviconError={() => setFaviconFailed(true)}
          onShare={onShare}
          onOpenInfo={onOpenInfo}
          onToggleSave={onToggleSave}
          onHide={onHide}
          onRestore={onRestore}
          isRestoring={isRestoring}
          onToggleRead={onToggleRead}
          selectedTag={selectedTag}
          onTagClick={onTagClick}
          onOpenSummary={onOpenSummary}
        />
      </SwipeableCardFrame>
    </div>
  );
}
