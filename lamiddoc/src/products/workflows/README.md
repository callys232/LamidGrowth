# Workflows

Product-owned pages and components in [the source folder](../../../../src/products/workflows). [All products](../README.md)

## Interactive pages

- [WorkflowsPage.tsx](../../../../src/products/workflows/pages/WorkflowsPage.tsx)

## Slides

- [WorkflowsHeadingSlide.tsx](../../../../src/products/workflows/slides/WorkflowsHeadingSlide.tsx)
- [WorkflowsWorkflowCreationSlide.tsx](../../../../src/products/workflows/slides/WorkflowsWorkflowCreationSlide.tsx)
- [WorkflowsWorkflowRunsSlide.tsx](../../../../src/products/workflows/slides/WorkflowsWorkflowRunsSlide.tsx)

## Hooks

- [useWorkflowsPage.ts](../../../../src/products/workflows/hooks/useWorkflowsPage.ts)

## Document pages

Each page folder contains its composition, named slides, and editable `content.json`.

| Route              | Page composition                                                                                                                | Copy                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| /product/workflows | [ProductWorkflowsDocumentPage](../../../../src/products/workflows/pages/product-workflows/ProductWorkflowsDocumentPage.tsx)     | [content.json](../../../../src/products/workflows/pages/product-workflows/content.json)   |
| /os/workflows      | [OsWorkflowsDocumentPage](../../../../src/products/workflows/pages/os-workflows/OsWorkflowsDocumentPage.tsx)                    | [content.json](../../../../src/products/workflows/pages/os-workflows/content.json)        |
| /os/workflows/[id] | [OsWorkflowsDetailDocumentPage](../../../../src/products/workflows/pages/os-workflows-detail/OsWorkflowsDetailDocumentPage.tsx) | [content.json](../../../../src/products/workflows/pages/os-workflows-detail/content.json) |
