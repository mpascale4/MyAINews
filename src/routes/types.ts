export type FeedInput = {
  url?: string;
  name?: string;
  isManual?: boolean;
  addedVia?: string;
};

export type SyncInterestInput = {
  keyword?: string;
  type?: string;
  weight?: number;
};

export type SyncFeedInput = {
  url?: string;
  name?: string;
};
