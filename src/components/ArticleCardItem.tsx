import type { MouseEvent } from "react";
import type { Article } from "../types";
import { ArticleCardBody } from "./ArticleCardItemParts";

type ArticleCardItemProps = {
  article: Article;
  onOpenSummary: (article: Article) => void;
  onShare: (article: Article, event?: MouseEvent) => void;
  onOpenInfo?: (article: Article) => void;
};

export default function ArticleCardItem({ article, onOpenSummary, onShare, onOpenInfo }: ArticleCardItemProps) {
  return <ArticleCardBody article={article} onOpenSummary={onOpenSummary} onShare={onShare} onOpenInfo={onOpenInfo} />;
}
