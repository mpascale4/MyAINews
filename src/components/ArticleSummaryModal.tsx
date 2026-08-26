import { Article } from "../types";
import ArticleSummaryModalHeader from "./ArticleSummaryModalHeader";
import ArticleSummaryModalBody from "./ArticleSummaryModalBody";
import ArticleSummaryModalFooter from "./ArticleSummaryModalFooter";

interface ArticleSummaryModalProps {
  article: Article;
  isRegenerating: boolean;
  summaryError: string | null;
  isTagExcluded: (tag: string) => boolean;
  onClose: () => void;
  onToggleSave: (article: Article) => void;
  onOpenInfo: (article: Article) => void;
  onShare: (article: Article) => void;
  onMarkAsRead: (id: number) => void;
  onRegenerate: (id: number) => void;
  onTagClick: (tag: string) => void;
}

// Full-screen "AI Summary" modal shown when opening an article's AI-generated summary.
export default function ArticleSummaryModal(props: ArticleSummaryModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={props.onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <ArticleSummaryModalHeader {...props} />
        <div className="p-6 overflow-y-auto space-y-4">
          <ArticleSummaryModalBody {...props} />
        </div>
        <ArticleSummaryModalFooter {...props} />
      </div>
    </div>
  );
}
