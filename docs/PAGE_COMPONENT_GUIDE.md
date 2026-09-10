# Editing pages and product components

The frontend is organized by product. A **slide** means a section of a scrolling page, not a carousel or presentation mode. Routes, CSS classes, document paragraph markers, permissions and API contracts are preserved.

Start at [the product directory](../src/products/README.md). Each product README links to its screens, document pages and reusable components.

```text
src/
  App.tsx                         Route composition
  products/
    companion/
      README.md                   Product file map
      pages/
        CompanionPage.tsx         Interactive page: sections in reading order
        product-companion/
          ProductCompanionDocumentPage.tsx
          slides.tsx              Named public-page sections
          content.json            This page's editable copy
        os-companion/             Document copy embedded in the workspace
      slides/                     Interactive page sections
      components/                 Planning steps and context panel
      hooks/useCompanionPage.ts    State, handlers and API calls
    clarity/                      Objectives and their editor
    consistency/                  Actions and their review controls
    commercial/                   Jobs, bids and proposal forms
    knowledge/                    Knowledge list and editor
    workflows/                    Workflow creation and run controls
    ...
  shared/
    ui/                           Button, Field, Modal, Empty, etc.
    workspace/                    PageHeading and StatusPill
    content/                      Shared document layouts and slide renderers
    layout/                       PublicHeader and Footer
    visuals/                      Motion and Orbit components
    lib/                          Shared context options and date labels
  content/
    page-manifest.json            Route → product → content → component
    catalog.ts                    Generated content imports
    documentPages.ts              Generated page-component registry
    pages.json                    Original document-import snapshot, not runtime copy
```

## Change a workspace page

Open the product's `pages/*Page.tsx` file. Its JSX lists the slides in reading order. Reorder these components to reorder the sections. Open the corresponding `slides/` file to edit that section's layout. Reusable forms, cards and smaller panels live in `components/`.

State and requests live in `hooks/use*Page.ts`. A page calls its hook once and passes explicit props into its slides. Do not call that hook independently in each slide: doing so creates separate state and duplicate requests. Slide props use `Pick<ReturnType<typeof use...Page>, ...>` to keep their types aligned with the shared page state; those imports are type-only and do not run the hook.

For example, [DashboardPage.tsx](../src/products/workspace/pages/DashboardPage.tsx) composes its heading, focus section, statistics, objectives and next steps. [CompanionGuidedPlanningSlide.tsx](../src/products/companion/slides/CompanionGuidedPlanningSlide.tsx) composes separate objective, context, plan-review and completion steps.

## Change a document page

Find its route in [page-manifest.json](../src/content/page-manifest.json), or follow the product README. Each of the 98 document pages owns three files:

- `content.json`: page metadata and copy, grouped into hero and sections. The old duplicated `blocks` and `body` arrays are omitted.
- `*DocumentPage.tsx`: the section order and layout composition.
- `slides.tsx`: named React components for this page's hero and sections. Their names follow the section headings. Shared rendering lives in `shared/content/slides/`.

The homepage has a dedicated `slides/` directory, local reusable components, and `home.css` for its customized presentation. See its [editing map](../src/products/website/pages/home/README.md).

Edit the local content file for wording changes. Keep the `sourceParagraph` markers when maintaining traceability to the supplied document. The original-copy test deliberately reports wording changes that diverge from that document; revise the source/acceptance expectations intentionally when copy is approved.

Edit a page's named slide to customize its presentation without changing other pages. Edit a shared document slide only when the change should apply everywhere. A document page can render publicly or embedded in a workspace, so preserve its `embedded` prop. If adding, removing or reordering sections, update the composition and the section indexes in `slides.tsx` together; the navigation index follows `content.sections`.

## Add a page or product

Create the named product folder and its page, slide and component files. Use folders only when there is content to put in them. Add functional workspace routes in `App.tsx`. For a document page, add its route and file paths to `src/content/page-manifest.json`, then run `npm run content:catalog` to rebuild the two registries. This command does not overwrite hand-edited components or copy.

`npm run content:generate` deliberately re-imports `document-study/pithy-v1.4-source.json`: it replaces product-local document copy and the aggregate snapshot. Do not use it for everyday JSX editing. If the document adds routes, register their page files first. It does not rewrite slide composition, so review section changes after an import. See [the v1.4 source notes](./WEBSITE_COPY_V1_4.md) for provenance and editorial exclusions.

## Shared ownership and verification

The former `WorkspaceParts.tsx` is split between `shared/workspace`, `clarity/components` and `consistency/components`. The old `pages/Workspace.tsx` barrel is replaced by direct product imports. Account forms are under `accounts`; the workspace shell is under `workspace/components`.

Backend route modules live in [`src/app`](../src/app/README.md); the server bootstrap and SQLite persistence remain in `server/`. Existing global CSS layers remain in `src/`. Product folders containing only document pages describe planned capabilities; they do not imply an implemented workspace feature.

Run `npm run check`, then `npm run test:e2e` (set `BROWSER_CHANNEL=msedge` for installed Edge). Browser tests cover the document routes and existing interactive journeys. A source backup from before this refactor is at `artifacts/source-before-page-organization.zip`.

Validation on 2026-09-09: the production build, 36 automated tests and 17 browser tests passed after the page refactor and homepage redesign. Refresh product README indexes with `npm run docs:products` after adding or moving product files.
