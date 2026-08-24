import { useState, useEffect } from "react";
import { EyeOff, RotateCcw } from "lucide-react";
import { Article } from "../types";

// Small floating toast shown after hiding an article, with a countdown to auto-dismiss.
export default function HiddenArticleToast({
  article,
  onUndo,
}: {
  article: Article;
  onUndo: () => void | Promise<void>;
}) {
  const [timeLeft, setTimeLeft] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-72 max-w-[calc(100vw-2rem)] p-4 bg-slate-900 text-white rounded-2xl border-2 border-indigo-500/30 overflow-hidden shadow-2xl animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="flex items-center gap-2.5 text-indigo-400 font-bold uppercase tracking-wider text-[11px] mb-1.5">
        <EyeOff className="w-4 h-4" />
        <span>Notizia Nascosta</span>
      </div>
      <p className="text-xs font-semibold leading-snug line-clamp-2 text-slate-100 mb-3">
        {article.title}
      </p>
      <button
        onClick={onUndo}
        className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Annulla ({timeLeft}s)</span>
      </button>
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
        <div
          className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}
