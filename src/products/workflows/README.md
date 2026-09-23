# Workflows

Product-owned pages and components. [Editing guide](../../../docs/PAGE_COMPONENT_GUIDE.md) · [All products](../README.md)

## Interactive pages

- [WorkflowsPage.tsx](./pages/WorkflowsPage.tsx)

## Slides

- [WorkflowsHeadingSlide.tsx](./slides/WorkflowsHeadingSlide.tsx)
- [WorkflowsWorkflowCreationSlide.tsx](./slides/WorkflowsWorkflowCreationSlide.tsx)
- [WorkflowsWorkflowRunsSlide.tsx](./slides/WorkflowsWorkflowRunsSlide.tsx)

## Hooks

- [useWorkflowsPage.ts](./hooks/useWorkflowsPage.ts)

## Document pages

Each page folder contains its composition, named slides, and editable `content.json`.

| Route              | Page composition                                                                               | Copy                                                     |
| ------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| /product/workflows | [ProductWorkflowsDocumentPage](./pages/product-workflows/ProductWorkflowsDocumentPage.tsx)     | [content.json](./pages/product-workflows/content.json)   |
| /os/workflows      | [OsWorkflowsDocumentPage](./pages/os-workflows/OsWorkflowsDocumentPage.tsx)                    | [content.json](./pages/os-workflows/content.json)        |
| /os/workflows/[id] | [OsWorkflowsDetailDocumentPage](./pages/os-workflows-detail/OsWorkflowsDetailDocumentPage.tsx) | [content.json](./pages/os-workflows-detail/content.json) |
