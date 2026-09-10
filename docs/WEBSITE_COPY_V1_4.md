# Website copy source — v1.4

The approved wording is `LAMID_ONE_Pithy_Go_Live_Website_Product_Copy_v1.4_2026-09-08.docx`, supplied by the user on 9 September 2026. It replaces the earlier long-form page copy for all 98 registered routes.

## Exact wording and traceability

- [Extracted source](../document-study/pithy-v1.4-source.json) retains every Word paragraph, its style, its one-based paragraph number, the source filename, and the document SHA-256.
- Each product's `pages/<page>/content.json` contains the visitor-facing text and SEO metadata without paraphrasing. Unicode punctuation and literal bullets are preserved.
- [Page manifest](../src/content/page-manifest.json) maps routes to their human-editable content and named page components.
- [Aggregate snapshot](../src/content/pages.json) supports the browser paragraph-coverage check. Runtime rendering uses the product-local files.
- `CTA:`, `Link:`, and `Links:` are presentation markers: the labels are rendered verbatim as controls or text, with pipe separators used to separate labels.

The cover, document-suite guidance, page-purpose annotations, PRIMARY MESSAGE section markers, separator rules, publication notes, and publishing checks are editorial material rather than website copy or new user instructions. Paragraphs 1852–1854 are misplaced editorial acceptance criteria immediately before the final PUBLISHING CHECK; they are excluded from Plan & Usage. These exclusions remain visible in the complete extracted source.

The document's indexing/canonical values are retained as metadata. The existing development-wide `noindex, nofollow` behavior and release gates remain in place. Importing wording does not publish the application or implement any capability described by the text.

## Homepage

The hero is followed by seven sections in the supplied order: Companion, contextual depth, outcomes, intelligence, rhythm, expansion, and the closing invitation. The interactive preview uses verbatim copy from the supplied Clarity, Capability, and Consistency routes. Shared navigation, accessibility labels, and working application controls remain functional UI.

## Updating the source

Run `python scripts/extract-website-copy.py <path-to-docx>` to extract this document format, then `npm run content:generate` to deliberately replace local copy and the aggregate snapshot. Review paragraph boundaries and editorial exclusions when changing document versions. The importer does not rewrite hand-edited page components; update named slides when section headings or counts change.

Run `npm run check` and `npm run test:e2e` after changes. The copy test compares every imported paragraph and SEO field against the extracted source; the browser test checks rendered text across all 98 routes.

The pre-import source is backed up in `artifacts/before-pithy-v1.4.zip`.

## Verification on 9 September 2026

Production build and all 36 unit/API tests passed. All 18 browser checks passed across the full-suite and targeted reruns, including exact rendered coverage of 1,121 paragraphs across 98 routes, keyboard navigation, accessibility, and narrow-screen layouts. The route audit closes each page after inspection to bound browser memory; its repeated development-module traces are disabled. The isolated browser server uses hot-reload port 24679 to coexist with `npm run dev`.
