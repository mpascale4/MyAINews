import { Article } from "../types";

type ShareErrorWithName = {
  name?: string;
};

// Helper: try Web Share API
async function tryWebShare(
  shareData: ShareData,
  setFeedbackMessage: (msg: string | null) => void,
  successMessage: string
): Promise<boolean> {
  if (navigator.share && typeof navigator.canShare === 'function' && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      setFeedbackMessage(successMessage);
      setTimeout(() => setFeedbackMessage(null), 4000);
      return true;
    } catch (err: unknown) {
      if ((err as ShareErrorWithName).name === 'AbortError') return true;
    }
  }
  return false;
}

// Helper: fallback to clipboard
async function copyToClipboard(
  title: string,
  url: string,
  setFeedbackMessage: (msg: string | null) => void
): Promise<void> {
  try {
    const copyText = `${title}\n${url}`;
    await navigator.clipboard.writeText(copyText);
    setFeedbackMessage("Link dell'articolo copiato negli appunti!");
    setTimeout(() => setFeedbackMessage(null), 4000);
  } catch {
    setFeedbackMessage("Impossibile copiare il link.");
    setTimeout(() => setFeedbackMessage(null), 4000);
  }
}

// Helper: share article via Web Share API or clipboard
export async function shareArticleHelper(
  article: Article,
  setFeedbackMessage: (msg: string | null) => void,
  successMessage = "Notizia condivisa con successo!"
): Promise<void> {
  const title = article.title || "Notizia FeedAI";
  const text = article.aiSummary 
    ? `${title}\n\nRiassunto AI:\n${article.aiSummary}\n\n` 
    : `${title}\n\n`;
  const url = article.link || window.location.href;

  const shareData = { title, text, url };
  const shared = await tryWebShare(shareData, setFeedbackMessage, successMessage);
  if (!shared) {
    await copyToClipboard(title, url, setFeedbackMessage);
  }
}
