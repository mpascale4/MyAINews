import { ExternalLink, RefreshCw, ShieldMinus } from "lucide-react";
import { Article } from "../types";
import FormattedSummary from "./FormattedSummary";

function LoadingState() {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
      <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
      <p className="font-medium text-sm">Generazione quadro completo della notizia con l'AI...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="py-6 px-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-100 dark:border-rose-800/40 mb-4 text-center">
      <p className="font-medium text-sm">{message}</p>
    </div>
  );
}

interface ArticleTitleRowProps {
  article: Article;
  onMarkAsRead: (id: number) => void;
}

function ArticleTitleRow({ article, onMarkAsRead }: ArticleTitleRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg sm:text-xl leading-snug">
        {article.title}
      </h3>
      <a
        href={article.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onMarkAsRead(article.id)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors shrink-0 self-start sm:self-center shadow-xs cursor-pointer"
      >
        <span>Apri link remoto</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

interface ArticleTagsRowProps {
  tags: string[];
  isTagExcluded: (tag: string) => boolean;
  onTagClick: (tag: string) => void;
}

function ArticleTagsRow({ tags, isTagExcluded, onTagClick }: ArticleTagsRowProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100 dark:border-slate-800">
      {tags.map((tag, idx) => {
        const isExcluded = isTagExcluded(tag);
        return (
          <button
            key={idx}
            onClick={() => onTagClick(tag)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-semibold rounded-lg border transition-all cursor-pointer ${
              isExcluded
                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 line-through"
                : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100"
            }`}
            title="Clicca per gestire o escludere questo tag"
          >
            {isExcluded ? (
              <ShieldMinus className="w-3 h-3 text-rose-500" />
            ) : (
              <span className="opacity-60 text-sm">#</span>
            )}
            <span>{tag}</span>
          </button>
        );
      })}
    </div>
  );
}

interface ArticleSummaryModalBodyProps {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  isTagExcluded: (tag: string) => boolean;
  onTagClick: (tag: string) => void;
  onMarkAsRead: (id: number) => void;
}

export default function ArticleSummaryModalBody({
  article,
  isRegenerating,
  summaryError,
  isTagExcluded,
  onTagClick,
  onMarkAsRead,
}: ArticleSummaryModalBodyProps) {
  if (isRegenerating) return <LoadingState />;
  if (summaryError) return <ErrorState message={summaryError} />;

  return (
    <>
      <ArticleTitleRow article={article} onMarkAsRead={onMarkAsRead} />
      <ArticleTagsRow tags={article.aiTags ?? []} isTagExcluded={isTagExcluded} onTagClick={onTagClick} />
      <div className="max-w-none">
        <FormattedSummary summaryText={article.aiSummary} />
      </div>
    </>
  );
}
