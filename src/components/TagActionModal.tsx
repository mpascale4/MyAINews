import { X, Sparkles, Loader2, Check, Plus, Tag, Compass } from "lucide-react";

interface TagFeedResult {
  name: string;
  url: string;
  reason: string;
  category: string;
}

interface TagActionModalProps {
  tag: string;
  selectedTag: string | null;
  searchLoading: boolean;
  searchResults: TagFeedResult[];
  searchFeedback: string | null;
  allAddedFeeds: Record<string, boolean>;
  onSearch: (tag: string) => void;
  onAddFeed: (feed: TagFeedResult) => void;
  onToggleFilter: (tag: string) => void;
  onClose: () => void;
}

interface ModalHeaderProps {
  tag: string;
  onClose: () => void;
}

function ModalHeader({ tag, onClose }: ModalHeaderProps) {
  return (
    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-indigo-50/70 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">
            Trova Fonti Correlate con AI
          </h3>
          <span className="inline-block font-bold text-indigo-600 dark:text-indigo-400 text-sm">
            #{tag}
          </span>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

interface InitialPromptProps {
  tag: string;
  onSearch: (tag: string) => void;
}

function InitialPrompt({ tag, onSearch }: InitialPromptProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        Vuoi utilizzare l'Intelligenza Artificiale per scoprire nuovi feed RSS e sorgenti di
        notizie aggiornate dedicate a{" "}
        <strong className="text-indigo-600 dark:text-indigo-400">#{tag}</strong>?
      </div>
      <button
        onClick={() => onSearch(tag)}
        className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-semibold rounded-2xl text-sm transition-all shadow-xs cursor-pointer"
      >
        <Sparkles className="w-4 h-4 text-amber-300" />
        Cerca Fonti con AI
      </button>
    </div>
  );
}

interface SearchLoadingProps {
  tag: string;
}

function SearchLoading({ tag }: SearchLoadingProps) {
  return (
    <div className="py-8 flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
        L'AI sta cercando i migliori feed per #{tag}...
      </p>
    </div>
  );
}

interface SearchResultsListProps {
  searchResults: TagFeedResult[];
  allAddedFeeds: Record<string, boolean>;
  onAddFeed: (feed: TagFeedResult) => void;
}

function SearchResultsList({ searchResults, allAddedFeeds, onAddFeed }: SearchResultsListProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Sorgenti consigliate trovate:
      </h4>
      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {searchResults.map((feed, idx) => {
          const isAdded = !!allAddedFeeds[feed.url];
          return (
            <div
              key={idx}
              className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-3xs"
            >
              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block truncate">
                  {feed.name}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
                  {feed.reason || feed.category || "Feed correlato"}
                </span>
              </div>
              <button
                onClick={() => onAddFeed(feed)}
                disabled={isAdded}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all shadow-3xs cursor-pointer flex items-center gap-1 ${
                  isAdded
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Aggiunto
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Aggiungi
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ModalFooterProps {
  tag: string;
  selectedTag: string | null;
  onToggleFilter: (tag: string) => void;
  onClose: () => void;
}

function ModalFooter({ tag, selectedTag, onToggleFilter, onClose }: ModalFooterProps) {
  return (
    <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
      <button
        onClick={() => onToggleFilter(tag)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40 font-semibold rounded-2xl text-sm transition-all cursor-pointer"
      >
        <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        {selectedTag === tag ? "Disattiva filtro tag" : `Filtra notizie per #${tag}`}
      </button>

      <button
        onClick={onClose}
        className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl text-sm transition-all cursor-pointer"
      >
        Annulla
      </button>
    </div>
  );
}

interface ModalContentSectionProps {
  tag: string;
  searchLoading: boolean;
  searchResults: TagFeedResult[];
  searchFeedback: string | null;
  allAddedFeeds: Record<string, boolean>;
  onSearch: (tag: string) => void;
  onAddFeed: (feed: TagFeedResult) => void;
}

function ModalContentSection({
  tag,
  searchLoading,
  searchResults,
  searchFeedback,
  allAddedFeeds,
  onSearch,
  onAddFeed,
}: ModalContentSectionProps) {
  return (
    <div className="space-y-5">
      {searchResults.length === 0 && !searchLoading && (
        <InitialPrompt tag={tag} onSearch={onSearch} />
      )}

      {searchLoading && <SearchLoading tag={tag} />}

      {searchFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{searchFeedback}</span>
        </div>
      )}

      {searchResults.length > 0 && (
        <SearchResultsList
          searchResults={searchResults}
          allAddedFeeds={allAddedFeeds}
          onAddFeed={onAddFeed}
        />
      )}
    </div>
  );
}

// Modal shown when clicking a tag on an article: lets the user AI-search related
// feeds for that tag, add them, or toggle a filter on the current tag.
export default function TagActionModal({
  tag,
  selectedTag,
  searchLoading,
  searchResults,
  searchFeedback,
  allAddedFeeds,
  onSearch,
  onAddFeed,
  onToggleFilter,
  onClose,
}: TagActionModalProps) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader tag={tag} onClose={onClose} />

        <div className="p-6 space-y-5">
          <ModalContentSection
            tag={tag}
            searchLoading={searchLoading}
            searchResults={searchResults}
            searchFeedback={searchFeedback}
            allAddedFeeds={allAddedFeeds}
            onSearch={onSearch}
            onAddFeed={onAddFeed}
          />

          <ModalFooter
            tag={tag}
            selectedTag={selectedTag}
            onToggleFilter={onToggleFilter}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
