import { useCommercialPage } from '../hooks/useCommercialPage';
import { CommercialHeadingSlide } from '../slides/CommercialHeadingSlide';
import { CommercialJobDialogsSlide } from '../slides/CommercialJobDialogsSlide';
import { CommercialOpportunitiesSlide } from '../slides/CommercialOpportunitiesSlide';
import { CommercialOpportunityFiltersSlide } from '../slides/CommercialOpportunityFiltersSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Commercial() {
  const page = useCommercialPage();
  return (
    <>
      <CommercialHeadingSlide setCreating={page.setCreating} options={page.options} />
      <CommercialOpportunityFiltersSlide
        balance={page.balance}
        options={page.options}
        view={page.view}
        setView={page.setView}
        setOffset={page.setOffset}
        state={page.state}
        query={page.query}
        setQuery={page.setQuery}
        error={page.error}
      />
      <CommercialOpportunitiesSlide
        jobs={page.jobs}
        setSelected={page.setSelected}
        view={page.view}
        offset={page.offset}
        setOffset={page.setOffset}
      />
      <CommercialJobDialogsSlide
        creating={page.creating}
        options={page.options}
        state={page.state}
        setCreating={page.setCreating}
        setRevision={page.setRevision}
        selected={page.selected}
        setSelected={page.setSelected}
      />
    </>
  );
}
