/**
 * DECISION QUALITY — the real engine behind Q44.
 *
 * ────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS RATHER THAN ANOTHER `computeAssessment` MODULE
 *
 * Q44 previously ran on the shared four-dimension archetype and had
 * three defects that no amount of tuning fixes:
 *
 *  1. IT DID NOT MEASURE ITS OWN PURPOSE. The purpose promises a check
 *     on "defined options, known criteria, a named owner" for ONE
 *     decision. The dimensions asked you to self-rate abstract
 *     "clarity" in general. Different instrument entirely.
 *
 *  2. UNANCHORED LIKERT PRODUCES NOISE. "Rate Pre-Decision Clarity
 *     0–5" has no anchor, so two people scoring the same decision
 *     disagree and one person disagrees with themselves a week later.
 *     Reporting that to one decimal place implies precision that was
 *     never in the input. Every question below is instead a binary or
 *     an ordinal with CONCRETE, OBSERVABLE anchors.
 *
 *  3. AVERAGING IS THE WRONG MODEL. This is the structural one.
 *     Decision quality is a CHAIN — the established framing from the
 *     Decision Quality literature (Spetzler et al.) is six
 *     requirements limited by the weakest link. A decision with a
 *     brilliant frame, good data and no accountable owner is not "83%
 *     good", it is blocked. A weighted mean lets four strong
 *     requirements hide the one thing that will sink it, which is
 *     precisely the failure this tool exists to catch.
 *
 * So the headline number here is the WEAKEST requirement, not the
 * average. The average is still reported, specifically so the gap
 * between them is visible — that gap is how much the mean was
 * flattering you.
 * ────────────────────────────────────────────────────────────────
 */

/** An ordinal option with an observable anchor, not an adjective.
 * @typedef {{value:number, label:string}} AnchorOption
 */

/**
 * @typedef {Object} DQQuestion
 * @property {string} id
 * @property {'frame'|'alternatives'|'information'|'values'|'reasoning'|'commitment'} requirement
 * @property {string} prompt
 * @property {AnchorOption[]} options Concrete, observable states. Ordered worst → best.
 * @property {string} remedy What to actually do when this scores low. Drives the next-action list.
 * @property {boolean} [fatalAtZero] A zero here blocks the decision regardless of everything else.
 */

export const REQUIREMENTS = [
  { id: 'frame',        label: 'Appropriate frame',       what: 'You are deciding the right question, at the right level, with a stated boundary.' },
  { id: 'alternatives', label: 'Real alternatives',       what: 'Genuinely distinct options exist — not one preferred answer plus decoys.' },
  { id: 'information',  label: 'Reliable information',    what: 'The key assumptions are backed, and the biggest uncertainty is named.' },
  { id: 'values',       label: 'Clear criteria and tradeoffs', what: 'What good looks like was defined BEFORE the options were scored.' },
  { id: 'reasoning',    label: 'Sound reasoning',         what: 'The path from evidence to choice is explicit and has been challenged.' },
  { id: 'commitment',   label: 'Commitment to action',    what: 'One named owner, a date, and a first move the executors have accepted.' },
];

const YES_NO = (no, yes) => [
  { value: 0, label: no }, { value: 1, label: yes },
];

/**
 * THE QUESTION BANK.
 *
 * Every option describes something a reviewer could verify by looking
 * at the decision record. Where a question has a well-established
 * failure mode, the worst anchor names it explicitly — people
 * recognise their own behaviour far more reliably than they
 * self-rate an abstraction.
 */
