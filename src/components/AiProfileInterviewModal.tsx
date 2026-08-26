import { X, Sparkles, Bot, Loader2, CheckCircle2, Check } from "lucide-react";

interface InterviewMessage {
  role: "user" | "assistant";
  content: string;
}

interface PendingInterest {
  keyword: string;
  type: "positive" | "negative";
  weight: number;
}

interface PendingFeed {
  name: string;
  url: string;
  reason?: string;
  category?: string;
}

interface AiProfileInterviewModalProps {
  isOpen: boolean;
  messages: InterviewMessage[];
  loading: boolean;
  input: string;
  pendingExtracted: PendingInterest[];
  pendingSuggestedFeeds: PendingFeed[];
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onApplyExtracted: () => void;
  onRemovePendingInterest: (index: number) => void;
  onRemovePendingFeed: (index: number) => void;
}

interface ModalHeaderProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: ModalHeaderProps) {
  return (
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-indigo-50/50 dark:bg-indigo-950/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Intervista AI per Profilo e Interessi</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Parla con l'assistente per scoprire e aggiornare i tuoi argomenti
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

interface ChatMessagesProps {
  messages: InterviewMessage[];
  loading: boolean;
}

function ChatMessages({ messages, loading }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((msg, index) => (
        <div key={index} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
          )}
          <div
            className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-indigo-600 text-white rounded-br-xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200 dark:border-slate-700"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex gap-3 items-center text-slate-400 text-sm italic">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
          <span>L'assistente sta elaborando la risposta...</span>
        </div>
      )}
    </div>
  );
}

interface PendingInterestsListProps {
  pendingExtracted: PendingInterest[];
  onRemovePendingInterest: (index: number) => void;
}

function PendingInterestsList({ pendingExtracted, onRemovePendingInterest }: PendingInterestsListProps) {
  if (pendingExtracted.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mr-1">Interessi:</span>
      {pendingExtracted.map((item, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center gap-1 text-sm font-semibold px-2.5 py-0.5 rounded-full border ${
            item.type === "negative"
              ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200"
              : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200"
          }`}
        >
          {item.type === "negative" ? "⛔ " : "⭐ "}
          {item.keyword}
          <button
            type="button"
            onClick={() => onRemovePendingInterest(idx)}
            className="hover:opacity-75 cursor-pointer ml-1 text-sm font-bold"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

interface PendingFeedsListProps {
  pendingSuggestedFeeds: PendingFeed[];
  onRemovePendingFeed: (index: number) => void;
}

function PendingFeedsList({ pendingSuggestedFeeds, onRemovePendingFeed }: PendingFeedsListProps) {
  if (pendingSuggestedFeeds.length === 0) return null;

  return (
    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300 block">
        Sorgenti RSS Suggerite:
      </span>
      {pendingSuggestedFeeds.map((feed, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-slate-900/90 p-2 rounded-lg border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-sm gap-2"
        >
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">{feed.name}</div>
            {feed.reason && <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{feed.reason}</div>}
          </div>
          <span className="px-2 py-0.5 rounded text-sm font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 shrink-0">
            {feed.category || "Generale"}
          </span>
          <button
            type="button"
            onClick={() => onRemovePendingFeed(idx)}
            className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
            title="Rimuovi questo feed"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface PendingInterestsPanelProps {
  pendingExtracted: PendingInterest[];
  pendingSuggestedFeeds: PendingFeed[];
  onApplyExtracted: () => void;
  onRemovePendingInterest: (index: number) => void;
  onRemovePendingFeed: (index: number) => void;
}

function PendingInterestsPanel({
  pendingExtracted,
  pendingSuggestedFeeds,
  onApplyExtracted,
  onRemovePendingInterest,
  onRemovePendingFeed,
}: PendingInterestsPanelProps) {
  if (pendingExtracted.length === 0 && pendingSuggestedFeeds.length === 0) {
    return null;
  }

  return (
    <div className="px-6 py-4 bg-emerald-50/90 dark:bg-emerald-950/60 border-t border-emerald-200 dark:border-emerald-800 space-y-3 shrink-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
            Risultati Rilevati dall'AI ({pendingExtracted.length} Interessi, {pendingSuggestedFeeds.length} Feed)
          </span>
        </div>
        <button
          onClick={onApplyExtracted}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" /> Applica al Profilo e Aggiungi Feed
        </button>
      </div>

      <PendingInterestsList pendingExtracted={pendingExtracted} onRemovePendingInterest={onRemovePendingInterest} />
      <PendingFeedsList pendingSuggestedFeeds={pendingSuggestedFeeds} onRemovePendingFeed={onRemovePendingFeed} />
    </div>
  );
}

interface ChatInputProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function ChatInput({ input, loading, onInputChange, onSubmit }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
      <input
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Scrivi qui la tua risposta..."
        className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs transition-all"
      />
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-2"
      >
        Invia
      </button>
    </form>
  );
}

// Chat-style modal that interviews the user via AI to discover/update interests
// and suggests related RSS feeds, which can be applied to the profile in bulk.
export default function AiProfileInterviewModal({
  isOpen,
  messages,
  loading,
  input,
  pendingExtracted,
  pendingSuggestedFeeds,
  onClose,
  onInputChange,
  onSubmit,
  onApplyExtracted,
  onRemovePendingInterest,
  onRemovePendingFeed,
}: AiProfileInterviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <ModalHeader onClose={onClose} />
        <ChatMessages messages={messages} loading={loading} />
        <PendingInterestsPanel
          pendingExtracted={pendingExtracted}
          pendingSuggestedFeeds={pendingSuggestedFeeds}
          onApplyExtracted={onApplyExtracted}
          onRemovePendingInterest={onRemovePendingInterest}
          onRemovePendingFeed={onRemovePendingFeed}
        />
        <ChatInput input={input} loading={loading} onInputChange={onInputChange} onSubmit={onSubmit} />
      </div>
    </div>
  );
}
