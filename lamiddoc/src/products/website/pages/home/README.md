# Homepage

Route: `/`. Start with [HomeDocumentPage.tsx](../../../../../../src/products/website/pages/home/HomeDocumentPage.tsx) to see the sections in reading order.

| Edit                                                                    | File or folder                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Source wording and metadata                                             | [content.json](../../../../../../src/products/website/pages/home/content.json)                            |
| Section order                                                           | [HomeDocumentPage.tsx](../../../../../../src/products/website/pages/home/HomeDocumentPage.tsx)            |
| Hero and its primary actions                                            | [HomeHeroSlide.tsx](../../../../../../src/products/website/pages/home/slides/HomeHeroSlide.tsx)           |
| Illustrative Companion decision sequence                                | [CompanionExample.tsx](../../../../../../src/products/website/pages/home/components/CompanionExample.tsx) |
| Companion, depth, outcomes, intelligence, rhythm, expansion and closing | [slides](../../../../../../src/products/website/pages/home/slides)                                        |
| Common section heading and feature-list layout                          | [HomeSection.tsx](../../../../../../src/products/website/pages/home/components/HomeSection.tsx)           |
| Footer links and source markers                                         | [HomeFooter.tsx](../../../../../../src/products/website/pages/home/components/HomeFooter.tsx)             |
| Homepage spacing, typography, colors and responsive rules               | [home.css](../../../../../../src/products/website/pages/home/home.css)                                    |
| Design rationale and reference review                                   | [Homepage UI study](../../../../../docs/HOMEPAGE_UI_STUDY.md)                                             |

The homepage uses individual files in `slides/`; simpler document pages use a single `slides.tsx` file of named sections. The `embedded` rendering remains available through the shared document components.

The hero shows a clearly labeled illustrative Companion decision sequence. Audience buttons change the objective, context, recommendation, and next step without API calls. The deadline-change example is visible by default; the general intelligence cycle and recurring-review details use keyboard-accessible disclosures. The primary action opens /start, where visitors choose a context and can create an account or explore a sample workspace. Concise presentation introductions and examples live in components; content.json retains the original document wording for embedded rendering. Source markers identify source content, not added illustrative claims.

The earlier unrouted marketing design is preserved in the pre-refactor source backup under `artifacts/`. It is not the active homepage.
