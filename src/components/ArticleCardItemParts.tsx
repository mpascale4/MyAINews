import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { ReactNode, TouchEvent, MouseEvent } from "react";
import { Article } from "../types";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";
import { Sparkles, Share2, EyeOff } from "lucide-react";
import { ActionButtons } from "./ArticleCardActionButtons";

interface SwipeableCardFrameProps {
  article: Article;
  offsetX: number;
  isSwiping: boolean;
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: () => void;
  children: ReactNode;
}

// Wraps the card content with the swipe transform/transition and read/unread border styling.
export function SwipeableCardFrame({ article, offsetX, isSwiping, onTouchStart, onTouchMove, onTouchEnd, children }: SwipeableCardFrameProps) {
  return (
    <article
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transform: `translateX(${offsetX}px)`,
        transition: isSwiping ? "none" : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      className={`relative z-10 bg-white dark:bg-slate-900 rounded-2xl border flex flex-col overflow-hidden transition-all hover:shadow-md select-none sm:select-auto ${
        article.isRead ? "border-slate-200/60 dark:border-slate-800/60 opacity-85" : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {children}
    </article>
  );
}

export function SwipeActionBackground({ offsetX, threshold }: { offsetX: number; threshold: number }) {
  const isSwipeRight = offsetX > 20;
  const isSwipeLeft = offsetX < -20;
  const reachedThreshold = Math.abs(offsetX) >= threshold;

  return (
    <div className="absolute inset-0 flex items-stretch justify-between rounded-2xl pointer-events-none">
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
  );
}

export function SourceHeader({
  article,
  sourceAccent,
  faviconUrl,
  faviconFailed,
  onFaviconError,
  onShare,
}: {
  article: Article;
  sourceAccent: ReturnType<typeof getSourceAccent>;
  faviconUrl: string;
  faviconFailed: boolean;
  onFaviconError: () => void;
  onShare: (article: Article, e?: MouseEvent) => void;
}) {
  return (
    <div className={`flex items-center justify-between mb-3 -mx-5 -mt-5 px-5 py-3 rounded-t-2xl border-b-2 border-black/10 dark:border-white/10 ${sourceAccent.bg}`}>
      <div className="flex items-center gap-1.5 min-w-0 mr-2">
        <span className="w-4 h-4 flex items-center justify-center shrink-0" aria-hidden="true">
          {faviconUrl && !faviconFailed ? (
            <img src={faviconUrl} alt="" className="w-3.5 h-3.5 object-contain" onError={onFaviconError} />
          ) : (
            <span className={`text-sm font-black ${sourceAccent.text}`}>{getSourceInitial(article.source)}</span>
          )}
        </span>
        <span className={`text-sm font-semibold uppercase tracking-wider truncate ${sourceAccent.text}`}>
          {article.source}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className={`text-sm mr-1 ${sourceAccent.text} opacity-70`}>
          {article.pubDate ? format(new Date(article.pubDate), "d MMM, HH:mm", { locale: it }) : ""}
        </span>
        <button
          onClick={(e) => onShare(article, e)}
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
          title="Condividi notizia"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function TagsRow({
  article,
  selectedTag,
  onTagClick,
}: {
  article: Article;
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
}) {
  if (!article.aiTags || article.aiTags.length === 0) return null;

  return (
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
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              isSelected
                ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs ring-2 ring-indigo-300 dark:ring-indigo-700"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:border-indigo-800"
            }`}
            title={`Clicca per cercare feed correlati con l'AI: #${tag}`}
          >
            <span className="opacity-60 text-sm">#</span>
            <span>{tag}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AISummaryTrigger({ article, onClick }: { article: Article; onClick: () => void }) {
  return (
    <div
      className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100/80 dark:border-indigo-900/50 rounded-xl p-3 mt-auto cursor-pointer hover:bg-indigo-100/70 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-between"
      onClick={onClick}
      title="Clicca per aprire il riassunto completo AI"
    >
      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-semibold tracking-wide">AI Summary Completo</span>
      </div>
      {article.aiRelevance > 0 && (
        <span className="text-sm font-bold bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">
          {article.aiRelevance}/100
        </span>
      )}
    </div>
  );
}

interface ArticleCardBodyProps {
  article: Article;
  sourceAccent: ReturnType<typeof getSourceAccent>;
  faviconUrl: string;
  faviconFailed: boolean;
  onFaviconError: () => void;
  onShare: (article: Article, e?: MouseEvent) => void;
  onOpenInfo?: (article: Article) => void;
  onToggleSave?: (article: Article) => void;
  onHide: (articleId: number) => void;
  onRestore?: (articleId: number) => void;
  isRestoring?: boolean;
  onToggleRead: (article: Article) => void;
  selectedTag: string | null;
  onTagClick: (tag: string) => void;
  onOpenSummary: (article: Article) => void;
}

// Card content: source header, action buttons, title, tags, AI summary CTA.
export function ArticleCardBody(props: ArticleCardBodyProps) {
  const { article, onToggleRead, selectedTag, onTagClick, onOpenSummary } = props;
  return (
    <div className="p-5 flex flex-col flex-1">
      <SourceHeader
        article={article}
        sourceAccent={props.sourceAccent}
        faviconUrl={props.faviconUrl}
        faviconFailed={props.faviconFailed}
        onFaviconError={props.onFaviconError}
        onShare={props.onShare}
      />
      <ActionButtons
        article={article}
        onOpenInfo={props.onOpenInfo}
        onToggleSave={props.onToggleSave}
        onHide={props.onHide}
        onRestore={props.onRestore}
        isRestoring={props.isRestoring}
      />
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
      <TagsRow article={article} selectedTag={selectedTag} onTagClick={onTagClick} />
      <AISummaryTrigger article={article} onClick={() => onOpenSummary(article)} />
    </div>
  );
}
