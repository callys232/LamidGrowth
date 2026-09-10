import { Button } from '../../../shared/ui/Button';
import { PageHeading } from '../../../shared/workspace/PageHeading';
import type { useKnowledgePage } from '../hooks/useKnowledgePage';

export function KnowledgeHeadingSlide({
  setSelected,
}: Pick<ReturnType<typeof useKnowledgePage>, 'setSelected'>) {
  return (
    <>
      <PageHeading
        eyebrow="KNOWLEDGE"
        title="Context you can inspect"
        description="Keep source notes and text documents connected to your objectives."
      >
        <Button onClick={() => setSelected('new')}>Add knowledge</Button>
      </PageHeading>
      <p>
        Knowledge is shared with active members of this workspace. Classification labels describe
        sensitivity; they do not create separate access permissions.
      </p>
    </>
  );
}
