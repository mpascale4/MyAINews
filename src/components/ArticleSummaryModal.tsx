import type { Article } from "../types";
import ArticleSummaryModalBody from "./ArticleSummaryModalBody";
import ArticleSummaryModalFooter from "./ArticleSummaryModalFooter";
import ArticleSummaryModalHeader from "./ArticleSummaryModalHeader";

type ArticleSummaryModalProps = {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  onClose: () => void;
  onShare: (article: Article) => void;
  onRegenerate: (article: Article) => void;
};

export default function ArticleSummaryModal(props: ArticleSummaryModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs" onClick={props.onClose}>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <ArticleSummaryModalHeader article={props.article} onShare={props.onShare} onClose={props.onClose} />
        <div className="overflow-y-auto p-6">
          <ArticleSummaryModalBody article={props.article} isRegenerating={props.isRegenerating} summaryError={props.summaryError} />
        </div>
        <ArticleSummaryModalFooter article={props.article} isRegenerating={props.isRegenerating} onRegenerate={props.onRegenerate} onClose={props.onClose} />
      </div>
    </div>
  );
}
