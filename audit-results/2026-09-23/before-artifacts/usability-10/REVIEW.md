# Ten-profile simulated usability review

Date: 17 September 2026. Verdict: promising presentation, but the tested first-use journey is not yet convincing enough to charge for.

## What this study actually measures

These are ten automated regional profiles, not ten recruited people. Chromium sessions varied locale, timezone and viewport. All requests came from the same machine; there were no country-specific networks, real phones, regional IPs or geolocation changes. English tasks were used in every profile. This cannot establish geographic performance, willingness to pay, human satisfaction or translation quality.

The study ran locally against synthetic accounts in a disposable test schema. AI, mail delivery and payment providers were explicitly disabled. Verification used the development OTP, not an inbox. IP reward limits and request limits were raised to allow the simulated accounts from one IP. Two sessions ran at a time. The configured test database shares infrastructure with the production connection, so timings are not production or regional benchmarks.

The scripted route was homepage → context selection → signup → OTP → goal creation → specialist-plan preview → first paid step → attempt second step. Scripts navigate directly to some routes, so this is not a test of unaided discoverability. The final run took 11.3 minutes. Its four technical passes mean the script reached the expected insufficient-balance response, not that four customers obtained a complete useful outcome.

A pilot used an incorrectly scoped error locator. That was corrected before the final run; final results below include all ten profiles, with no retries to turn failures into passes. No application behavior was changed during this study.

## Results by profile

| Profile   | Locale / viewport | Intended task              | Observed outcome                                                                                                            |
| --------- | ----------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Lagos     | en-NG / 360×800   | First client project       | Goal flow progressed. Charged 65 points for a request to supply a job ID; second step rejected for insufficient points.     |
| Nairobi   | en-KE / 390×844   | Professional skills        | Signup verified; goal modal remained open after submission. Screenshot shows stale workspace refresh error.                 |
| London    | en-GB / 1440×900  | Client proposal            | Goal flow progressed. Charged 65 points for a request to supply a job ID; second step rejected.                             |
| New York  | en-US / 1366×768  | Career transition          | Signup verified; goal modal remained open. Screenshot shows stale workspace refresh error.                                  |
| Toronto   | en-CA / 768×1024  | Content series             | Signup verified; goal modal did not close within the 25-second post-submit check.                                           |
| Berlin    | de-DE / 1280×800  | Consulting business growth | Goal flow progressed. Charged 65 points for a recorded-data-only summary; second step rejected. Interface remained English. |
| Mumbai    | en-IN / 360×740   | Learning goal              | Signup verified; goal modal did not close within the post-submit check.                                                     |
| Dubai     | ar-AE / 390×844   | Service launch             | Signup verified; goal modal did not close within the post-submit check. Document language remained English.                 |
| São Paulo | pt-BR / 375×812   | Creative project           | Signup verified; goal modal did not close within the post-submit check. Document language remained English.                 |
| Sydney    | en-AU / 1440×900  | Weekly planning            | Goal flow progressed. Charged 65 points for a recorded-data-only summary; second step rejected.                             |

### Counts

- 10/10 completed signup and development-code verification and had a 100-point balance.
- 6/10 were blocked by the goal form's completion flow. This does **not** prove that the underlying goal insert failed.
- 4/10 progressed to the first specialist step; all four ended with 35 points and could not buy the next 65-point step.
- 0/10 finished a complete three-specialist sequence using the welcome balance.
- 10/10 homepages had no horizontal overflow at their tested viewport; the four inspected final workspace views also had no horizontal overflow.
- The automated homepage WCAG A/AA scan reported zero violations for all ten profiles. This is not a complete accessibility audit or certification.

## Most important findings

### 1. Users can pay without receiving the requested deliverable

Lagos and London were charged 65 points and shown a completed Client Brief Builder step whose response was: “Tell me which job to build a client brief for by including its job ID.”

This is a missing-input instruction, not a client brief. Source review confirms the builder requires jobId, while the coordinator's step request does not supply it. Enabling an AI provider alone will not repair this missing input.

**Fix first:** gather and validate the job context before presenting a paid approval; pass it through the coordinator. Reject missing prerequisites before debiting points. Do not mark a request for information as a completed deliverable.

Evidence: [Lagos result](Lagos/result.json), [London result](London/result.json).

### 2. Goal creation can look unsuccessful after a successful write

Nairobi and New York screenshots display “A newer workspace request replaced this one.” Six journeys stopped because the goal modal remained open.

WorkspaceShell increments a refresh sequence for background polling and explicit refreshes. The objective form posts the goal and then awaits onSaved/refresh; a superseded refresh throws into the form. Thus an already-saved goal can appear unsuccessful. The final run also logged a database connection timeout; it does not establish that every stalled form had the same cause.

**Fix:** distinguish successful writes from refresh failures, silently discard superseded background reads, close/confirm successful submissions, and prevent accidental duplicate creation on retry. Re-run this journey under overlapping polling and delayed responses.

Evidence: [Nairobi screenshot](Nairobi/failure.png), [New York screenshot](New-York/failure.png), runner log `../usability-10-run-final.log`.

### 3. The free experience cannot demonstrate a complete coordinated outcome

All four displayed plans cost 195 points (three × 65). The 100-point grant buys one step, leaving 35. Each second attempt returned “You do not have enough points for this agent.” The total estimate is visible, which is positive, but the user still reaches a payment barrier before finishing the advertised sequence.

**Fix:** offer a complete, bounded introductory outcome, or redesign the first journey to deliver standalone value within the grant. Disable unaffordable approvals with clear remaining-cost information and a purchase path. Do not increase the grant as a substitute for fixing low-value output.

### 4. AI-unavailable behavior still consumes points

Berlin and Sydney were charged for a response explicitly stating AI was not configured and only record counts were summarized. AI was deliberately disabled in this test, so this does not measure model quality or prove the deployed model is unavailable.

**Fix:** clearly distinguish a paid AI result from a free fallback before approval. When the required provider is unavailable, block the paid action or provide an explicitly priced alternative that has independent value.

### 5. Regional presentation is English-only in these checks

Changing the browser to German, Arabic or Portuguese did not change the English document language. This may be acceptable for an explicitly English-language product. It should not be presented as tested multilingual support. Currency, local payment methods, right-to-left usability and regional mail delivery were not evaluated.

## Honest buying assessment

My assessment—not a quote from a participant—is that the visual presentation is credible enough to try. The signup flow and visible pricing are encouraging. However, I would not pay after these journeys: a stuck goal form reduces confidence, and charging for a missing-job instruction does not demonstrate value.

The next milestone should be one reliable, useful first outcome, not more specialist names. Fix goal-save feedback, validate prerequisites before charging, and demonstrate a complete goal-to-output journey. Then recruit ten real target customers, observe unassisted task completion, and ask whether they would pay only after they have used the actual output. Do not interpret this simulation as customer purchase research.

## Reproduction and evidence

Run `npx playwright test --config usability.config.ts`. The dedicated server disables external providers. The exploratory spec is excluded from the ordinary browser config because it relies on this dedicated server.

Each profile directory contains `result.json`, `home.png` and either `workspace.png` or `failure.png`. Results reflect the code and environment during this run. The existing Vercel/API cross-origin issue was not exercised by this same-origin local study.
