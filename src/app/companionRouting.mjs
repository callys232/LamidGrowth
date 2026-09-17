// Scored phrase+keyword classifier for the public (anonymous) guidance topics — same reasoning as
// chooseAgent below, ported from LamidOne's intentRouter.ts: a whole-phrase match outweighs a
// single keyword, the highest score above a minimum wins, and a tie keeps whichever topic is
// already active so one ambiguous message never flips the conversation's subject. This is what
// lets the widget just be "Your Companion" — the visitor never picks a topic or sees a switch
// announced, the right canned guidance is simply the one that comes back.
const GUIDANCE_RULES = [
  {
    topic: 'support',
    phrases: ["can't log in", 'cannot log in', "can't sign in", 'forgot my password', 'reset my password', 'having trouble'],
    keywords: ['password', 'login', 'sign in', 'verify', 'verification', 'code', 'otp', 'locked', 'issue', 'problem', 'broken', 'error', 'trouble'],
  },
  {
    topic: 'pricing',
    phrases: ['how much does it cost', 'how much is it', "what's included", 'what is included'],
    keywords: ['price', 'pricing', 'cost', 'plan', 'points', 'subscription', 'billing', 'tier', 'discount'],
  },
  {
    topic: 'onboarding',
    phrases: ['how do i start', 'how do i sign up', 'get started', 'create an account', 'where do i begin'],
    keywords: ['signup', 'sign up', 'account', 'start', 'begin', 'onboard', 'onboarding', 'new here'],
  },
];
const GUIDANCE_MIN_SCORE = 2;

export function chooseGuidanceTopic(message, previousTopic) {
  const text = message.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const rule of GUIDANCE_RULES) {
    let score = 0;
    for (const phrase of rule.phrases) if (text.includes(phrase)) score += 2;
    for (const keyword of rule.keywords) if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = rule.topic;
    }
  }
  if (best && bestScore >= GUIDANCE_MIN_SCORE && best !== previousTopic) return best;
  return previousTopic || best || 'onboarding';
}

export const guidance = {
  onboarding: {
    name: 'Onboarding Guide',
    response:
      'Create your account with your email and a password, then verify the code sent to your inbox. In your workspace, Guided Planning helps you describe your goal, success measures, constraints and first action.',
    href: '/signup',
  },
  support: {
    name: 'Support Guide',
    response:
      'For sign-in problems, use password recovery. For verification, check your inbox and spam folder, then request a new code on the verification page. Never share a password or verification code in chat.',
    href: '/forgot-password',
  },
  pricing: {
    name: 'Pricing Guide',
    response:
      'Review current plans and points on the pricing page. Specialist costs are shown before you run them. Guidance here is free; a coordinated task charges separately for each completed specialist step.',
    href: '/pricing',
  },
};

export function chooseAgent(message, { previousAgent, page = '', context = '' } = {}) {
  const text = message.toLowerCase();
  if (/\b(password|sign.?in|log.?in|verification|otp|support)\b/.test(text)) return 'support';
  if (/\b(pricing|subscription|points cost|plan price)\b/.test(text)) return 'pricing';
  if (/\b(sign.?up|onboard\w*|create.*account)\b/.test(text)) return 'onboarding';
  if (
    /\bworkflows?\b/.test(text) ||
    /\b(approve|pause|resume|cancel|start|retry)\b.*[a-f0-9]{8}-[a-f0-9-]{27}/i.test(text)
  )
    return 'workflow-orchestration';
  const rules = [
    ['change-order', /change (order|request)/],
    ['sow-builder', /statement of work|\bsow\b/],
    ['scope-builder', /\bscope\b/],
    ['brief-builder', /\bbriefs?\b/],
    ['acceptance-builder', /acceptance/],
    ['deliverable-builder', /deliverable/],
    ['invoice-generator', /invoice/],
    ['quote-generator', /\bquotes?\b/],
    ['estimate-generator', /estimate/],
    ['proposal-drafter', /proposal|\bdraft/],
    ['signal-monitoring', /signal|notification|changed/],
    ['capability-mapper', /capabilit|\bgaps?\b|\bskills?\b|learning/],
    ['performance-analytics', /\bkpi|performance|metrics|analytics/],
    ['market-intelligence', /market|campaign|customer|competitor/],
    ['diagnostic-intelligence', /health|diagnos|risk|assess/],
  ];
  for (const [id, pattern] of rules) if (pattern.test(text)) return id;
  if (
    /^(and |also |what about|explain|continue|tell me more)/.test(text) &&
    previousAgent &&
    previousAgent !== 'workflow-orchestration'
  )
    return previousAgent;
  if (page.includes('/learning')) return 'capability-mapper';
  if (page.includes('/progress')) return 'performance-analytics';
  if (/grow|business|enterprise/i.test(context) && /opportunit|expand/.test(text))
    return 'market-intelligence';
  return 'context-curator';
}

// Every specialist named here must work from the free-text message alone: this plan drives
// companionTasks.mjs's automatic multi-step run, which never has a jobId/proposalId/milestoneId
// to give a specialist — those marketplace-document builders (brief-builder, scope-builder, etc.)
// are only reachable by chatting directly from a job/proposal page, where the client supplies the
// ID explicitly. Picking one of them here would always bounce with "which job?" after already
// charging points for it.
export function planSpecialists(message) {
  if (/proposal|project|deliverable/i.test(message))
    return ['context-curator', 'capability-mapper', 'performance-analytics'];
  if (/grow|market|business/i.test(message))
    return ['diagnostic-intelligence', 'market-intelligence', 'capability-mapper'];
  return ['context-curator', 'diagnostic-intelligence', 'capability-mapper'];
}
