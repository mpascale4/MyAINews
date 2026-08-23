import React, { useState, useEffect } from "react";
import { Article } from "../types";
import { Trash2, Loader2, Inbox } from "lucide-react";
import ArticleCardItem from "./ArticleCardItem";

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
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCardItem
              key={article.id}
              article={article}
              isTagExcluded={() => false}
              selectedTag={null}
              onTagClick={() => {}}
              onOpenSummary={() => {}}
              onToggleRead={() => {}}
              onHide={() => {}}
              onShare={() => {}}
              onRestore={handleRestore}
              isRestoring={restoringId === article.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
