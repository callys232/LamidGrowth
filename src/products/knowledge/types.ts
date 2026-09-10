export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  objectiveId: string | null;
  sourceType: 'note' | 'text-file';
  sourceName: string;
  classification: 'workspace' | 'confidential';
  version: number;
  observedAt: string;
  contentHash: string;
}
