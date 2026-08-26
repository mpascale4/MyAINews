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
  mediaContent?: Array<{ $?: { url?: string } }>;
};

export type FeedUrlTestResult = {
  isValidRss: boolean;
  isScrapeableHtml: boolean;
  detectedName?: string;
  itemCount?: number;
  sampleItems?: Array<{ title?: string; link?: string }>;
  transformerCreated?: boolean;
  error?: string;
};

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isLikelyXmlFeed(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  return trimmed.length > 100 && !trimmed.startsWith("<!doctype html") && !trimmed.startsWith("<html");
}

export const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, text/html;q=0.9, */*;q=0.8",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
} as const;

export const parser = new Parser<unknown, ParserItem>({
  headers: DEFAULT_HEADERS,
  timeout: 15000,
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});
