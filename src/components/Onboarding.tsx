import { useOnboardingFeeds } from "../hooks/useOnboardingFeeds";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingSearchColumn } from "./OnboardingSearchColumn";
import { OnboardingSelectedPanel } from "./OnboardingSelectedPanel";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const {
    searchKeyword,
    setSearchKeyword,
    searchResults,
    searchLoading,
    searchError,
    suggestedFeeds,
    finishing,
    handleSearch,
    addFeed,
    removeFeed,
    handleFinish,
  } = useOnboardingFeeds(onComplete);

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 transition-colors">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col h-[90vh] md:h-[80vh] transition-colors">
        <OnboardingHeader finishing={finishing} onFinish={handleFinish} />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-50 dark:bg-slate-950/50">
          <OnboardingSearchColumn
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
            searchResults={searchResults}
            searchLoading={searchLoading}
            searchError={searchError}
            onSearch={handleSearch}
            onAddFeed={addFeed}
          />
          <OnboardingSelectedPanel suggestedFeeds={suggestedFeeds} onRemoveFeed={removeFeed} />
        </div>
      </div>
    </div>
  );
}
