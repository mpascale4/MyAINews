import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { addFeed, loadFeeds, saveFeeds } from "../lib/feedsStorage";
import type { Feed, SuggestedFeed } from "../types";

async function searchFeeds(keyword: string): Promise<SuggestedFeed[]> {
  const response = await fetch("/api/ai/feed-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword }),
  });
  if (!response.ok) {
    throw new Error("search-failed");
  }

  const data = (await response.json()) as { feeds?: SuggestedFeed[] };
  return data.feeds || [];
}

export function useSettingsFeeds() {
  const [feeds, setFeeds] = useState<Feed[]>([]);

  useEffect(() => {
    setFeeds(loadFeeds());
  }, []);

  const existingFeedUrls = useMemo(() => new Set(feeds.map((feed) => feed.url.toLowerCase())), [feeds]);

  return { feeds, setFeeds, existingFeedUrls };
}

export function useSettingsSearch() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<SuggestedFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (!keyword.trim() || loading) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      setResults(await searchFeeds(keyword.trim()));
    } catch {
      setFeedback("Errore durante la ricerca AI.");
    } finally {
      setLoading(false);
    }
  };

  return { keyword, setKeyword, results, loading, feedback, setFeedback, handleSearch };
}

export function useManualFeedForm(setFeeds: React.Dispatch<React.SetStateAction<Feed[]>>, setFeedback: (value: string) => void) {
  const [manualName, setManualName] = useState("");
  const [manualUrl, setManualUrl] = useState("");

  const handleAddManualFeed = () => {
    if (!manualUrl.trim()) {
      return;
    }

    const nextFeed = { name: manualName.trim() || manualUrl.trim(), url: manualUrl.trim() };
    setFeeds(addFeed(nextFeed));
    setManualName("");
    setManualUrl("");
    setFeedback(`Feed aggiunto: ${nextFeed.name}`);
  };

  return { manualName, setManualName, manualUrl, setManualUrl, handleAddManualFeed };
}

export function handleExportFeeds(feeds: Feed[]) {
  const blob = new Blob([JSON.stringify(feeds, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "myainews-feeds.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function handleImportFeeds(event: ChangeEvent<HTMLInputElement>, setFeeds: React.Dispatch<React.SetStateAction<Feed[]>>, setFeedback: (value: string) => void) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const parsed = JSON.parse(await file.text()) as Feed[];
    saveFeeds(parsed);
    setFeeds(loadFeeds());
    setFeedback("Feed importati con successo.");
  } catch {
    setFeedback("Errore durante l'importazione del file.");
  }

  event.target.value = "";
}
