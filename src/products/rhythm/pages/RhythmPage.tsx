import { useRhythmPage } from '../hooks/useRhythmPage';
import { RhythmHeadingSlide } from '../slides/RhythmHeadingSlide';
import { RhythmOverviewSlide } from '../slides/RhythmOverviewSlide';
import { RhythmReflectionDialogSlide } from '../slides/RhythmReflectionDialogSlide';
import { RhythmReflectionsSlide } from '../slides/RhythmReflectionsSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Rhythm(props: { progress?: boolean }) {
  const page = useRhythmPage(props);
  return (
    <>
      <RhythmHeadingSlide progress={page.progress} setOpen={page.setOpen} />
      <RhythmOverviewSlide done={page.done} state={page.state} />
      <RhythmReflectionsSlide state={page.state} setOpen={page.setOpen} />
      <RhythmReflectionDialogSlide
        open={page.open}
        setOpen={page.setOpen}
        save={page.save}
        error={page.error}
        busy={page.busy}
      />
    </>
  );
}
