import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { PassThrough } from 'node:stream';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { MotionProvider } from './shared/visuals/Motion';
import { InteractionFeedback } from './shared/visuals/InteractionFeedback';
import { ScrollPop } from './shared/visuals/ScrollPop';

export function renderRoute(route: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let didError = false;
    const stream = renderToPipeableStream(
      <React.StrictMode>
        <MotionProvider>
          <MemoryRouter initialEntries={[route]}>
            <InteractionFeedback />
            <ScrollPop />
            <App />
          </MemoryRouter>
        </MotionProvider>
      </React.StrictMode>,
      {
        onAllReady() {
          const output = new PassThrough();
          let html = '';
          output.setEncoding('utf8');
          output.on('data', (chunk: string) => (html += chunk));
          output.on('end', () => (didError ? reject(new Error(`SSR render failed for ${route}`)) : resolve(html)));
          stream.pipe(output);
        },
        onError(error) {
          didError = true;
          console.error(`SSR render error on ${route}:`, error);
        },
      },
    );
    const timeout = setTimeout(() => {
      stream.abort();
      reject(new Error(`SSR timed out for ${route}`));
    }, 30000);
    timeout.unref();
  });
}
