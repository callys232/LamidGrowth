import { UpdatedDocumentPage } from '../../../../shared/content/UpdatedDocumentPage';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';
import { WorkspacePreview } from '../home/components/WorkspacePreview';
import '../home/home.css';

export function ProductDocumentPage({ embedded = false }: DocumentPageProps) {
  return (
    <UpdatedDocumentPage
      content={content}
      embedded={embedded}
      extraSection={
        <section
          className="lamid-home product-workspace-example"
          aria-label="Explore the workspace"
        >
          <WorkspacePreview />
        </section>
      }
    />
  );
}