export const DQ_QUESTIONS = [
  /* ── Frame ── */
  {
    id: 'frame_question', requirement: 'frame',
    prompt: 'How is the decision written down?',
    options: [
      { value: 0,    label: 'As a topic or area of concern, not a question' },
      { value: 0.5,  label: 'As a broad question with fuzzy boundaries' },
      { value: 1,    label: 'As a specific question with a stated scope' },
    ],
    remedy: 'Write the decision as one question someone could answer yes/no or pick from. If you cannot, you are not ready to decide.',
    fatalAtZero: true,
  },
  {
    id: 'frame_outofscope', requirement: 'frame',
    prompt: 'Is what you are NOT deciding written down?',
    options: YES_NO('No — scope is assumed', 'Yes — out-of-scope is explicit'),
    remedy: 'State the adjacent decisions you are deliberately not making here. Unstated scope is where meetings go to die.',
  },
  {
    id: 'frame_level', requirement: 'frame',
    prompt: 'Are you deciding the actual issue or a symptom of it?',
    options: [
      { value: 0,   label: 'Nobody has asked — we inherited the framing' },
      { value: 0.5, label: 'Discussed informally' },
      { value: 1,   label: 'We explicitly tested whether this is the right level' },
    ],
    remedy: 'Ask once: if this decision goes perfectly, does the underlying problem go away? If not, you are deciding a symptom.',
  },

  /* ── Alternatives ── */
  {
    id: 'alt_count', requirement: 'alternatives',
    prompt: 'How many genuinely distinct options are on the table?',
    options: [
      { value: 0,    label: 'One — this is an approval, not a decision' },
      { value: 0.4,  label: 'Two' },
      { value: 1,    label: 'Three or more materially different options' },
      { value: 0.7,  label: 'More than seven — too many to compare properly' },
    ],
    remedy: 'Generate at least one more option that a smart opponent would actually argue for. One option is a proposal seeking a rubber stamp.',
    fatalAtZero: true,
  },
  {
    id: 'alt_strawmen', requirement: 'alternatives',
    prompt: 'Could each option realistically be chosen?',
    options: [
      { value: 0,   label: 'No — some exist to make the favourite look good' },
      { value: 0.5, label: 'Unsure' },
      { value: 1,   label: 'Yes — a reasonable person could pick any of them' },
    ],
    remedy: 'Remove the decoys. A strawman option makes the comparison look rigorous while removing the rigour.',
  },
  {
    id: 'alt_status_quo', requirement: 'alternatives',
    prompt: 'Is doing nothing evaluated as a real option?',
    options: YES_NO('No — action is assumed', 'Yes — the status quo is costed like the others'),
    remedy: 'Cost the status quo properly. Sometimes it wins, and if you never price it you will never know.',
  },

  /* ── Information ── */
  {
    id: 'info_backing', requirement: 'information',
    prompt: 'What backs the assumptions the choice rests on?',
    options: [
      { value: 0,    label: 'Nothing written down' },
      { value: 0.35, label: 'Individual experience and anecdote' },
      { value: 0.7,  label: 'Internal data' },
      { value: 1,    label: 'Internal data plus an external or independent check' },
    ],
    remedy: 'List the three assumptions that, if wrong, flip the decision. Then find something to back each one.',
  },
  {
    id: 'info_uncertainty', requirement: 'information',
    prompt: 'Is the biggest uncertainty named?',
    options: YES_NO('No', 'Yes — we know what we most don\'t know'),
    remedy: 'Name the single unknown with the widest consequence. An unnamed uncertainty gets treated as zero.',
  },
  {
    id: 'info_disconfirm', requirement: 'information',
    prompt: 'Has anyone genuinely tried to disconfirm the favoured option?',
    options: [
      { value: 0,   label: 'No — we looked for support, not problems' },
      { value: 0.5, label: 'Informally, in discussion' },
      { value: 1,   label: 'Yes — a deliberate attempt to kill it, written up' },
    ],
    remedy: 'Run a pre-mortem: assume it is eighteen months later and this failed badly — write the reasons. Do it before committing, not after.',
  },

  /* ── Values and tradeoffs ── */
  {
    id: 'values_before', requirement: 'values',
    prompt: 'Were the decision criteria written down before the options were scored?',
    options: [
      { value: 0,   label: 'No — criteria emerged while comparing' },
      { value: 0.4, label: 'Roughly, in someone\'s head' },
      { value: 1,   label: 'Yes — written and agreed first' },
    ],
    remedy: 'Set criteria first. Criteria written after the options are known reliably describe the option you already preferred.',
    fatalAtZero: true,
  },
  {
    id: 'values_weighted', requirement: 'values',
    prompt: 'Are the criteria prioritised against each other?',
    options: [
      { value: 0,   label: 'No — everything matters equally' },
      { value: 0.5, label: 'Loosely ranked' },
      { value: 1,   label: 'Explicitly weighted or ordered' },
    ],
    remedy: 'If everything is equally important, nothing is decidable. Rank them, even crudely.',
  },
  {
    id: 'values_sacrifice', requirement: 'values',
    prompt: 'Is it clear what you are willing to give up?',
    options: YES_NO('No — the choice is framed as all upside', 'Yes — the accepted cost is stated'),
    remedy: 'Name the tradeoff you are accepting. A decision with no downside written down has not been examined.',
  },

  /* ── Reasoning ── */
  {
    id: 'reason_logic', requirement: 'reasoning',
    prompt: 'Is the path from evidence to choice written down?',
    options: [
      { value: 0,   label: 'No — the conclusion is asserted' },
      { value: 0.5, label: 'Partially — a summary, not a chain' },
      { value: 1,   label: 'Yes — someone else could follow the reasoning' },
    ],
    remedy: 'Write the argument, not the conclusion. If nobody can reconstruct why in six months, the reasoning is lost the moment the room empties.',
  },
  {
    id: 'reason_killcriteria', requirement: 'reasoning',
    prompt: 'Have you stated what would change your mind?',
    options: YES_NO('No', 'Yes — the disconfirming condition is written down'),
    remedy: 'Write the specific evidence that would reverse this. A decision that nothing could falsify is a belief.',
    fatalAtZero: true,
  },
  {
    id: 'reason_challenge', requirement: 'reasoning',
    prompt: 'Has the reasoning been independently challenged?',
    options: [
      { value: 0,   label: 'No' },
      { value: 0.5, label: 'Informally, by people close to it' },
      { value: 1,   label: 'Yes — by someone with standing to say no' },
    ],
    remedy: 'Get challenge from someone who is not invested in the outcome and is senior enough to be listened to.',
  },

  /* ── Commitment ── */
  {
    id: 'commit_owner', requirement: 'commitment',
    prompt: 'Who is accountable for the outcome?',
    options: [
      { value: 0,   label: 'Nobody specific, or a committee' },
      { value: 0.5, label: 'A team or function' },
      { value: 1,   label: 'One named person' },
    ],
    remedy: 'Name one person. Shared accountability across a committee is the most reliable predictor of a decision quietly not happening.',
    fatalAtZero: true,
  },
  {
    id: 'commit_date', requirement: 'commitment',
    prompt: 'Is there a date the decision takes effect?',
    options: YES_NO('No', 'Yes — a specific date'),
    remedy: 'Put a date on it. Undated decisions are intentions.',
  },
  {
    id: 'commit_buyin', requirement: 'commitment',
    prompt: 'Have the people who must execute it accepted it?',
    options: [
      { value: 0,   label: 'They have not been asked' },
      { value: 0.5, label: 'Informed, not consulted' },
      { value: 1,   label: 'Consulted, and objections were heard' },
    ],
    remedy: 'Talk to the executors before committing. Resistance surfaced after the announcement costs several times more than resistance surfaced before it.',
  },
  {
    id: 'commit_firstmove', requirement: 'commitment',
    prompt: 'Is the first concrete action defined?',
    options: YES_NO('No', 'Yes — a specific next step with an owner'),
    remedy: 'Define the first move. A decision whose first action is undefined has not really been made.',
  },
];

