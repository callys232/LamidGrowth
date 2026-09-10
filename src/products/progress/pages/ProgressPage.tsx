import { useProgressPage } from '../hooks/useProgressPage';
import { ProgressCurrentWorkspaceSlide } from '../slides/ProgressCurrentWorkspaceSlide';
import { ProgressEvidenceHistorySlide } from '../slides/ProgressEvidenceHistorySlide';
import { ProgressHeadingSlide } from '../slides/ProgressHeadingSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Progress() {
  const page = useProgressPage();
  return (
    <>
      <ProgressHeadingSlide />
      <ProgressCurrentWorkspaceSlide state={page.state} />
      <ProgressEvidenceHistorySlide
        error={page.error}
        snapshots={page.snapshots}
        state={page.state}
      />
    </>
  );
}
