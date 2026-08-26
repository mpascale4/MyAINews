import { useEffect, useState } from "react";
import { EyeOff, RotateCcw } from "lucide-react";
import { Article } from "../../types";

const HIDE_COUNTDOWN_SECONDS = 6;

export function HiddenArticlePlaceholder({ article, onUndo }: { article: Article; onUndo: () => void | Promise<void> } & React.JSX.IntrinsicAttributes) {
  const [timeLeft, setTimeLeft] = useState(HIDE_COUNTDOWN_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft((current) => current > 0 ? current - 1 : 0), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-full min-h-[300px] flex flex-col justify-between p-6 bg-slate-900 text-white rounded-2xl border-2 border-indigo-500/30 overflow-hidden shadow-lg transition-all duration-300 animate-in fade-in zoom-in-95">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="space-y-4">
        <div className="flex items-center gap-2.5 text-indigo-400 font-bold uppercase tracking-wider text-sm">
          <EyeOff className="w-4 h-4" />
          <span>Notizia Nascosta</span>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-bold leading-snug line-clamp-3 text-slate-100">{article.title}</p>
          <p className="text-sm text-slate-400">Questa notizia non comparir� pi� nel tuo feed personalizzato.</p>
        </div>
      </div>
      <div className="space-y-4 pt-4 border-t border-slate-800 shrink-0">
        <button onClick={onUndo} className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer">
          <RotateCcw className="w-4 h-4" />
          <span>Annulla (Riavvia in {timeLeft}s)</span>
        </button>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / HIDE_COUNTDOWN_SECONDS) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
