import { Link } from 'react-router-dom';
import { MarketingDemoPage } from '../../../workspace/pages/MarketingDemoPage';

/** /demo/classic — the original stand-alone demo dashboard. Kept reachable while the real-UI demo
 * (/demo/workspace → /os on sandboxed data) gains the views this one still covers (account
 * services, analytics); retired once each of those real pages is covered. */
export function ClassicDemoPage() {
  return (
    <>
      <main id="main" className="public-demo-dashboard workspace-layout">
        <Link className="text-button" to="/demo#profile-demos">
          Choose another demo account
        </Link>
        <MarketingDemoPage />
      </main>
    </>
  );
}
