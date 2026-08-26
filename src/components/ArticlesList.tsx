import { ArticlesListLayout } from "./articlesList/ArticlesListLayout";
import { useArticlesListController } from "./articlesList/useArticlesListController";

function ArticlesListContent() {
  const controller = useArticlesListController();
  return <ArticlesListLayout {...controller} />;
}

export default function ArticlesList() {
  return <ArticlesListContent />;
}
