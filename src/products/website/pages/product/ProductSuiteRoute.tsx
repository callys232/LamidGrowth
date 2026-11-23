import { ProductSuitePage } from './ProductSuitePage';
import { productSuites } from './productSuitesData';

export type ProductSuiteKey = keyof typeof productSuites;

export function ProductSuiteRoute({ suiteKey }: { suiteKey: ProductSuiteKey }) {
  return <ProductSuitePage config={productSuites[suiteKey]} />;
}
