import { useCapabilityPage } from '../hooks/useCapabilityPage';
import { CapabilityHeadingSlide } from '../slides/CapabilityHeadingSlide';
import { CapabilityIntroductionSlide } from '../slides/CapabilityIntroductionSlide';
import { CapabilityObjectiveCapabilitiesSlide } from '../slides/CapabilityObjectiveCapabilitiesSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Capability() {
  const page = useCapabilityPage();
  return (
    <>
      <CapabilityHeadingSlide />
      <CapabilityIntroductionSlide />
      <CapabilityObjectiveCapabilitiesSlide state={page.state} newAction={page.newAction} />
    </>
  );
}
