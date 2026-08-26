import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { MouseEvent } from "react";
import { ExternalLink, Info, Share2, Sparkles } from "lucide-react";
import type { Article } from "../types";
import { getSourceAccent, getSourceFaviconUrl, getSourceInitial } from "../lib/sourceStyle";

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, "d MMM, HH:mm", { locale: it });
}

function ArticleHeader({ article, onShare }: { article: Article; onShare: (article: Article, event?: MouseEvent) => void }) {
  const accent = getSourceAccent(article.source);
  const faviconUrl = getSourceFaviconUrl(article.link);

  return (
    <div className={`mb-4 flex items-center justify-between rounded-t-2xl border-b border-black/10 px-5 py-3 dark:border-white/10 ${accent.bg}`}>
      <div className="flex min-w-0 items-center gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden="true">
          {faviconUrl ? <img src={faviconUrl} alt="" className="h-4 w-4 object-contain" /> : <span className={`text-sm font-black ${accent.text}`}>{getSourceInitial(article.source)}</span>}
        </span>
        <span className={`truncate text-sm font-semibold uppercase tracking-wider ${accent.text}`}>{article.source}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm opacity-75 ${accent.text}`}>{formatDate(article.pubDate)}</span>
        <button type="button" onClick={(event) => onShare(article, event)} className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/40 hover:text-indigo-600 dark:hover:text-indigo-300">
          <Share2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function ArticleActions({ article, onOpenSummary, onOpenInfo }: { article: Article; onOpenSummary: (article: Article) => void; onOpenInfo?: (article: Article) => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => onOpenSummary(article)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
        <Sparkles className="h-4 w-4" />
        Riassunto AI
      </button>
      {onOpenInfo ? <button type="button" onClick={() => onOpenInfo(article)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"><Info className="h-4 w-4" />Info</button> : null}
      <a href={article.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
        <ExternalLink className="h-4 w-4" />
        Apri fonte
      </a>
    </div>
  );
}

export function ArticleCardBody({ article, onShare, onOpenSummary, onOpenInfo }: { article: Article; onShare: (article: Article, event?: MouseEvent) => void; onOpenSummary: (article: Article) => void; onOpenInfo?: (article: Article) => void }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <ArticleHeader article={article} onShare={onShare} />
      <div className="flex h-full flex-col p-5 pt-0">
        {article.imageUrl ? <img src={article.imageUrl} alt="" className="mb-4 h-48 w-full rounded-2xl object-cover" /> : null}
        <ArticleActions article={article} onOpenSummary={onOpenSummary} onOpenInfo={onOpenInfo} />
        <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">{article.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{article.contentSnippet || "Anteprima non disponibile."}</p>
      </div>
    </article>
  );
}
