import { Info, X, ShieldMinus } from "lucide-react";
import { Article } from "../types";

interface ArticleInfoModalProps {
  article: Article;
  onClose: () => void;
  onExcludeSource: (source: string) => void;
}

interface ModalHeaderProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-base sm:text-lg">
        <Info className="w-5 h-5" />
        <span>Criteri di Visualizzazione</span>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

interface ArticleDetailsProps {
  article: Article;
}

function ArticleDetails({ article }: ArticleDetailsProps) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Titolo Notizia</span>
        <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mt-0.5">{article.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Sorgente</span>
          <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{article.source || "RSS Feed"}</p>
        </div>
        <div>
          <span className="text-xs text-slate-500 dark:text-slate-400 block">Rilevanza AI</span>
          <p className="font-bold text-indigo-600 dark:text-indigo-400">{article.aiRelevance}/100</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        Questa notizia compare nel tuo feed perché è pubblicata da{" "}
        <strong className="text-slate-900 dark:text-slate-100">{article.source || "RSS Feed"}</strong> ed è
        associata ai tuoi temi di interesse.
      </p>

      {article.aiTags && article.aiTags.length > 0 && (
        <div>
          <span className="text-xs font-semibold text-slate-400 block mb-1.5">Tag Tematici:</span>
          <div className="flex flex-wrap gap-1.5">
            {article.aiTags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-medium border border-indigo-100 dark:border-indigo-900"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ExcludeSourceButtonProps {
  source?: string;
  onExcludeSource: (source: string) => void;
}

function ExcludeSourceButton({ source, onExcludeSource }: ExcludeSourceButtonProps) {
  if (!source) return null;

  return (
    <button
      onClick={() => onExcludeSource(source)}
      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-bold transition-colors cursor-pointer border border-rose-200 dark:border-rose-800"
    >
      <ShieldMinus className="w-4 h-4" /> Escludi sorgente "{source}"
    </button>
  );
}

// Modal explaining why an article appears in the feed (source, AI relevance, tags),
// with an option to exclude its source entirely.
export default function ArticleInfoModal({ article, onClose, onExcludeSource }: ArticleInfoModalProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader onClose={onClose} />
        <ArticleDetails article={article} />
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <ExcludeSourceButton source={article.source} onExcludeSource={onExcludeSource} />
        </div>
      </div>
    </div>
  );
}
