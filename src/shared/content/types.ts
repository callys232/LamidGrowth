export interface CopyParagraph {
  text: string;
  sourceParagraph: number;
}
export interface CopySection {
  label: string;
  title: string;
  paragraphs: CopyParagraph[];
}
export interface DocumentPage {
  page: number;
  name: string;
  route: string;
  source_paragraph: number;
  gates: string[];
  seo_title: string;
  meta_description: string;
  title: string;
  description: string;
  hero: CopySection;
  sections: CopySection[];
}
export interface DocumentPageProps {
  embedded?: boolean;
}
