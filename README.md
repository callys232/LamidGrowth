# LAMID ONE

LAMID ONE is a guided workspace for turning goals into clear decisions, practical work, and visible progress. People and teams can start with what matters now and add structure as their needs grow.

## Get started

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Use `npm run build` to compile the application and `npm test` to run the automated tests.

## Find your way around

| Location | Purpose |
| --- | --- |
| `src/products/` | Product areas and their pages, components, styles, and state |
| `src/shared/` | Reusable interface, navigation, configuration, and content rendering |
| `src/shared/content/` | Shared public-page layout, copy rendering, CTA destinations, and hero presentation |
| `src/content/` | Generated page catalog and route-to-page registry |
| `src/app/` | HTTP app setup and cohesive API route groups |
| `src/contracts/` | Shared request and response schemas |
| `server/` | PostgreSQL access, schema, and migrations |
| `tests/` | Unit, API, browser, and release checks |
| `lamiddoc/` | Development notes, deployment guides, and archived source material |

## Editing public pages and messages

Page-specific content belongs with its product in `src/products/<product>/`. Product `content.json` files are the editable source for document-driven pages. `src/content/pageIndex.ts` and `src/content/documentPages.ts` are generated; edit the product source and run `npm run content:catalog` instead of editing those generated files.

Shared page rendering lives in `src/shared/content/`: `DocumentPageLayout.tsx` composes a page, `slides/` renders its hero and sections, `destinations.ts` maps CTA labels to routes, and `heroScene.ts` selects hero imagery. Keep page-specific wording with its page, and change shared labels or link behavior only when the change should apply across pages.

Write for the reader's next decision. Prefer concrete outcomes and plain language, explain what a capability does before describing its architecture, and make CTA labels say what happens when selected. Keep product claims aligned with implemented behavior; describe planned or gated capabilities as such.

## Useful commands

```sh
npm run build
npm test
npm run test:e2e
npm run format:check
```

For deployment, database, and release guidance, see [`lamiddoc/README.md`](lamiddoc/README.md) and [`server/migrations.md`](server/migrations.md).
