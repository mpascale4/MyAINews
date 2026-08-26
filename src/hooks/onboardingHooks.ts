import { useState } from "react";
import type { FormEvent } from "react";
import { markOnboardingComplete, saveFeeds } from "../lib/feedsStorage";
import type { Feed, SuggestedFeed } from "../types";

const DEFAULT_FEEDS: Feed[] = [
  { name: "ANSA Notizie", url: "https://www.ansa.it/sito/ansait_rss.xml" },
  { name: "Il Post", url: "https://www.ilpost.it/feed" },
];

async function searchFeedsByKeyword(keyword: string): Promise<SuggestedFeed[]> {
  const res = await fetch("/api/ai/feed-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!res.ok) throw new Error("search-failed");
  const data = (await res.json()) as { feeds?: SuggestedFeed[] };
  return data.feeds || [];
}

export function useOnboardingSearch() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedFeed[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!searchKeyword.trim() || searchLoading) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      setSearchResults(await searchFeedsByKeyword(searchKeyword.trim()));
    } catch {
      setSearchError("Errore durante la ricerca delle fonti.");
    } finally {
      setSearchLoading(false);
    }
  };

  return { searchKeyword, setSearchKeyword, searchResults, searchLoading, searchError, handleSearch };
}

export function useSelectedFeeds() {
  const [selectedFeeds, setSelectedFeeds] = useState<Feed[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [finishing, setFinishing] = useState(false);

  const addFeed = (feed: Feed) => {
    setSelectedFeeds((current) =>
      current.some((item) => item.url.toLowerCase() === feed.url.toLowerCase()) ? current : [...current, feed],
    );
  };

  const addManualFeed = () => {
    if (!manualUrl.trim()) return;
    addFeed({ name: manualName.trim() || manualUrl.trim(), url: manualUrl.trim() });
    setManualName("");
    setManualUrl("");
  };

  const removeFeed = (url: string) => {
    setSelectedFeeds((current) => current.filter((feed) => feed.url.toLowerCase() !== url.toLowerCase()));
  };

  const complete = async (onComplete: () => void) => {
    setFinishing(true);
    saveFeeds(selectedFeeds.length > 0 ? selectedFeeds : DEFAULT_FEEDS);
    markOnboardingComplete();
    setFinishing(false);
    onComplete();
  };

  return { selectedFeeds, manualName, setManualName, manualUrl, setManualUrl, finishing, addFeed, addManualFeed, removeFeed, complete };
}
