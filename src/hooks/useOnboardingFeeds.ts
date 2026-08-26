import { useState } from "react";
import type { FormEvent } from "react";

export interface SuggestedFeed {
  name: string;
  url: string;
  reason?: string;
  category?: string;
}

const DEFAULT_FEEDS: SuggestedFeed[] = [
  { name: "ANSA Notizie", url: "https://www.ansa.it/sito/ansait_rss.xml", category: "Attualità", reason: "Sorgente di notizie generale predefinita." },
  { name: "Il Post", url: "https://www.ilpost.it/feed", category: "Attualità", reason: "Spiegazioni chiare e notizie approfondite." },
];

// Calls the AI feed-search endpoint for a keyword; returns found feeds or throws.
async function searchFeedsByKeyword(keyword: string): Promise<SuggestedFeed[]> {
  const res = await fetch("/api/feeds/ai-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw new Error("search-failed");
  const data = await res.json();
  return data.feeds || [];
}

// Persists the chosen feeds, triggers an initial fetch, and marks onboarding as done.
async function completeOnboarding(finalFeeds: SuggestedFeed[]) {
  await fetch("/api/profile/interests/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newInterests: [], newFeeds: finalFeeds }),
  });
  await fetch("/api/fetch", { method: "POST" });
  localStorage.setItem("onboardingComplete", "true");
}

// Search-by-keyword state and handler.
function useFeedSearch() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedFeed[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim() || searchLoading) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      setSearchResults(await searchFeedsByKeyword(searchKeyword.trim()));
    } catch (err) {
      console.error("Error searching feeds by keyword:", err);
      setSearchError("Errore durante la ricerca. Riprova.");
    } finally {
      setSearchLoading(false);
    }
  };

  return { searchKeyword, setSearchKeyword, searchResults, setSearchResults, searchLoading, searchError, handleSearch };
}

// Selected-feeds state, add/remove handlers, and finish-onboarding logic.
function useSuggestedFeeds(onComplete: () => void, setSearchResults: (updater: (prev: SuggestedFeed[]) => SuggestedFeed[]) => void) {
  const [suggestedFeeds, setSuggestedFeeds] = useState<SuggestedFeed[]>([]);
  const [finishing, setFinishing] = useState(false);

  const addFeed = (feed: SuggestedFeed) => {
    setSuggestedFeeds((prev) => {
      if (prev.some((f) => f.url.toLowerCase() === feed.url.toLowerCase())) return prev;
      return [...prev, feed];
    });
    setSearchResults((prev) => prev.filter((f) => f.url.toLowerCase() !== feed.url.toLowerCase()));
  };

  const removeFeed = (url: string) => {
    setSuggestedFeeds((prev) => prev.filter((f) => f.url.toLowerCase() !== url.toLowerCase()));
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await completeOnboarding(suggestedFeeds.length > 0 ? suggestedFeeds : DEFAULT_FEEDS);
      onComplete();
    } catch (err) {
      console.error("Error completing onboarding:", err);
    } finally {
      setFinishing(false);
    }
  };

  return { suggestedFeeds, finishing, addFeed, removeFeed, handleFinish };
}

// Search-by-keyword, add/remove, and finish-onboarding logic shared by the
// Onboarding modal's two-column layout.
export function useOnboardingFeeds(onComplete: () => void) {
  const search = useFeedSearch();
  const suggested = useSuggestedFeeds(onComplete, search.setSearchResults);

  return {
    searchKeyword: search.searchKeyword,
    setSearchKeyword: search.setSearchKeyword,
    searchResults: search.searchResults,
    searchLoading: search.searchLoading,
    searchError: search.searchError,
    handleSearch: search.handleSearch,
    suggestedFeeds: suggested.suggestedFeeds,
    finishing: suggested.finishing,
    addFeed: suggested.addFeed,
    removeFeed: suggested.removeFeed,
    handleFinish: suggested.handleFinish,
  };
}
