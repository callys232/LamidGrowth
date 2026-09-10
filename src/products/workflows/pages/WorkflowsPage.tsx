import { useWorkflowsPage } from '../hooks/useWorkflowsPage';
import { WorkflowsHeadingSlide } from '../slides/WorkflowsHeadingSlide';
import { WorkflowsWorkflowCreationSlide } from '../slides/WorkflowsWorkflowCreationSlide';
import { WorkflowsWorkflowRunsSlide } from '../slides/WorkflowsWorkflowRunsSlide';

/** Compose the page in reading order. Edit each section in ../slides. */
export function Workflows() {
  const page = useWorkflowsPage();
  return (
    <>
      <WorkflowsHeadingSlide />
      <WorkflowsWorkflowCreationSlide
        error={page.error}
        canManage={page.canManage}
        state={page.state}
        create={page.create}
        busy={page.busy}
      />
      <WorkflowsWorkflowRunsSlide
        runs={page.runs}
        state={page.state}
        canManage={page.canManage}
        busy={page.busy}
        command={page.command}
      />
    </>
  );
}