/* ═══════════════════════════════════════════════════════════════
   STAKES CALIBRATION
   ═══════════════════════════════════════════════════════════════
   The bar is not the same for every decision. Demanding exhaustive
   rigour on a cheap, reversible call is waste; accepting moderate
   rigour on an irreversible one is negligence. So the engine reports
   the GAP between where you are and where you need to be — an
   absolute score with no threshold is not actionable.
   ═══════════════════════════════════════════════════════════════ */

const REQUIRED_BAR = {
  low:      { easy: 30, costly: 45, irreversible: 60 },
  moderate: { easy: 45, costly: 60, irreversible: 72 },
  high:     { easy: 58, costly: 72, irreversible: 82 },
  critical: { easy: 68, costly: 82, irreversible: 90 },
};

/**
 * @param {'low'|'moderate'|'high'|'critical'} c
 * @param {'easy'|'costly'|'irreversible'} r
 */
export const requiredBar = (c, r) => REQUIRED_BAR[c]?.[r] ?? 60;

/* ═══════════════════════════════════════════════════════════════
   SCORING
   ═══════════════════════════════════════════════════════════════ */

const pct = (n) => Math.round(n * 1000) / 10;

/** Below this, a question is a weakness worth acting on — not merely
 *  a rock-bottom answer. See the note in the failure filter. */
