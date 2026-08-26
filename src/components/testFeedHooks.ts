import { useState } from "react";
import type { Article, Feed } from "../types";

type FeedTestState = {
  loading: boolean;
  articles?: Article[];
  usedScraper?: boolean;
  error?: string;
};

type FeedFetchManyResponse = {
  results: Array<{ feed: Feed; articles: Article[]; error?: string; usedScraper?: boolean }>;
};

type FindAlternativeResponse = {
  found: boolean;
  feed?: Feed;
};

async function testFeed(feed: Feed): Promise<FeedTestState> {
  const response = await fetch("/api/feeds/fetch-many", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feeds: [feed] }),
  });
  if (!response.ok) {
    return { loading: false, error: "Errore durante la verifica della sorgente." };
  }

  const data = (await response.json()) as FeedFetchManyResponse;
  const result = data.results[0];
  if (!result || (result.articles.length === 0 && result.error)) {
    return { loading: false, error: result?.error || "Nessun articolo trovato." };
  }

  return { loading: false, articles: result.articles.slice(0, 5), usedScraper: result.usedScraper };
}

async function findAlternativeFeed(feed: Feed): Promise<{ feed: Feed; result: FeedTestState }> {
  const response = await fetch("/api/feeds/find-alternative", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: feed.name, url: feed.url }),
  });
  if (!response.ok) {
    return { feed, result: { loading: false, error: "Errore durante la ricerca di un'alternativa." } };
  }

  const data = (await response.json()) as FindAlternativeResponse;
  if (!data.found || !data.feed) {
    return { feed, result: { loading: false, error: "Nessuna alternativa affidabile trovata per questa sorgente." } };
  }

  return { feed: data.feed, result: await testFeed(data.feed) };
}

// Tracks the "test source" overlay: which feed is currently being tested and
// the last 5 articles (with dates) it returned, used to gauge reliability.
// Also supports "find alternative" when the tested feed proves unreliable.
export function useTestFeed() {
  const [testedFeed, setTestedFeed] = useState<Feed | null>(null);
  const [testResults, setTestResults] = useState<Record<string, FeedTestState>>({});
  const [findingAlternative, setFindingAlternative] = useState(false);

  const runTest = async (feed: Feed) => {
    setTestedFeed(feed);
    setTestResults((current) => ({ ...current, [feed.url]: { loading: true } }));
    const result = await testFeed(feed);
    setTestResults((current) => ({ ...current, [feed.url]: result }));
  };

  const runFindAlternative = async () => {
    if (!testedFeed) {
      return;
    }

    setFindingAlternative(true);
    const { feed: alternativeFeed, result } = await findAlternativeFeed(testedFeed);
    setTestedFeed(alternativeFeed);
    setTestResults((current) => ({ ...current, [alternativeFeed.url]: result }));
    setFindingAlternative(false);
  };

  return { testedFeed, setTestedFeed, testResults, runTest, runFindAlternative, findingAlternative };
}
