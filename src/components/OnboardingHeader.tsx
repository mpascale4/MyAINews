import { Sparkles, Loader2, ArrowRight } from "lucide-react";

interface OnboardingHeaderProps {
  finishing: boolean;
  onFinish: () => void;
}

export function OnboardingHeader({ finishing, onFinish }: OnboardingHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 p-6 text-white shrink-0 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold leading-tight">Configurazione Profilo</h2>
          <p className="text-indigo-100 text-sm mt-0.5">Cerca per argomento o città e scegli le fonti da seguire</p>
        </div>
      </div>
      <button
        onClick={onFinish}
        disabled={finishing}
        className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
      >
        {finishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Inizia a Leggere</span>}
        {!finishing && <ArrowRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
