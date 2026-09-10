# Homepage UI study and redesign

Reviewed and implemented on 2026-09-09. The scope combines the requested product/page organization with a homepage redesign informed by HubSpot and ServiceNow. The implementation uses LAMID ONE's own content, identity and components.

## Reference review

**HubSpot:** The rendered desktop homepage places a wide, centered statement above two differentiated conversion actions. Its utility navigation is separate from product navigation; the body introduces people, platform capabilities and customer evidence in distinct sections. The useful lesson is to let the visitor understand the proposition, choose an action and then inspect the product without competing visual priorities. The browser and text extractor received different hero variants, so the design review uses the actual captured browser rendering. [Official homepage](https://www.hubspot.com/), [local reference screenshot](../artifacts/homepage-study/hubspot.png).

**ServiceNow:** The accessible homepage content proceeds from a business-outcome statement to product introduction, a data/context/workflow/control model, use cases, evidence and a closing contact/demo choice. That structure makes a broad platform easier to understand. Its browser-rendered page returned Access Denied in this environment; no conclusions about exact spacing, colors or typography are based on that blocked screenshot. The comparison uses its accessible official page content. [Official homepage](https://www.servicenow.com/).

These references informed information hierarchy and interaction patterns. No competitor copy, customer logos, performance statistics, certifications or imagery were inserted into the product.

## Diagnosis of the previous homepage

| Finding                                                | Effect on the visitor                                                                               | Change                                                                                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Oversized heading constrained to a narrow column       | The title wrapped into six lines at the captured desktop size, delaying the explanation and actions | A wider, centered two-line desktop headline with a controlled responsive type scale                                                  |
| Large decorative orbit at the top                      | The page showed an abstract concept before explaining the workspace                                 | An interactive, explicitly illustrative workspace preview with Clarity, Capability and Consistency tabs                              |
| Similar visual treatment for both hero actions         | The primary conversion path did not stand out                                                       | Red filled primary action and an outlined secondary action                                                                           |
| Uniform editorial boxes for different kinds of content | Contexts, steps, outcomes and governance felt like the same reading task                            | Distinct layouts: cycle cards, a Companion split section, context lists, outcome cards, a rhythm timeline and a dark control section |
| Full twelve-section index competing with the content   | Navigation added density early in the page                                                          | Four direct anchors for the operating model, Companion, context and control                                                          |
| Document footer directives rendered as prose           | Visitors encountered labels and route lists rather than a useful footer                             | Actual grouped links with preserved source paragraph markers                                                                         |
| Homepage-specific rules spread across global layers    | Changes were difficult to isolate and predict                                                       | Homepage-owned `home.css` scoped under `.lamid-home`                                                                                 |

See the [before screenshot](../artifacts/homepage-study/lamid-before.png), [after desktop screenshot](../artifacts/homepage-study/lamid-after-desktop.png), [full page](../artifacts/homepage-study/lamid-after-desktop-full.png), and [mobile screenshot](../artifacts/homepage-study/lamid-after-mobile.png).

## Implemented experience

The hero establishes the category, explains the proposition, presents two actions and reinforces human control. A workspace illustration immediately gives the vocabulary a concrete setting. Its three tabs support arrow keys, Home/End, a single tab stop and a labeled panel. They update illustrative content locally. The existing “Explore the workspace” control opens a real isolated sample using the existing API.

The body moves through the operating model, Companion, audiences, depth, outcomes, intelligence, rhythm, governance, expansion and plans before the closing call to action. Shared section and list primitives keep spacing and source markers consistent, while individual slide components remain independently editable. The orbit remains in the intelligence section, where its conceptual role is clearer; it still loads on intersection and respects reduced motion.

All original homepage paragraphs remain represented. The longer Companion return-state explanation is in an accessible disclosure, and the footer's document-only heading is visually hidden. This retains traceability without forcing every piece of source metadata into the visual hierarchy. The page remains long because the supplied long-form document is still the content baseline; a shorter conversion-focused copy edition would be a separate editorial change.

The preview contains illustrative examples and no invented customer proof. Existing specification claims are preserved as supplied; the redesign does not establish production availability of the complete enterprise program.

## Component ownership

The [homepage editing map](../src/products/website/pages/home/README.md) links to the composition, individual slides, preview, common section components, footer, copy and scoped stylesheet.

Across the frontend, 98 document routes now have named product-owned pages and local content. Interactive pages are composed from slides backed by one page-state hook. The [product directory](../src/products/README.md) and [editing guide](./PAGE_COMPONENT_GUIDE.md) describe the complete layout. Removing duplicated document content reduced the production main JavaScript bundle from approximately 1,102 KB before the refactor to 785 KB before the homepage additions; the bundle remains large and further code splitting is a separate task.

## Validation

Final combined validation passed: `npm run check` completed the TypeScript/production build and all 36 automated tests; `BROWSER_CHANNEL=msedge npm run test:e2e` passed all 17 browser tests, including every original paragraph across 98 routes, the homepage interactions and the existing workspace journeys. The final main JavaScript bundle is approximately 797 KB before gzip; the build still reports its large-chunk warning.

Standalone visual/accessibility inspection of the new homepage produced:

| Viewport width | Horizontal document width | Bottom of primary hero action | Automated WCAG A/AA violations |
| -------------- | ------------------------- | ----------------------------- | ------------------------------ |
| 1440px         | 1440px                    | 518px                         | 0                              |
| 390px          | 390px                     | 447px                         | 0                              |
| 320px          | 320px                     | 472px                         | 0                              |

The automated scan covered WCAG 2 A/AA and 2.1 AA rule tags. It is not a complete manual accessibility audit. The browser suite also checks the original copy across all 98 document routes, keyboard use of the new preview, narrow viewports, navigation, account journeys and workspace operations. [Inspection data](../artifacts/homepage-study/validation.json).
