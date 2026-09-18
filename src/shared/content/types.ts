export interface CopyParagraph {
  text: string;
  sourceParagraph: number;
}
export interface CopySection {
  label: string;
  title: string;
  paragraphs: CopyParagraph[];
}
// The hero's own label is only read by a few page renderers (EngineDocumentPage, AudienceHero) —
// DocumentHeroSlide, used by the great majority of pages, renders the page-level `name` as its
// eyebrow instead and never reads this field, so most content.json files omit it.
export interface HeroSection extends Omit<CopySection, 'label'> {
  label?: string;
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
  hero: HeroSection;
  sections: CopySection[];
}
export interface DocumentPageProps {
  embedded?: boolean;
}
