import { useEffect, useMemo, useRef, useState } from "react";
import { createFeedController } from "./settingsPanelViewModel";
import { loadData, loadPushSettings, normalizeFeedUrl } from "./settingsPanelViewModel";
import { INITIAL_SETTINGS_PANEL_STATE } from "./settingsPanelTypes";

export function useSettingsPanelController() {
  const [state, setState] = useState(INITIAL_SETTINGS_PANEL_STATE);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const existingFeedUrls = useMemo(() => new Set(state.feeds.map((feed) => normalizeFeedUrl(feed.url))), [state.feeds]);

  useEffect(() => { void loadData(setState); void loadPushSettings(setState); }, []);
  return createFeedController(existingFeedUrls, importFileInputRef, state, setState);
}
