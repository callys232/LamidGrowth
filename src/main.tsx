import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/standard-italic.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { applyContrast, applyTheme, getStoredContrast, getStoredTheme } from './shared/lib/theme';
import { MotionProvider } from './shared/visuals/Motion';
import { InteractionFeedback } from './shared/visuals/InteractionFeedback';
import { reportClientError } from './errorReporting';
import { readDemoSession } from './products/workspace/sandbox/demoSession';
import { endDemoSession } from './products/workspace/sandbox/demoSession';
import './styles.css';
import './readability.css';
import './design-system.css';
import './navigation.css';
import './interactions.css';
import './page-themes.css';
import './canonical.css';
import './cards.css';
import './showcase.css';
import './ui-refresh.css';
import './theme.css';
import './micro-interactions.css';
import './public-refresh.css';
import './workspace-ui.css';
import './workspace-legacy.css';
import './contrast.css';
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    reportClientError('render', error);
  }
  render() {
    return this.state.failed ? (
      <main className="error-page">
        <h1>Let’s reconnect.</h1>
        <p>The page could not be displayed. Your saved work is still available.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
applyTheme(getStoredTheme());
applyContrast(getStoredContrast());
window.addEventListener('error', (event) =>
  reportClientError('error', event.error || event.message),
);
window.addEventListener('unhandledrejection', (event) =>
  reportClientError('rejection', event.reason),
);
function start() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <MotionProvider>
          <BrowserRouter>
            <InteractionFeedback />
            <App />
          </BrowserRouter>
        </MotionProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
// Demo visitors: load the in-browser sandbox and route every api() call to it before anything
// renders. Everyone else never downloads the sandbox code.
if (readDemoSession() && window.location.pathname.startsWith('/os'))
  void import('./products/workspace/sandbox/session')
    .then(({ activateSandboxIfDemo }) => activateSandboxIfDemo())
    .catch(() => {
      endDemoSession();
      window.location.replace('/demo');
    })
    .finally(start);
else start();
