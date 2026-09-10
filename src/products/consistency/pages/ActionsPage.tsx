import { useActionsPage } from '../hooks/useActionsPage';
import { ActionsActionDialogSlide } from '../slides/ActionsActionDialogSlide';
import { ActionsActionListSlide } from '../slides/ActionsActionListSlide';
import { ActionsFiltersSlide } from '../slides/ActionsFiltersSlide';
import { ActionsHeadingSlide } from '../slides/ActionsHeadingSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function ActionsPage(props: { today?: boolean; workflows?: boolean }) {
  const page = useActionsPage(props);
  return (
    <>
      <ActionsHeadingSlide
        today={page.today}
        workflows={page.workflows}
        newAction={page.newAction}
      />
      <ActionsFiltersSlide
        filter={page.filter}
        setFilter={page.setFilter}
        statuses={page.statuses}
        setView={page.setView}
        view={page.view}
      />
      <ActionsActionListSlide
        actions={page.actions}
        today={page.today}
        newAction={page.newAction}
        view={page.view}
        statuses={page.statuses}
        filter={page.filter}
        setSelected={page.setSelected}
        state={page.state}
      />
      <ActionsActionDialogSlide selected={page.selected} setSelected={page.setSelected} />
    </>
  );
}
