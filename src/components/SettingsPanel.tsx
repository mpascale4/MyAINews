import { SettingsPanelSections } from "./settingsPanel/SettingsPanelSections";
import { useSettingsPanelController } from "./settingsPanel/useSettingsPanelController";

function SettingsPanelContent() {
  const controller = useSettingsPanelController();
  return <SettingsPanelSections controller={controller} />;
}

export default function SettingsPanel() {
  return <SettingsPanelContent />;
}
