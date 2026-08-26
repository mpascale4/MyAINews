export type Feed = {
  url: string;
  name: string;
};

export type SuggestedFeed = Feed & {
  reason?: string;
  category?: string;
};

export type Article = {
  guid: string;
  title: string;
  link: string;
  content: string;
  contentSnippet: string;
  pubDate: string | null;
  source: string;
  imageUrl: string | null;
  aiSummary?: string | null;
};

export type FeedFetchResult = {
  feed: Feed;
  articles: Article[];
  error?: string;
  usedScraper?: boolean;
};
