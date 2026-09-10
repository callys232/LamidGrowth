import { useSettingsPage } from '../hooks/useSettingsPage';
import { SettingsHeadingSlide } from '../slides/SettingsHeadingSlide';
import { SettingsWorkspaceSettingsSlide } from '../slides/SettingsWorkspaceSettingsSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Settings() {
  const page = useSettingsPage();
  return (
    <>
      <SettingsHeadingSlide />
      <SettingsWorkspaceSettingsSlide
        save={page.save}
        state={page.state}
        canManage={page.canManage}
        error={page.error}
        busy={page.busy}
      />
    </>
  );
}
