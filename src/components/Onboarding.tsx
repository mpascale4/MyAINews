import { useOnboardingFeeds } from "../hooks/useOnboardingFeeds";
import { OnboardingHeader } from "./OnboardingHeader";
import { OnboardingSearchColumn } from "./OnboardingSearchColumn";
import { OnboardingSelectedPanel } from "./OnboardingSelectedPanel";

type OnboardingProps = {
  onComplete: () => void;
};

export default function Onboarding({ onComplete }: OnboardingProps) {
  const controller = useOnboardingFeeds(onComplete);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <OnboardingHeader finishing={controller.finishing} onFinish={controller.handleFinish} />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <OnboardingSearchColumn
            searchKeyword={controller.searchKeyword}
            setSearchKeyword={controller.setSearchKeyword}
            manualName={controller.manualName}
            setManualName={controller.setManualName}
            manualUrl={controller.manualUrl}
            setManualUrl={controller.setManualUrl}
            searchResults={controller.searchResults}
            searchLoading={controller.searchLoading}
            searchError={controller.searchError}
            onSearch={controller.handleSearch}
            onAddFeed={controller.addFeed}
            onAddManualFeed={controller.addManualFeed}
          />
          <OnboardingSelectedPanel selectedFeeds={controller.selectedFeeds} onRemoveFeed={controller.removeFeed} />
        </div>
      </div>
    </div>
  );
}