const WEAKNESS_THRESHOLD = 0.6;

/**
 * @param {Record<string, number>} answers
 * @param {'low'|'moderate'|'high'|'critical'} [consequence]
 * @param {'easy'|'costly'|'irreversible'} [reversibility]
 */
export function computeDecisionQuality(
  answers,
  consequence = 'moderate',
  reversibility = 'costly',
) {
  const requiredPct = requiredBar(consequence, reversibility);

  const requirements = REQUIREMENTS.map((meta) => {
    const qs = DQ_QUESTIONS.filter((q) => q.requirement === meta.id);
    const answered = qs.filter((q) => typeof answers[q.id] === 'number');

    /* Unanswered questions score ZERO rather than being skipped. An
       unanswered question about a decision is not neutral — it means
       nobody has checked, which is the same practical state as "no". */
    const total = qs.reduce((s, q) => {
      const v = answers[q.id];
      return s + (typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0);
    }, 0);

    /* A question counts as a failure when it is materially short of the
       best available answer — not only when it hits rock bottom.
       Bottom-only would leave a requirement scoring 20% with an EMPTY
       work list, which tells the user they are blocked and nothing
       about what to do, the single most useless output this tool could
       produce. `fatal` still means the fundamental is genuinely absent,
       so it stays tied to the worst option. */
    const failures = qs
      .filter((q) => {
        const v = answers[q.id];
        return typeof v !== 'number' || v < WEAKNESS_THRESHOLD;
      })
      .map((q) => {
        const v = answers[q.id];
        const worst = Math.min(...q.options.map((o) => o.value));
        return {
          id: q.id, prompt: q.prompt, remedy: q.remedy,
          fatal: Boolean(q.fatalAtZero) && (typeof v !== 'number' || v <= worst),
        };
      });

    const scorePct = qs.length > 0 ? pct(total / qs.length) : 0;

    return {
      id: meta.id, label: meta.label, what: meta.what,
      scorePct,
      answered: answered.length,
      total: qs.length,
      blocking: scorePct < requiredPct,
      failures,
    };
  });

  /* THE CHAIN. Overall quality is the weakest requirement — see the
     header. The mean is computed only so the difference can be shown. */
  const overallPct = requirements.length
    ? Math.min(...requirements.map((r) => r.scorePct))
    : 0;
  const averagePct = requirements.length
    ? Math.round((requirements.reduce((s, r) => s + r.scorePct, 0) / requirements.length) * 10) / 10
    : 0;

  const fatalIssues = requirements
    .flatMap((r) => r.failures.filter((f) => f.fatal))
    .map((f) => f.prompt);

  const gapPts = Math.round((overallPct - requiredPct) * 10) / 10;

  const verdict =
    fatalIssues.length > 0 ? 'blocked'
    : gapPts >= 0 ? 'ready'
    : gapPts >= -12 ? 'nearly'
    : 'not_ready';

  const blockers = requirements.filter((r) => r.blocking).sort((a, b) => a.scorePct - b.scorePct);

  const headline =
    verdict === 'blocked'
      ? `Do not take this to the room yet — ${fatalIssues.length} fundamental${fatalIssues.length > 1 ? 's are' : ' is'} missing.`
      : verdict === 'ready'
        ? `Ready. Weakest link is ${blockers[0]?.label ?? requirements.slice().sort((a, b) => a.scorePct - b.scorePct)[0].label}, and it clears the bar for a ${consequence}-consequence, ${reversibility === 'easy' ? 'reversible' : reversibility}, decision.`
        : verdict === 'nearly'
          ? `Close. ${blockers[0]?.label ?? 'One requirement'} is ${Math.abs(gapPts)} points short — fix that and this is ready.`
          : `Not ready. ${blockers.length} requirement${blockers.length > 1 ? 's are' : ' is'} below the bar for a decision this consequential.`;

  /* Work list: weakest requirement first, fatal items always at the top. */
  const nextActions = blockers
    .flatMap((r) => r.failures)
    .sort((a, b) => Number(b.fatal) - Number(a.fatal))
    .slice(0, 6)
    .map(({ prompt, remedy, fatal }) => ({ prompt, remedy, fatal }));

  /* ── Confidence in the ANSWERS, not the decision ── */
  const confidenceFlags = [];
  const given = DQ_QUESTIONS.map((q) => answers[q.id]).filter((v) => typeof v === 'number');
  const answeredCount = given.length;

  if (answeredCount < DQ_QUESTIONS.length) {
    confidenceFlags.push(
      `${DQ_QUESTIONS.length - answeredCount} of ${DQ_QUESTIONS.length} questions unanswered — each counts as zero, because "nobody checked" and "no" have the same consequence.`,
    );
  }
  if (answeredCount >= 8 && new Set(given).size === 1) {
    confidenceFlags.push('Every question has the identical answer. That is a response pattern, not an assessment — re-read the anchors.');
  }
  if (answeredCount >= 8 && given.every((v) => v >= 0.9)) {
    confidenceFlags.push('Every question scored top. Genuinely well-formed decisions are rare; check this is the decision as it stands, not as you intend it to be.');
  }
  if (answeredCount >= 8 && given.every((v) => v <= 0.1)) {
    confidenceFlags.push('Every question scored bottom — if that is accurate this is not yet a decision, it is a topic.');
  }

  return {
    overallPct, averagePct,
    flatteryPts: Math.round((averagePct - overallPct) * 10) / 10,
    requiredPct, gapPts, verdict, headline,
    requirements, nextActions, fatalIssues,
    answeredCount, totalQuestions: DQ_QUESTIONS.length,
    confidenceFlags,
  };
}

/** Deterministic summary for the model. It never recomputes these. */
export function decisionQualityToPrompt(r) {
  const lines = [
    `• Verdict: ${r.verdict.toUpperCase()} — ${r.headline}`,
    `• Decision quality (weakest link): ${r.overallPct}%`,
    `• Simple average: ${r.averagePct}% (overstates by ${r.flatteryPts} points)`,
    `• Required for these stakes: ${r.requiredPct}% — gap ${r.gapPts >= 0 ? '+' : ''}${r.gapPts}`,
  ];
  for (const q of r.requirements) {
    lines.push(`• ${q.label}: ${q.scorePct}%${q.blocking ? ' — BELOW BAR' : ''}`);
  }
  if (r.fatalIssues.length) lines.push(`• Fatal gaps: ${r.fatalIssues.join('; ')}`);
  if (r.nextActions.length) lines.push(`• Next: ${r.nextActions.map((a) => a.remedy).join(' | ')}`);
  return lines.join('\n');
}
