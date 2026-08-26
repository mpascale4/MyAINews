import { Article, Interest } from "../../types";
import { StatusFilter } from "./readLaterTypes";

function matchesSearchQuery(article: Article, query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  const matchesTitle = article.title.toLowerCase().includes(normalizedQuery);
  const matchesSource = (article.source || "").toLowerCase().includes(normalizedQuery);
  const matchesTags = (article.aiTags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery));
  return matchesTitle || matchesSource || matchesTags;
}

function matchesStatusFilter(article: Article, statusFilter: StatusFilter): boolean {
  if (statusFilter === "unread") {
    return !article.isRead;
  }
  if (statusFilter === "read") {
    return article.isRead;
  }
  return true;
}

function matchesTagFilter(article: Article, selectedTag: string | null): boolean {
  return !selectedTag || Boolean(article.aiTags && article.aiTags.includes(selectedTag));
}

export function filterArticles(
  articles: Article[],
  searchQuery: string,
  statusFilter: StatusFilter,
  selectedTag: string | null,
): Article[] {
  return articles.filter((article) => {
    if (searchQuery.trim() && !matchesSearchQuery(article, searchQuery)) {
      return false;
    }
    return matchesStatusFilter(article, statusFilter) && matchesTagFilter(article, selectedTag);
  });
}

export function getAvailableTags(articles: Article[]): string[] {
  const tags = new Set<string>();
  articles.forEach((article) => article.aiTags?.forEach((tag) => tags.add(tag)));
  return Array.from(tags);
}

export function getUnreadCount(articles: Article[]): number {
  return articles.filter((article) => !article.isRead).length;
}

export function isTagExcluded(interestsList: Interest[], tagName: string): boolean {
  const normalizedTag = tagName.trim().toLowerCase();
  return interestsList.some((interest) => {
    const normalizedKeyword = interest.keyword.trim().toLowerCase();
    return interest.type === "negative" && (normalizedKeyword === normalizedTag || normalizedTag.includes(normalizedKeyword));
  });
}
