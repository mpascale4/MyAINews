import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Article } from "../types";
import { getSourceAccent, getSourceInitial, getSourceFaviconUrl } from "../lib/sourceStyle";
import { 
  Sparkles, 
  EyeOff, 
  Share2, 
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Info
} from "lucide-react";

interface ArticleCardItemProps {
  key?: React.Key;
  article: Article;
  isTagExcluded: (tag: string) => boolean;
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  onOpenSummary: (article: Article) => void;
  onToggleRead: (article: Article) => void;
  onToggleSave?: (article: Article) => void;
  onHide: (articleId: number) => void;
  onShare: (article: Article, e?: React.MouseEvent) => void;
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
  // Swipe State
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalGesture = useRef<boolean | null>(null);

  const sourceAccent = getSourceAccent(article.source);
  const faviconUrl = getSourceFaviconUrl(article.link);

  const SWIPE_THRESHOLD = 80; // Distance in px to trigger action on release

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalGesture.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    // Detect if this is a horizontal swipe vs a vertical scroll
    if (isHorizontalGesture.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          isHorizontalGesture.current = true;
        } else {
          isHorizontalGesture.current = false;
        }
      }
    }

    if (isHorizontalGesture.current) {
      // Apply rubber-banding resistance beyond threshold
      let adjustedDelta = deltaX;
      if (Math.abs(deltaX) > 120) {
        const excess = Math.abs(deltaX) - 120;
        adjustedDelta = (deltaX > 0 ? 120 : -120) + (deltaX > 0 ? 1 : -1) * Math.sqrt(excess) * 4;
      }
      setOffsetX(adjustedDelta);
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (isHorizontalGesture.current) {
      if (offsetX > SWIPE_THRESHOLD) {
        // Swiped Right -> Open AI Summary
        onOpenSummary(article);
      } else if (offsetX < -SWIPE_THRESHOLD) {
        // Swiped Left -> Hide article
        onHide(article.id);
      }
    }

    // Reset offset with spring animation
    setOffsetX(0);
    isHorizontalGesture.current = null;
  };

  // Determine swipe visuals
  const isSwipeRight = offsetX > 20;
  const isSwipeLeft = offsetX < -20;
  const reachedThreshold = Math.abs(offsetX) >= SWIPE_THRESHOLD;

  return (
    <div className="relative rounded-2xl overflow-hidden group shadow-xs">
      {/* Background Action Underlays (revealed on horizontal swipe) */}
      <div className="absolute inset-0 flex items-stretch justify-between rounded-2xl pointer-events-none">
        {/* Right Swipe Action Background: Open AI Summary */}
        <div 
          className={`flex items-center gap-2 pl-6 pr-4 transition-colors duration-150 w-1/2 justify-start ${
            isSwipeRight 
              ? reachedThreshold 
                ? "bg-indigo-600 text-white font-bold" 
                : "bg-indigo-500/80 text-white"
              : "opacity-0"
          }`}
        >
          <Sparkles className={`w-6 h-6 transition-transform ${reachedThreshold ? "scale-125" : "scale-100"}`} />
          <span className="text-sm font-semibold whitespace-nowrap">
            {reachedThreshold ? "Rilascia per AI Summary" : "AI Summary"}
          </span>
        </div>

        {/* Left Swipe Action Background: Hide Article */}
        <div 
          className={`flex items-center gap-2 pr-6 pl-4 transition-colors duration-150 w-1/2 justify-end ${
            isSwipeLeft 
              ? reachedThreshold 
                ? "bg-rose-600 text-white font-bold" 
                : "bg-rose-500/80 text-white"
              : "opacity-0"
          }`}
        >
          <span className="text-sm font-semibold whitespace-nowrap">
            {reachedThreshold ? "Rilascia per Nascondere" : "Nascondi"}
          </span>
          <EyeOff className={`w-6 h-6 transition-transform ${reachedThreshold ? "scale-125" : "scale-100"}`} />
        </div>
      </div>

      {/* Front Card Container */}
      <article
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)"
        }}
        className={`relative z-10 bg-white dark:bg-slate-900 rounded-2xl border flex flex-col overflow-hidden transition-all hover:shadow-md select-none sm:select-auto ${
          article.isRead 
            ? "border-slate-200/60 dark:border-slate-800/60 opacity-85" 
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="p-5 flex flex-col flex-1">
          {/* Header Row: Source, Date, Bookmark & Share */}
          <div className={`flex items-center justify-between mb-3 -mx-5 -mt-5 px-5 py-3 rounded-t-2xl border-b-2 border-black/10 dark:border-white/10 ${sourceAccent.bg}`}>
            <div
              className="flex items-center gap-1.5 min-w-0 mr-2"
            >
              <span
                className="w-4 h-4 flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                {faviconUrl && !faviconFailed ? (
                  <img
                    src={faviconUrl}
                    alt=""
                    className="w-3.5 h-3.5 object-contain"
                    onError={() => setFaviconFailed(true)}
                  />
                ) : (
                  <span className={`text-[11px] font-black ${sourceAccent.text}`}>{getSourceInitial(article.source)}</span>
                )}
              </span>
              <span className={`text-xs font-semibold uppercase tracking-wider truncate ${sourceAccent.text}`}>
                {article.source}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-xs mr-1 ${sourceAccent.text} opacity-70`}>
                {article.pubDate ? format(new Date(article.pubDate), "d MMM, HH:mm", { locale: it }) : ''}
              </span>

              {/* Quick Share Button on Card */}
              <button 
                onClick={(e) => onShare(article, e)}
                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                title="Condividi notizia"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Info, Leggi dopo & Nascondi Buttons Row above Title */}
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            {/* Info Button */}
            {onOpenInfo && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenInfo(article);
                }}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-200/70 dark:border-slate-700/70"
                title="Criteri di visualizzazione"
              >
                <Info className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>Info</span>
              </button>
            )}

            {/* Bookmark / Leggi dopo Button */}
            {onToggleSave && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSave(article);
                }}
                className={`flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer px-2 py-1 rounded-lg border ${
                  article.isSaved
                    ? "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border-amber-200/70 dark:border-amber-800/70"
                    : "text-slate-600 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200/70 dark:border-slate-700/70"
                }`}
                title={article.isSaved ? "Rimuovi da Leggi dopo" : "Salva in Leggi dopo"}
              >
                {article.isSaved ? (
                  <BookmarkCheck className="w-3.5 h-3.5 fill-amber-500 dark:fill-amber-400" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5" />
                )}
                <span>Leggi dopo</span>
              </button>
            )}

            {/* Nascondi Button */}
            {!onRestore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onHide(article.id);
                }}
                className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors cursor-pointer bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 px-2 py-1 rounded-lg border border-rose-200/70 dark:border-rose-800/70"
                title="Nascondi notizia"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Nascondi</span>
              </button>
            )}

            {/* Ripristina Button (Cestino only) */}
            {onRestore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(article.id);
                }}
                disabled={isRestoring}
                className="flex items-center gap-1 text-xs text-indigo-700 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 font-medium transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 px-2 py-1 rounded-lg border border-indigo-200/70 dark:border-indigo-800/70 disabled:opacity-50"
                title="Ripristina notizia"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ripristina</span>
              </button>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight mb-2.5 line-clamp-3">
            <a 
              href={article.link} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => onToggleRead(article)}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {article.title}
            </a>
          </h3>

          {/* AI Tags */}
          {article.aiTags && article.aiTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
              {article.aiTags.map((tag, idx) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick(tag);
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs ring-2 ring-indigo-300 dark:ring-indigo-700"
                        : "bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:border-indigo-800"
                    }`}
                    title={`Clicca per cercare feed correlati con l'AI: #${tag}`}
                  >
                    <span className="opacity-60 text-[10px]">#</span>
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* AI Summary Trigger Bar */}
          <div 
            className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-xl p-3 mt-auto cursor-pointer hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-between"
            onClick={() => onOpenSummary(article)}
            title="Clicca per aprire il riassunto completo AI"
          >
            <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-semibold tracking-wide">AI Summary Completo</span>
            </div>
            {article.aiRelevance > 0 && (
              <span className="text-xs font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">
                {article.aiRelevance}/100
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
