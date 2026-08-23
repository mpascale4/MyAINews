export interface Article {
  id: number;
  guid: string;
  title: string;
  link: string;
  content: string | null;
  pubDate: string | null;
  source: string | null;
  imageUrl: string | null;
  aiSummary: string | null;
  aiTags: string[] | null;
  aiRelevance: number;
  isRead: boolean;
  isHidden: boolean;
  isSaved?: boolean;
  savedAt?: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Interest {
  id: number;
  keyword: string;
  type: 'positive' | 'negative';
  weight: number;
}

export interface Feed {
  id: number;
  url: string;
  name: string;
  isManual?: boolean;
  addedVia?: string | null;
}

export interface SuggestedFeed {
  name: string;
  url: string;
  reason?: string;
  category?: string;
  isNew?: boolean;
}
