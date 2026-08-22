import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Bot, User, Loader2, Plus, Trash2, Rss, Hash, X, Check, ArrowRight, HelpCircle } from "lucide-react";
import { Interest, Feed } from "../types";

interface OnboardingProps {
  onComplete: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedInterest {
  keyword: string;
  type: 'positive' | 'negative';
  weight: number;
}

interface SuggestedFeed {
  name: string;
  url: string;
  reason?: string;
  category?: string;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'assistant', 
      content: "Ciao! Sono il tuo assistente IA per la personalizzazione delle notizie. 🌟\n\nParliamo un attimo per capire cosa ti interessa leggere. Dimmi pure: quali argomenti ami seguire (es. tecnologia, scienza, sport, borsa) o se ci sono città o regioni specifiche di cui vorresti leggere le notizie locali (es. Lucca, Toscana, Roma)? Troverò subito le migliori fonti RSS per te!" 
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [extractedInterests, setExtractedInterests] = useState<ExtractedInterest[]>([]);
  const [suggestedFeeds, setSuggestedFeeds] = useState<SuggestedFeed[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/profile/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Add assistant reply
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        
        // Process newly suggested feeds
        if (Array.isArray(data.suggestedFeeds) && data.suggestedFeeds.length > 0) {
          setSuggestedFeeds(prev => {
            const existingUrls = new Set(prev.map(f => f.url.toLowerCase()));
            const newFiltered = (data.suggestedFeeds as SuggestedFeed[]).filter(
              f => !existingUrls.has(f.url.toLowerCase())
            );
            return [...prev, ...newFiltered];
          });
        }
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Spiacente, ho riscontrato un problema di connessione. Puoi riprovare a scrivermi?" }]);
      }
    } catch (err) {
      console.error("Error during onboarding interview:", err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Ops! Si è verificato un errore di connessione. Riprova." }]);
    } finally {
      setLoading(false);
    }
  };

  const removeInterest = (keyword: string) => {
    setExtractedInterests(prev => prev.filter(i => i.keyword.toLowerCase() !== keyword.toLowerCase()));
  };

  const removeFeed = (url: string) => {
    setSuggestedFeeds(prev => prev.filter(f => f.url.toLowerCase() !== url.toLowerCase()));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      // If the user hasn't added any feeds, provide a couple of high quality Italian feeds as basic default
      const finalFeeds = suggestedFeeds.length > 0 ? suggestedFeeds : [
        { name: "ANSA Notizie", url: "https://www.ansa.it/sito/ansait_rss.xml", category: "Attualità", reason: "Sorgente di notizie generale predefinita." },
        { name: "Il Post", url: "https://www.ilpost.it/feed", category: "Attualità", reason: "Spiegazioni chiare e notizie approfondite." }
      ];

      await fetch('/api/profile/interests/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newInterests: [],
          newFeeds: finalFeeds
        })
      });

      // Trigger feed fetch with newly defined feeds
      await fetch('/api/fetch', { method: 'POST' });

      localStorage.setItem("onboardingComplete", "true");
      onComplete();
    } catch (err) {
      console.error("Error completing onboarding:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] md:h-[80vh] transition-colors">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-900 p-6 text-white shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Configurazione Profilo con AI</h2>
              <p className="text-indigo-100 text-xs mt-0.5">Parla con l'assistente per creare il tuo feed di notizie ideale</p>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <span>Inizia a Leggere</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area - Split Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50 dark:bg-slate-950/50">
          
          {/* Left Column: Chat Conversation */}
          <div className="flex-1 flex flex-col min-h-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs font-medium shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-center text-slate-400 text-xs italic">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <span>L'assistente sta analizzando le tue risposte con l'AI...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-3 shrink-0">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Es. Mi piace la tecnologia, vivo a Lucca, evita gossip..."
                className="flex-1 min-w-0 w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
              >
                <span>Invia</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Column: Dynamic Profile & Sources Panel */}
          <div className="w-full md:w-80 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950/40 p-6 space-y-5 overflow-y-auto shrink-0">
            
            {/* Section: Suggested RSS Feeds */}
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
                <Rss className="w-4 h-4 text-indigo-500" />
                Fonti RSS Trovate ({suggestedFeeds.length})
              </h3>
              
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {suggestedFeeds.map((feed, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-250 dark:border-slate-800 text-xs shadow-3xs flex flex-col gap-1 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate pr-4">{feed.name}</div>
                      <button
                        type="button"
                        onClick={() => removeFeed(feed.url)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 absolute top-2 right-2 transition-all"
                        title="Rimuovi"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {feed.reason && (
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {feed.reason}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-1 mt-0.5 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {feed.category || 'Generale'}
                      </span>
                    </div>
                  </div>
                ))}
                {suggestedFeeds.length === 0 && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 italic p-1">
                    Le sorgenti RSS reali consigliate dall'AI compariranno qui durante la conversazione.
                  </div>
                )}
              </div>
            </div>

            {/* Context Notice */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-3.5 border border-indigo-100 dark:border-indigo-900/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed shrink-0">
              <HelpCircle className="w-4 h-4 text-indigo-500 inline mr-1 mb-0.5" />
              L'AI analizza la discussione per suggerire <strong>interessi e sorgenti RSS reali</strong> (es. Google News locali, feed nazionali/tematici). Quando hai terminato, premi su <strong>Inizia a Leggere</strong> in alto.
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
