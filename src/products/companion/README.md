# Companion

Product-owned pages and components. [Editing guide](../../../docs/PAGE_COMPONENT_GUIDE.md) · [All products](../README.md)

## Interactive pages

- [CompanionPage.tsx](./pages/CompanionPage.tsx)

## Connected goal planning

Guided Planning collects a goal, situation, success measure, and constraints, then
previews five editable steps through `POST /api/plans/preview`. Suggestions use
free deterministic templates for business growth, capability building, decisions,
and general goals. Users can instead request an AI pathway after reviewing their
rules and consenting. `mode: 'ai'`, `consent: true`, and the current `rulesVersion`
are required. The provider receives only the draft objective and planning preferences;
its structured suggestions and assumptions are validated before display. AI pathway
requests cost zero points but count against the daily AI quota. Provider failure
leaves the existing draft intact. Suggestions never execute actions.

Users select which steps to follow and can add their own first action. `POST
/api/plans` saves the objective and selected actions in one transaction, supports
idempotent retries, and retains the legacy `nextAction` and `action` response.
The additional `pathway` input accepts up to ten `{ title, notes }` entries; the
`actions` response contains all saved steps. Each action stores `pathwayOrder`.

The saved-goal progress panel reads persisted objectives and actions, displays
completion and the next active/planned action, and links to Consistency filtered
by `?objective=<id>`. Completing all actions prompts a goal review rather than
automatically marking the objective complete. Paid AI specialist workflows
remain a separate opt-in experience in Companion Chat.

Goals can be deleted from the pathway panel or the Clarity editor. The versioned,
confirmed DELETE removes the goal and linked actions from active views by retaining
them as history records. Unfinished workflows must be cancelled first. No AI tool
can delete or edit a goal.

## Human-controlled AI rules

`/os/settings/ai` controls external AI availability, features, permitted source
types, daily requests, per-request points, human expert handoffs, and planning
preferences. Workspace managers configure these rules; ordinary members cannot
override workspace permissions. The server enforces the structured rules across
goal suggestions, Deep Review, Companion, document agents, and deliverable review.
In-flight responses are rejected when policy versions change.

Each supported automated write (action creation, progress recording, reminders)
can be blocked, require approval, or run within a human-authorized workflow. The
worker rechecks rules before execution. Rule changes invalidate earlier approvals.
Free-text preferences guide model output; they do not grant execution permissions.

## Slides

- [CompanionGuidedPlanningSlide.tsx](./slides/CompanionGuidedPlanningSlide.tsx)
- [CompanionHeadingSlide.tsx](./slides/CompanionHeadingSlide.tsx)

## Components

- [CompanionCompletionStep.tsx](./components/CompanionCompletionStep.tsx)
- [CompanionContextPanel.tsx](./components/CompanionContextPanel.tsx)
- [CompanionContextStep.tsx](./components/CompanionContextStep.tsx)
- [CompanionObjectiveStep.tsx](./components/CompanionObjectiveStep.tsx)
- [CompanionPlanReviewStep.tsx](./components/CompanionPlanReviewStep.tsx)

## Hooks

- [useCompanionPage.ts](./hooks/useCompanionPage.ts)

## Document pages

Each page folder contains its composition, named slides, and editable `content.json`.

| Route              | Page composition                                                                           | Copy                                                   |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| /product/companion | [ProductCompanionDocumentPage](./pages/product-companion/ProductCompanionDocumentPage.tsx) | [content.json](./pages/product-companion/content.json) |
| /os/companion      | [OsCompanionDocumentPage](./pages/os-companion/OsCompanionDocumentPage.tsx)                | [content.json](./pages/os-companion/content.json)      |
