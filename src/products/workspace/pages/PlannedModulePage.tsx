import { usePlannedModulePage } from '../hooks/usePlannedModulePage';
import { PlannedModuleAvailabilitySlide } from '../slides/PlannedModuleAvailabilitySlide';
import { PlannedModuleHeadingSlide } from '../slides/PlannedModuleHeadingSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function PlannedModule() {
  const page = usePlannedModulePage();
  return (
    <>
      <PlannedModuleHeadingSlide />
      <PlannedModuleAvailabilitySlide location={page.location} />
    </>
  );
}
