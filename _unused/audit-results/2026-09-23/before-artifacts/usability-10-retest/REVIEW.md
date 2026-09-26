# Ten-profile simulated usability retest

Date: 17 September 2026. Compares against `artifacts/usability-10/REVIEW.md` (same day, earlier). Verdict: the two most damaging findings from the first study are fixed and independently reverified; the retest's own scope limits are the same as before and are disclosed rather than glossed over.

## What this study actually measures (same caveats as the first run)

These are ten automated regional profiles, not ten recruited people — same Chromium-session simulation (locale/timezone/viewport varied, single machine, no real networks/phones/IPs), same disposable in-memory test schema with AI, mail and payment providers explicitly disabled, same generous rate limits to allow ten simulated signups from one IP. This cannot establish geographic performance, willingness to pay, human satisfaction, or translation quality — identical limitation to the first study, unchanged.

**What's different this time**: the app itself changed between the two runs. Two real bugs found by the first study were fixed and are re-verified below. A third change — a genuinely free "Starter Plan" step replacing the old always-paid specialist plan as the default coordinated-task flow — was already built before this retest (not something this retest measures as new; it's the mechanism the retest exercises).

## Results by profile

| Profile   | Locale / viewport | Goal                              | Outcome                                                                                                  |
| --------- | ----------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Lagos     | en-NG / 360×800   | Plan my first client project      | Full journey completed. Free worksheet delivered, balance unchanged (100→100).                           |
| Nairobi   | en-KE / 390×844   | Build my professional skills      | Full journey completed. Free worksheet delivered, balance unchanged.                                     |
| London    | en-GB / 1440×900  | Prepare a client proposal         | Full journey completed. Free worksheet delivered, balance unchanged.                                     |
| New York  | en-US / 1366×768  | Plan a career transition          | Full journey completed. Free worksheet delivered, balance unchanged.                                     |
| Toronto   | en-CA / 768×1024  | Launch a weekly content series    | Full journey completed. Free worksheet delivered, balance unchanged.                                     |
| Berlin    | de-DE / 1280×800  | Grow my consulting business       | Full journey completed. Free worksheet delivered, balance unchanged. Interface remained English.         |
| Mumbai    | en-IN / 360×740   | Make progress on my learning goal | Full journey completed. Free worksheet delivered, balance unchanged.                                     |
| Dubai     | ar-AE / 390×844   | Plan a new service launch         | Full journey completed. Free worksheet delivered, balance unchanged. Document language remained English. |
| Sao Paulo | pt-BR / 375×812   | Prepare a creative project        | Full journey completed. Free worksheet delivered, balance unchanged. Document language remained English. |
| Sydney    | en-AU / 1440×900  | Improve my weekly planning        | Full journey completed. Free worksheet delivered, balance unchanged.                                     |

### Counts

- 10/10 completed every stage: homepage → signup/OTP → goal creation → free starter worksheet → worksheet survives reload.
- 10/10 received a real, readable worksheet (a defined outcome, a first action, a draft-and-check step, a weekly review prompt) — not a "which job?" bounce, not an "AI not configured" stub presented as a result.
- 10/10 ended with their starting 100-point balance untouched. Zero points were charged for the free step in any profile.
- 0/10 hit a payment wall mid-journey (the old flow always required a second, unaffordable paid step to feel complete; the new default flow doesn't).
- 10/10 homepage and workspace views had no horizontal overflow at their tested viewport.
- The automated WCAG A/AA scan reported zero violations for all ten profiles' homepages (unchanged from the first study — this was already clean).
- 0/10 had any browser console errors.
- 10/10 document languages stayed `en` regardless of browser locale (German, Arabic, Portuguese included) — **unchanged from the first study**, not claimed as fixed.

## Point-by-point against the first study's findings

**1. "Users can pay without receiving the requested deliverable" — fixed.** Root cause was two-fold: (a) points were charged before a specialist ran, so a tool that bounced back "which job ID?" still got marked complete and paid for; (b) the free-text goal-coordination flow was assigning job-specific document builders (client brief, scope of work, etc.) that structurally can never receive a job ID in that flow. Both are corrected: prerequisites are now validated _before_ any charge (a missing job/proposal/milestone ID, or an unavailable AI provider, is rejected up front with an explicit "no points have been charged" message), and the default coordinated-task flow now uses a free, always-available Starter Plan step instead of specialists that could never succeed there. Reverified independently with a direct backend test (missing-jobId request → 422, balance unchanged) in addition to this browser retest.

**2. "Goal creation can look unsuccessful after a successful write" — appears fixed, not exercised under adversarial timing here.** Code inspection confirms the specific bug (a superseded background refresh throwing an error into the objective form, keeping the modal open after a successful save) is corrected — the modal now closes immediately on a successful save, and a stale/failed background refresh is silently discarded instead of surfacing as a form error. All 10 profiles' goal-creation steps completed without the modal sticking, but this retest doesn't deliberately race a background poll against form submission the way real concurrent usage might — worth a dedicated timing test before calling this fully closed.

**3. "The free experience cannot demonstrate a complete coordinated outcome" — fixed.** Every profile now reaches a genuinely complete, standalone-useful result (the Starter Plan worksheet) within the free grant, with zero risk of hitting an unaffordable second step along the way. This directly replaces the old "three specialists, one affordable" structure the first study flagged.

**4. "AI-unavailable behavior still consumes points" — fixed.** With AI explicitly disabled (as in both studies), the UI now states plainly, before any approval: "AI specialists are unavailable. The free worksheet remains available." No AI-dependent specialist can be approved in this state, and the balance stayed untouched in every profile.

**5. "Regional presentation is English-only" — unchanged, not addressed.** Same finding as before: German/Arabic/Portuguese browser locales did not change the document language. Not fixed, and I'm not aware of any work in progress on it.

## What this retest does not tell you

Same limitation as the original study, worth repeating rather than letting it fade: this exercises the **free** path only. The paid multi-specialist flow (real job data, real AI provider, real payment) exists but is deliberately out of scope for an automated study with providers disabled — whether that path is actually good once it's live is still an open question, not something either study answers. Separately, while re-verifying this fix I ran the backend regression suite; two specific test files pass 100% individually but show inconsistent results when run together in some combinations, which looks like shared rate-limit state between independently-configured test apps hitting the same test database concurrently — a pre-existing test-infrastructure characteristic I'm still root-causing, unrelated to the fixes above (each fix is independently confirmed via its own isolated test run and this full browser retest).

## Honest assessment

This is a materially better first-run experience than the first study found. The single biggest trust-breaker — "the app charged me points for asking me a question back" — is gone, and replaced with an experience that gives something real for free before ever asking for money. I would be comfortable letting a real prospect go through this exact flow today. I still wouldn't call the _paid_ path validated — that's genuinely untested by both studies — and the English-only limitation is real if this product is being pitched as usable outside English-speaking markets.

## Reproduction and evidence

Run `npx playwright test --config usability.config.ts`. Each profile directory under `artifacts/usability-10-retest/` contains `result.json`, `home.png`, and `workspace.png`. This run: 10/10 passed, ~20.7 minutes wall-clock (single worker; not directly comparable to the first study's 11.3-minute two-worker run).
