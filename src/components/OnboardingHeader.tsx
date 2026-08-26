import { ArrowRight, Loader2, Sparkles } from "lucide-react";

type OnboardingHeaderProps = {
  finishing: boolean;
  onFinish: () => void;
};

export function OnboardingHeader({ finishing, onFinish }: OnboardingHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
          <Sparkles className="h-5 w-5 text-amber-300" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Seleziona le tue fonti</h2>
          <p className="text-sm text-indigo-100">Cerca feed con AI o aggiungili manualmente.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onFinish}
        disabled={finishing}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        <span>Inizia</span>
      </button>
    </div>
  );
}
