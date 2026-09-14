import { DocumentHeroSlide } from '../../../../shared/content/slides/DocumentHeroSlide';
import type { DocumentPageProps } from '../../../../shared/content/types';
import content from './content.json';

export function ExpertNetworkHeroSlide({ embedded = false }: DocumentPageProps) {
  return <DocumentHeroSlide page={content} embedded={embedded} />;
}
