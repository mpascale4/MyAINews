import { useEffect, useMemo, useState } from "react";
import { loadFeeds } from "../lib/feedsStorage";
import { registerSourceNames } from "../lib/sourceStyle";
import type { Article, Feed, FeedFetchResult } from "../types";

type FeedFetchResponse = {
  results: FeedFetchResult[];
};

function sortArticlesByDate(articles: Article[]) {
  return [...articles].sort((left, right) => {
    const leftTime = left.pubDate ? new Date(left.pubDate).getTime() : 0;
    const rightTime = right.pubDate ? new Date(right.pubDate).getTime() : 0;
    return rightTime - leftTime;
  });
}

async function fetchArticlesForFeeds(feeds: Feed[]) {
  const response = await fetch("/api/feeds/fetch-many", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feeds }),
  });
  if (!response.ok) {
    throw new Error("feed-fetch-failed");
  }

  return response.json() as Promise<FeedFetchResponse>;
}

async function requestSummary(article: Article) {
  const response = await fetch("/api/ai/article-summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: article.title, content: article.content || article.contentSnippet || article.title }),
  });
  if (!response.ok) {
    throw new Error("summary-failed");
  }

  return response.json() as Promise<{ summary: string }>;
}

type FeedLoadSetters = {
  setFeeds: (feeds: Feed[]) => void;
  setArticles: (articles: Article[]) => void;
  setErrors: (errors: string[]) => void;
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setVisibleCount: (count: number) => void;
};

async function loadArticles(showRefreshState: boolean, setters: FeedLoadSetters) {
  const currentFeeds = loadFeeds();
  setters.setFeeds(currentFeeds);
  registerSourceNames(currentFeeds.map((feed) => feed.name));

  if (currentFeeds.length === 0) {
    setters.setArticles([]);
    setters.setErrors([]);
    setters.setLoading(false);
    setters.setRefreshing(false);
    return;
  }

  if (showRefreshState) {
    setters.setRefreshing(true);
  } else {
    setters.setLoading(true);
  }

  try {
    const data = await fetchArticlesForFeeds(currentFeeds);
    setters.setArticles(sortArticlesByDate(data.results.flatMap((result) => result.articles)));
    setters.setErrors(data.results.filter((result) => result.error).map((result) => `${result.feed.name}: ${result.error}`));
    setters.setVisibleCount(24);
  } catch {
    setters.setErrors(["Errore durante il caricamento delle notizie."]);
  } finally {
    setters.setLoading(false);
    setters.setRefreshing(false);
  }
}

export function useArticlesFeed() {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [selectedSource, setSelectedSource] = useState("");

  const load = (showRefreshState: boolean) =>
    loadArticles(showRefreshState, { setFeeds, setArticles, setErrors, setLoading, setRefreshing, setVisibleCount });

  useEffect(() => {
    void load(false);
    const handleStorage = () => {
      void load(false);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const filteredArticles = useMemo(
    () => (selectedSource ? articles.filter((article) => article.source === selectedSource) : articles),
    [articles, selectedSource]
  );

  const visibleArticles = useMemo(() => filteredArticles.slice(0, visibleCount), [filteredArticles, visibleCount]);

  return { feeds, articles, setArticles, errors, loading, refreshing, visibleArticles, visibleCount, setVisibleCount, load, selectedSource, setSelectedSource };
}

type SummarySetters = {
  setSelectedArticle: (article: Article | null) => void;
  setSummaryError: (error: string | null) => void;
  setIsRegenerating: (value: boolean) => void;
  updateArticleSummary: (article: Article, summary: string) => void;
};

async function loadSummaryFor(article: Article, setters: SummarySetters) {
  setters.setSelectedArticle({ ...article, aiSummary: article.aiSummary || "" });
  setters.setSummaryError(null);
  if (article.aiSummary) {
    return;
  }

  setters.setIsRegenerating(true);
  try {
    const data = await requestSummary(article);
    setters.updateArticleSummary(article, data.summary);
  } catch {
    setters.setSummaryError("Errore durante la generazione del riassunto.");
  } finally {
    setters.setIsRegenerating(false);
  }
}

export function useArticleSummary(setArticles: React.Dispatch<React.SetStateAction<Article[]>>, visibleArticles: Article[]) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [infoArticle, setInfoArticle] = useState<Article | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const updateArticleSummary = (article: Article, summary: string) => {
    setArticles((current) => current.map((item) => (item.guid === article.guid ? { ...item, aiSummary: summary } : item)));
    setSelectedArticle({ ...article, aiSummary: summary });
  };

  const summarySetters: SummarySetters = { setSelectedArticle, setSummaryError, setIsRegenerating, updateArticleSummary };

  const handleOpenSummary = (article: Article) => loadSummaryFor(article, summarySetters);

  const handleRegenerateSummary = async (article: Article) => {
    setIsRegenerating(true);
    setSummaryError(null);
    try {
      const data = await requestSummary(article);
      updateArticleSummary(article, data.summary);
    } catch {
      setSummaryError("Errore durante la rigenerazione del riassunto.");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Index of the open article within the currently visible list, for
  // swipe-carousel prev/next navigation inside the summary modal.
  const summaryIndex = selectedArticle ? visibleArticles.findIndex((item) => item.guid === selectedArticle.guid) : -1;

  const navigateSummary = (nextIndex: number) => {
    const target = visibleArticles[nextIndex];
    if (target) void loadSummaryFor(target, summarySetters);
  };

  return {
    selectedArticle,
    setSelectedArticle,
    infoArticle,
    setInfoArticle,
    summaryError,
    isRegenerating,
    handleOpenSummary,
    handleRegenerateSummary,
    summaryIndex,
    navigateSummary,
  };
}
