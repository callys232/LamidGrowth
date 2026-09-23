# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: all-contexts.spec.ts >> each supported account context can create and load a workspace
- Location: tests\browser\all-contexts.spec.ts:15:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByRole('link', { name: 'Continue to workspace', exact: true })
    - locator resolved to <a href="/os" data-discover="true" class="button button-primary full-width">Continue to workspace</a>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed

```

# Page snapshot

```yaml
- generic [ref=f6e2]:
    - banner [ref=f6e3]:
        - generic [ref=f6e4]:
            - link "LAMID ONE home" [ref=f6e5] [cursor=pointer]:
                - /url: /
                - generic [ref=f6e13]:
                    - text: LAMID ONE
                    - generic [ref=f6e14]: HUMAN JUDGMENT. INFINITE POSSIBILITY.
            - navigation "Main navigation" [ref=f6e15]:
                - link "Home" [ref=f6e16] [cursor=pointer]:
                    - /url: /
                - button "Product" [ref=f6e18] [cursor=pointer]
                - button "Solutions" [ref=f6e22] [cursor=pointer]
                - button "Experts" [ref=f6e26] [cursor=pointer]
                - button "Resources" [ref=f6e30] [cursor=pointer]
                - link "Pricing" [ref=f6e33] [cursor=pointer]:
                    - /url: /pricing
            - generic [ref=f6e34]:
                - button "Switch to dark mode" [ref=f6e35] [cursor=pointer]
                - link "Sign in" [ref=f6e38] [cursor=pointer]:
                    - /url: /login
                - link "Experience LAMID ONE" [ref=f6e39] [cursor=pointer]:
                    - /url: /start
    - main [ref=f6e43]:
        - generic [ref=f6e45]:
            - generic [ref=f6e46]:
                - link "LAMID ONE home" [ref=f6e47] [cursor=pointer]:
                    - /url: /
                    - generic [ref=f6e55]:
                        - text: LAMID ONE
                        - generic [ref=f6e56]: HUMAN JUDGMENT. INFINITE POSSIBILITY.
                - link "Back to sign in" [ref=f6e57] [cursor=pointer]:
                    - /url: /login
                - generic [ref=f6e58]:
                    - heading "Verify your account." [level=2] [ref=f6e59]
                    - paragraph [ref=f6e60]: Enter the six-digit code from your email.
                    - generic [ref=f6e61]:
                        - generic [ref=f6e62]:
                            - generic [ref=f6e63]: Verification code
                            - textbox "Verification code" [ref=f6e64]
                        - button "Verify account" [disabled] [ref=f6e65]
                    - generic [ref=f6e66]:
                        - generic [ref=f6e67]:
                            - generic [ref=f6e68]: Account email
                            - textbox "Account email" [ref=f6e69]: sme-1790094824924@example.test
                        - button "Send a new verification code" [ref=f6e70] [cursor=pointer]
                    - paragraph [ref=f6e71]:
                        - link "Continue with goal drafting while you verify" [ref=f6e72] [cursor=pointer]:
                            - /url: /os
            - complementary [ref=f6e73]:
                - img "Context, intelligence, and authorized work connected around human judgment" [ref=f6e74]:
                    - generic [ref=f6e76]: CONTEXT IN MOTION
                    - generic [ref=f6e77]: HUMAN JUDGMENT AT THE CENTER
                    - generic [aria-hidden]: ONE
                    - generic [ref=f6e84]:
                        - text: Clarity
                        - generic [ref=f6e86]: Understand what matters
                    - generic [ref=f6e87]:
                        - text: Capability
                        - generic [ref=f6e89]: Build what comes next
                    - generic [ref=f6e90]:
                        - text: Consistency
                        - generic [ref=f6e92]: Keep progress moving
                    - generic [ref=f6e93]:
                        - generic [ref=f6e94]: 01 — 03
                        - generic [ref=f6e95]:
                            - text: ONE CONTINUOUS CYCLE
                            - generic [ref=f6e96]: ↗
        - group [ref=f6e97]:
            - generic "▸ Getting started" [ref=f6e98] [cursor=pointer]
    - contentinfo [ref=f6e99]:
        - generic [ref=f6e100]:
            - generic [ref=f6e101]:
                - link "LAMID ONE home" [ref=f6e102] [cursor=pointer]:
                    - /url: /
                    - generic [ref=f6e110]:
                        - text: LAMID ONE
                        - generic [ref=f6e111]: HUMAN JUDGMENT. INFINITE POSSIBILITY.
                - paragraph [ref=f6e112]: Think clearly. Build capability. Make consistent progress.
            - generic [ref=f6e113]:
                - heading "Explore" [level=3] [ref=f6e114]
                - link "The product" [ref=f6e115] [cursor=pointer]:
                    - /url: /product
                - link "How it works" [ref=f6e116] [cursor=pointer]:
                    - /url: /how-it-works
                - link "Your context" [ref=f6e117] [cursor=pointer]:
                    - /url: /who-its-for
            - generic [ref=f6e118]:
                - heading "Learn" [level=3] [ref=f6e119]
                - link "Our story" [ref=f6e120] [cursor=pointer]:
                    - /url: /about
                - link "Getting started" [ref=f6e121] [cursor=pointer]:
                    - /url: /help/getting-started
                - link "Help center" [ref=f6e122] [cursor=pointer]:
                    - /url: /help
            - generic [ref=f6e123]:
                - heading "Trust" [level=3] [ref=f6e124]
                - link "Human control" [ref=f6e125] [cursor=pointer]:
                    - /url: /trust/governance
                - link "Privacy & data" [ref=f6e126] [cursor=pointer]:
                    - /url: /trust/privacy
                - link "Accessibility" [ref=f6e127] [cursor=pointer]:
                    - /url: /accessibility
        - generic [ref=f6e128]:
            - generic [ref=f6e129]: © 2026 LAMID ONE
            - generic [ref=f6e130]: Progress keeps moving. Control stays with you.
            - link "Back to top ↑" [ref=f6e131] [cursor=pointer]:
                - /url: '#top'
    - dialog [ref=f6e132]:
        - banner [ref=f6e133]:
            - generic [ref=f6e138]:
                - paragraph [ref=f6e139]: Your Companion
                - paragraph [ref=f6e140]: Still deciding, or looking for something specific?
            - generic [ref=f6e141]:
                - button "Minimize Companion" [ref=f6e142] [cursor=pointer]
                - button "Close Companion" [ref=f6e144] [cursor=pointer]
        - generic [ref=f6e148]:
            - list [ref=f6e149]:
                - listitem [ref=f6e150]:
                    - paragraph [ref=f6e156]: Still deciding, or looking for something specific?
            - generic [ref=f6e157]:
                - button "How do I get started?" [ref=f6e158] [cursor=pointer]
                - button "What's this going to cost me?" [ref=f6e159] [cursor=pointer]
                - button "I can't sign in" [ref=f6e160] [cursor=pointer]
            - generic [ref=f6e161]:
                - generic [ref=f6e162]: Ask Companion
                - textbox "Ask Companion" [ref=f6e163]:
                    - /placeholder: Ask anything about LAMID ONE…
                - button "Send" [disabled] [ref=f6e164]
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test';
  2  |
  3  | /** Exercise the real signup verification flow using the isolated server's development code. */
  4  | export async function verifySignup(page: Page) {
  5  |   await expect(page).toHaveURL(/\/verify\?/);
  6  |   const code = await page.getByTestId('development-otp').innerText();
  7  |   await page.getByLabel('Verification code', { exact: true }).fill(code);
  8  |   await page.getByRole('button', { name: 'Verify account', exact: true }).click();
> 9  |   await page.getByRole('link', { name: 'Continue to workspace', exact: true }).click();
     |                                                                                ^ Error: locator.click: Test timeout of 120000ms exceeded.
  10 | }
  11 |
```
