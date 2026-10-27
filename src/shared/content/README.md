# Shared content layer

This folder contains shared rendering and presentation for document-driven pages. Keep product-specific wording and page composition in `src/products/<product>/`; keep generated route catalogs in `src/content/` and regenerate them with `npm run content:catalog`.

## Responsibilities

- `DocumentPageLayout.tsx` composes the hero and page sections.
- `slides/` renders document heroes and sections.
- `CanonicalCopy.tsx` resolves a route to its registered page component.
- `types.ts` defines the document and copy shapes shared by page renderers.
- `pagePlan.ts` derives section presentation from the content structure.
- `heroScene.ts` selects shared public-page hero imagery.
- `destinations.ts` maps authored CTA labels to routes; `demoDestination.ts` selects a contextual demo route.
- `engine/` contains the shared renderer for product engine pages.

Keep non-rendering site configuration, such as contact details, in `src/shared/config/`. Keep product-specific behavior and wording near the product page that owns it. This keeps the shared content layer reusable and prevents it from becoming a general-purpose site configuration folder.
