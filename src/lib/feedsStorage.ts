import type { Feed } from "../types";

const FEEDS_STORAGE_KEY = "myainews:feeds";
const ONBOARDING_STORAGE_KEY = "myainews:onboarding-complete";

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeFeed(feed: Feed): Feed {
  return {
    name: feed.name.trim() || feed.url.trim(),
    url: feed.url.trim(),
  };
}

export function loadFeeds(): Feed[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(FEEDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Feed[];
    return Array.isArray(parsed) ? parsed.map(normalizeFeed).filter((feed) => feed.url) : [];
  } catch {
    return [];
  }
}

export function saveFeeds(feeds: Feed[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds.map(normalizeFeed)));
}

export function addFeed(feed: Feed) {
  const current = loadFeeds();
  if (current.some((item) => item.url.toLowerCase() === feed.url.trim().toLowerCase())) return current;

  const next = [...current, normalizeFeed(feed)];
  saveFeeds(next);
  return next;
}

export function removeFeed(url: string) {
  const next = loadFeeds().filter((feed) => feed.url.toLowerCase() !== url.trim().toLowerCase());
  saveFeeds(next);
  return next;
}

export function isOnboardingComplete() {
  return isBrowser() && window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
}

export function markOnboardingComplete() {
  if (isBrowser()) {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }
}
