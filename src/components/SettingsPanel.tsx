import FeedListItem from "./FeedListItem";
import FeedSearchByKeyword from "./FeedSearchByKeyword";
import { handleExportFeeds, handleImportFeeds, useManualFeedForm, useSettingsFeeds, useSettingsSearch } from "./settingsPanelHooks";
import { addFeed, removeFeed } from "../lib/feedsStorage";
import type { SuggestedFeed } from "../types";

function FeedLibrarySection({ feeds, onDelete, onExport, onImport, feedback }: { feeds: ReturnType<typeof useSettingsFeeds>["feeds"]; onDelete: (url: string) => void; onExport: () => void; onImport: React.ChangeEventHandler<HTMLInputElement>; feedback: string | null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Sorgenti RSS</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gestisci i feed salvati in locale.</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Importa
            <input type="file" accept="application/json" onChange={onImport} className="hidden" />
          </label>
          <button type="button" onClick={onExport} disabled={feeds.length === 0} className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Esporta</button>
        </div>
      </div>
      {feedback ? <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{feedback}</p> : null}
      <div className="mt-6 grid grid-cols-1 gap-3">
        {feeds.map((feed) => (
          <FeedListItem key={feed.url} feed={feed} onDelete={onDelete} />
        ))}
        {feeds.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Nessun feed configurato.</p> : null}
      </div>
    </section>
  );
}

function ManualFeedSection(props: ReturnType<typeof useManualFeedForm>) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Aggiungi manualmente</h3>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <input type="text" value={props.manualName} onChange={(event) => props.setManualName(event.target.value)} placeholder="Nome feed" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        <input type="url" value={props.manualUrl} onChange={(event) => props.setManualUrl(event.target.value)} placeholder="https://example.com/feed.xml" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
        <button type="button" onClick={props.handleAddManualFeed} disabled={!props.manualUrl.trim()} className="w-fit cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Aggiungi feed</button>
      </div>
    </section>
  );
}

export default function SettingsPanel() {
  const feedState = useSettingsFeeds();
  const searchState = useSettingsSearch();
  const manualForm = useManualFeedForm(feedState.setFeeds, (value) => searchState.setFeedback(value));

  const handleAddFeed = (feed: SuggestedFeed) => {
    feedState.setFeeds(addFeed(feed));
    searchState.setFeedback(`Feed aggiunto: ${feed.name}`);
  };

  const handleDeleteFeed = (url: string) => {
    feedState.setFeeds(removeFeed(url));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <FeedLibrarySection
        feeds={feedState.feeds}
        onDelete={handleDeleteFeed}
        onExport={() => handleExportFeeds(feedState.feeds)}
        onImport={(event) => void handleImportFeeds(event, feedState.setFeeds, (value) => searchState.setFeedback(value))}
        feedback={searchState.feedback}
      />
      <FeedSearchByKeyword keyword={searchState.keyword} onKeywordChange={searchState.setKeyword} loading={searchState.loading} feedback={searchState.feedback} results={searchState.results} existingFeedUrls={feedState.existingFeedUrls} onSearch={searchState.handleSearch} onAdd={handleAddFeed} />
      <ManualFeedSection {...manualForm} />
    </div>
  );
}
