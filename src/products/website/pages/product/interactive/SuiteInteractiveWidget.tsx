import type { ProductSuiteConfig } from '../ProductSuitePage';
import { DecisionInteractiveSuite } from './DecisionInteractiveSuite';
import { SuiteSimulator } from './SuiteSimulators';

export function SuiteInteractiveWidget({ config }: { config: ProductSuiteConfig }) {
  if (config.id === 'decisions') {
    return <DecisionInteractiveSuite />;
  }

  return <SuiteSimulator suiteId={config.id} />;
}
