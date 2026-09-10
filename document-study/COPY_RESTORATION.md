# Complete document-copy restoration

The former comparison is a historical audit of the shortened implementation. The current generator now retains all 98 pages and every paragraph after each HERO marker through the end of that page, excluding only SECTION marker labels. Numbered and adjacent named SECTION labels are structural metadata; no body text is filtered by prefix or length.

The canonical document extraction was previously verified against all 3,358 nonempty paragraphs of the attached v4.0 DOCX. Each retained paragraph now carries its source paragraph number in data-source-paragraph in the rendered UI.

Public routes render their complete original copy. /start, /signup, /login and /onboarding include the existing account controls after the copy. Workspace routes retain operating controls and render the complete document sections below them; primary workspace headings use the source hero wording. Operational controls, error messages and user-created data remain application UI rather than purported quotations from the document.

/forgot-password, /reset-password, /verify and /onboarding now resolve as explicit routes. Other documented public routes resolve through the complete content registry. Documented workspace routes, including /os/workflows/sample, render their full copy inside the workspace shell. These route additions do not implement email recovery, token verification, payments, external services or other planned functionality.

Gated claims are shown as explicitly labeled document previews, not assertions of available services or approved legal terms. Preamble governance, route metadata, and final acceptance appendices remain internal material. CTA wording is preserved; known navigation actions link to their destinations, while unsupported submission actions remain text rather than fake working controls.

Validation: tests/copy.test.mjs compares every generated paragraph with the source. tests/browser/copy.spec.ts visits all 98 routes and compares each rendered paragraph with its original wording. CTA structural prefixes and pipe separators are rendered as button/link structure, preserving every label.
