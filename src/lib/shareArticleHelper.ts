import type { Article } from "../types";

export async function shareArticle(article: Article) {
  const text = article.aiSummary ? `${article.title}\n\n${article.aiSummary}` : article.title;

  if (navigator.share) {
    await navigator.share({ title: article.title, text, url: article.link });
    return;
  }

  await navigator.clipboard.writeText(`${article.title}\n${article.link}\n\n${text}`);
}
