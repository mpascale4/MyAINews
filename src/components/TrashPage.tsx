import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Article } from "../types";
import { Trash2, RotateCcw, Loader2, Inbox } from "lucide-react";
import { getSourceAccent, getSourceInitial } from "../lib/sourceStyle";

export default function TrashPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/articles/trash");
      if (res.ok) {
        const data = await res.json();
        setArticles(Array.isArray(data) ? data : []);
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error("Error loading trash:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: number) => {
    setRestoringId(id);
    try {
      await fetch(`/api/articles/${id}/unhide`, { method: "POST" });
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Error restoring article:", err);
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Cestino</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Notizie nascoste, conservate come le ultime {articles.length} (max 500). Puoi ripristinarle in qualsiasi momento.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {articles.length}/500
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Il cestino è vuoto.</p>
        </div>
      ) : (
        <div role="list" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {articles.map((article) => {
            const accent = getSourceAccent(article.source);
            return (
              <div
                role="listitem"
                key={article.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors"
              >
                <div className={`flex items-center gap-2 px-4 py-2.5 ${accent.bg}`}>
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold bg-white/40 dark:bg-black/20 ${accent.text}`}>
                    {getSourceInitial(article.source)}
                  </span>
                  <span className={`text-xs font-semibold uppercase tracking-wider truncate ${accent.text}`}>
                    {article.source || "RSS Feed"}
                  </span>
                  <span className={`text-xs ml-auto ${accent.text} opacity-70 shrink-0`}>
                    {article.hiddenAt ? format(new Date(article.hiddenAt), "d MMM, HH:mm", { locale: it }) : ''}
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-3">
                    {article.title}
                  </p>
                  <button
                    onClick={() => handleRestore(article.id)}
                    disabled={restoringId === article.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {restoringId === article.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    Ripristina
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
