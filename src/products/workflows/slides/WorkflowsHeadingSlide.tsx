import { PageHeading } from '../../../shared/workspace/PageHeading';

export function WorkflowsHeadingSlide() {
  return (
    <>
      <PageHeading
        eyebrow="WORKFLOWS"
        title="Work that carries forward"
        description="Schedule a bounded sequence, review each change, and see what happened."
      />
      <p>
        Workflows continue while the application server is running. Each change waits for your
        approval. Pausing or cancelling stops future steps; completed changes remain in your
        workspace.
      </p>
    </>
  );
}
