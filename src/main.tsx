import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource/instrument-serif/400.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { applyTheme, getStoredTheme } from './shared/lib/theme';
import { MotionProvider } from './shared/visuals/Motion';
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
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
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
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MotionProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MotionProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
