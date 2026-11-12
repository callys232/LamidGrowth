import type { ProductSuiteConfig } from '../ProductSuitePage';
import { DecisionInteractiveSuite } from './DecisionInteractiveSuite';

export function SuiteInteractiveWidget({ config }: { config: ProductSuiteConfig }) {
  if (config.id === 'decisions') {
    return <DecisionInteractiveSuite />;
  }

  // Other suites can have their own specialized interactive models or fall through
  return null;
}

