import Parser from "rss-parser";
import { cleanHtmlForAI, decodeResponseText, extractImageUrl, normalizeLink, stripHtml } from "./rssTextUtils";

export { cleanHtmlForAI, decodeResponseText, extractImageUrl, normalizeLink, stripHtml };

export type ParserItem = {
  guid?: string;
  id?: string;
  link?: string;
  title?: string;
  contentEncoded?: string;
  ["content:encoded"]?: string;
  content?: string;
  contentSnippet?: string;
  pubDate?: string;
  imageUrl?: string | null;
  mediaContent?: Array<{ $?: { url?: string } }>;
};

export type FeedTestSampleItem = {
  title?: string;
  link?: string;
};

export type InterestRow = { keyword: string; type: string; weight: number };
export type ExistingArticleRow = { guid: string; title: string | null; link: string | null };
export type FeedProcessContext = {
  existingGuids: Set<string>;
  existingTitles: Set<string>;
  existingLinks: Set<string>;
  userInterests: InterestRow[];
};

export type PreparedArticle = {
  guid: string;
  title: string;
  link: string;
  normTitle: string;
  normLink: string;
  content: string;
  pubDate: string;
  imageUrl: string | null;
  defaultTags: string[];
  relevance: number;
};

export type FeedUrlTestResult = {
  isValidRss: boolean;
  isScrapeableHtml: boolean;
  detectedName?: string;
  itemCount?: number;
  sampleItems?: FeedTestSampleItem[];
  transformerCreated?: boolean;
  error?: string;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isLikelyXmlFeed(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 100 && !trimmed.startsWith("<!DOCTYPE html") && !trimmed.startsWith("<html");
}

export const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, text/html;q=0.9, */*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
} as const;

export const parser = new Parser({
  headers: DEFAULT_HEADERS,
  timeout: 15000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["content:encoded", "contentEncoded"]
    ]
  }
});
