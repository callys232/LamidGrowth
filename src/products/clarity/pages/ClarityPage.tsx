import { useClarityPage } from '../hooks/useClarityPage';
import { ClarityFiltersSlide } from '../slides/ClarityFiltersSlide';
import { ClarityHeadingSlide } from '../slides/ClarityHeadingSlide';
import { ClarityObjectiveDialogSlide } from '../slides/ClarityObjectiveDialogSlide';
import { ClarityObjectivesSlide } from '../slides/ClarityObjectivesSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Clarity() {
  const page = useClarityPage();
  return (
    <>
      <ClarityHeadingSlide newObjective={page.newObjective} />
      <ClarityFiltersSlide filter={page.filter} setFilter={page.setFilter} state={page.state} />
      <ClarityObjectivesSlide
        state={page.state}
        filter={page.filter}
        setSelected={page.setSelected}
        newObjective={page.newObjective}
      />
      <ClarityObjectiveDialogSlide selected={page.selected} setSelected={page.setSelected} />
    </>
  );
}
