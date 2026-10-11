import type { DemoProfile, DemoTier } from './scenarios';

type GoalBrief = { title: string; success: string; actions: [string, string] };
const goal = (title: string, success: string, first: string, next: string): GoalBrief => ({
  title,
  success,
  actions: [first, next],
});

/** Fictional professional scenarios, organised by audience and operating scale.
 * Numerical targets are illustrative commitments, not product performance claims. */
export const PROFESSIONAL_GOALS: Record<DemoProfile, Record<DemoTier, GoalBrief[]>> = {
  Freelancer: {
    individual: [
      goal(
        'Win a retained freelance client',
        'Sign a three-month retainer with agreed deliverables, revisions and payment dates.',
        'Qualify the client brief and scope boundaries',
        'Submit a retainer proposal with acceptance criteria',
      ),
      goal(
        'Improve freelance project profitability',
        'Review costs and effort for 5 commissions and set a minimum project margin.',
        'Reconcile billed hours, fees and direct expenses',
        'Revise estimates and pricing for the next commission',
      ),
      goal(
        'Publish a client-approved freelance portfolio',
        'Publish 4 case studies with client permission and documented outcomes.',
        'Collect deliverables, results and publication permissions',
        'Review and publish the selected case studies',
      ),
    ],
    team: [
      goal(
        'Deliver a subcontracted client engagement',
        'Complete 3 client milestones with named contributors and recorded acceptance.',
        'Assign specialist deliverables and handoff requirements',
        'Review submissions against client acceptance criteria',
      ),
      goal(
        'Build a reliable freelance partner bench',
        'Confirm availability, skills and terms for 6 specialist collaborators.',
        'Assess collaborator capabilities and coverage gaps',
        'Agree partner scopes, availability and commercial terms',
      ),
      goal(
        'Standardise freelance studio delivery handovers',
        'Adopt a reviewed handover checklist across 4 recurring client services.',
        'Map revision loops and missing handover evidence',
        'Validate the checklist with studio collaborators',
      ),
    ],
    enterprise: [
      goal(
        'Coordinate a distributed freelancer delivery network',
        'Agree owners, milestones and escalation triggers for 12 client engagements.',
        'Map client commitments and contributor dependencies',
        'Review network capacity and prioritise delivery exceptions',
      ),
      goal(
        'Strengthen independent contractor compliance',
        'Review contracts, confidentiality and rights obligations for 20 collaborators.',
        'Reconcile contractor terms and supporting evidence',
        'Assign remediation owners for missing agreements',
      ),
      goal(
        'Review freelance network revenue concentration',
        'Assess exposure across 10 client accounts and approve diversification priorities.',
        'Compare client revenue, margins and renewal dates',
        'Rank new opportunities against concentration risks',
      ),
    ],
  },
  Individual: {
    individual: [
      goal(
        'Secure a project coordinator role',
        'Submit 8 tailored applications and complete 3 interviews within 6 weeks.',
        'Compare role requirements with current skills',
        'Prepare an evidence-based application portfolio',
      ),
      goal(
        'Earn a recognised analytics certification',
        'Complete the course and pass its assessment within 8 weeks.',
        'Assess gaps against the certification syllabus',
        'Schedule weekly practice and book the assessment',
      ),
      goal(
        'Publish a professional case-study portfolio',
        'Publish 3 case studies with evidence of contribution and outcomes.',
        'Select projects and obtain permission to share',
        'Publish the reviewed portfolio',
      ),
    ],
    team: [
      goal(
        'Launch a peer career-development cohort',
        'Run 4 peer sessions with documented next steps for 6 participants.',
        'Map participant goals and skill gaps',
        'Agree the cohort agenda and review cadence',
      ),
      goal(
        'Deliver a shared research assignment',
        'Submit a reviewed research brief with named contributions from all 4 members.',
        'Assign research questions and evidence owners',
        'Review findings and resolve conflicting evidence',
      ),
      goal(
        'Establish a mentoring circle',
        'Match 5 participants with mentors and complete the first monthly review.',
        'Collect mentoring needs and availability',
        'Confirm mentor matches and review commitments',
      ),
    ],
    enterprise: [
      goal(
        'Scale an employee career-mobility programme',
        'Publish skills profiles and development plans for 100 pilot participants.',
        'Baseline role requirements across pilot departments',
        'Review mobility pathways with department leads',
      ),
      goal(
        'Standardise professional learning across regions',
        'Agree a common competency framework with 3 regional offices.',
        'Compare existing regional learning requirements',
        'Approve a shared framework and local exceptions',
      ),
      goal(
        'Audit an organisation-wide mentoring initiative',
        'Review participation, outcomes and overdue commitments across 5 departments.',
        'Reconcile mentoring records and owners',
        'Present the programme review and improvement actions',
      ),
    ],
  },
  Professional: {
    individual: [
      goal(
        'Win a strategic advisory engagement',
        'Secure one signed engagement with agreed scope, milestones and decision rights.',
        'Qualify the client problem and constraints',
        'Prepare a scoped proposal and delivery plan',
      ),
      goal(
        'Prepare for a senior management promotion',
        'Close 3 priority competency gaps and assemble a promotion evidence pack.',
        'Compare role expectations with current evidence',
        'Review the development plan with a mentor',
      ),
      goal(
        'Improve personal consulting margins',
        'Review 6 completed engagements and document a revised pricing approach.',
        'Reconcile effort, fees and delivery costs',
        'Approve revised estimates for the next proposal',
      ),
    ],
    team: [
      goal(
        'Improve advisory-team delivery predictability',
        'Reduce overdue milestones from 6 to 2 over the next 8 weeks.',
        'Baseline cycle times and outstanding dependencies',
        'Rebalance assignments and review delivery signals',
      ),
      goal(
        'Build a specialist consulting bench',
        'Document coverage and development plans for 5 critical capabilities.',
        'Assess specialist skills and single-person dependencies',
        'Approve cross-training and cover arrangements',
      ),
      goal(
        'Introduce engagement quality reviews',
        'Complete peer reviews for all 4 active client engagements.',
        'Define evidence and review criteria',
        'Record findings, owners and corrective actions',
      ),
    ],
    enterprise: [
      goal(
        'Align a multi-office advisory portfolio',
        'Agree priorities, owners and success measures for 12 strategic engagements.',
        'Map portfolio objectives and competing commitments',
        'Review trade-offs with the portfolio steering group',
      ),
      goal(
        'Strengthen leadership succession coverage',
        'Identify successors and development actions for 15 critical roles.',
        'Assess readiness and evidence for nominated successors',
        'Approve role-specific development and continuity plans',
      ),
      goal(
        'Standardise professional practice governance',
        'Approve common engagement controls across 4 operating regions.',
        'Compare regional obligations and control evidence',
        'Resolve control gaps and assign review owners',
      ),
    ],
  },
  Creator: {
    individual: [
      goal(
        'Launch a paid educational content product',
        'Validate the offer with 12 audience interviews and secure 10 pilot purchases.',
        'Map audience needs and competing offers',
        'Test the pilot offer and review purchase evidence',
      ),
      goal(
        'Build a sustainable publishing schedule',
        'Publish 8 planned pieces in 4 weeks within a 10-hour weekly production budget.',
        'Measure production effort and bottlenecks',
        'Prioritise formats and schedule the next production cycle',
      ),
      goal(
        'Review sponsorship profitability',
        'Document margin, effort and obligations for 3 completed sponsorships.',
        'Reconcile sponsorship fees and production costs',
        'Review renewal terms and outstanding commitments',
      ),
    ],
    team: [
      goal(
        'Coordinate a multi-format campaign launch',
        'Deliver 12 approved campaign assets with named owners and no missed handoffs.',
        'Map asset dependencies and approval requirements',
        'Review capacity and confirm the launch schedule',
      ),
      goal(
        'Strengthen editorial and production coverage',
        'Provide trained cover for all 4 critical production responsibilities.',
        'Assess skills and workload across the creator team',
        'Assign cross-training and backup responsibilities',
      ),
      goal(
        'Implement partner deliverable tracking',
        'Reconcile all commitments for 5 active brand partnerships.',
        'Capture partner terms, dates and evidence requirements',
        'Review overdue obligations with account owners',
      ),
    ],
    enterprise: [
      goal(
        'Align a creator network around portfolio priorities',
        'Approve a shared quarterly roadmap for 6 content brands.',
        'Compare audience opportunities and portfolio capacity',
        'Review investment choices with brand leads',
      ),
      goal(
        'Establish network-wide content risk controls',
        'Assign owners and controls for rights, reputational and continuity risks.',
        'Compile risks and supporting control evidence',
        'Review exposures and approve mitigation priorities',
      ),
      goal(
        'Review regional licensing compliance',
        'Complete an obligations review for 4 regional publishing operations.',
        'Map licensing terms and renewal dates',
        'Resolve overdue evidence and record accountable owners',
      ),
    ],
  },
  Founder: {
    individual: [
      goal(
        'Validate a repeatable customer acquisition offer',
        'Complete 15 customer interviews and convert 3 qualified pilot customers.',
        'Define customer assumptions and interview criteria',
        'Compare pilot outcomes with the original assumptions',
      ),
      goal(
        'Establish a thirteen-week cash runway view',
        'Produce a weekly forecast with reconciled balances and explicit cash assumptions.',
        'Reconcile cash, receivables and committed payments',
        'Review downside scenarios and funding actions',
      ),
      goal(
        'Prioritise the first product release',
        'Approve a release scope with 5 ranked capabilities and explicit exclusions.',
        'Score candidate features against customer evidence',
        'Agree the release scope and decision rationale',
      ),
    ],
    team: [
      goal(
        'Deliver a cross-functional customer pilot',
        'Complete a 6-week pilot with agreed success criteria and signed acceptance.',
        'Assign product, sales and delivery responsibilities',
        'Review pilot signals and close critical dependencies',
      ),
      goal(
        'Balance hiring demand with operating capacity',
        'Approve a capacity plan covering the next 3 priority hires.',
        'Map workload, skill gaps and available capacity',
        'Review hiring alternatives against cash constraints',
      ),
      goal(
        'Run an evidence-based product retrospective',
        'Close 4 agreed improvements from the last release review.',
        'Collect release outcomes and decision assumptions',
        'Assign improvement owners and confirm completion evidence',
      ),
    ],
    enterprise: [
      goal(
        'Evaluate expansion into two new markets',
        'Approve a market-entry recommendation supported by risk and scenario analysis.',
        'Compare market evidence and entry options',
        'Review expected value and downside exposure',
      ),
      goal(
        'Govern a venture portfolio investment cycle',
        'Rank 10 growth initiatives with explicit resource trade-offs.',
        'Collect opportunity estimates and confidence evidence',
        'Approve staged investment and review triggers',
      ),
      goal(
        'Prepare a board-ready operating review',
        'Reconcile strategic delivery, cash exposure and obligations for the quarter.',
        'Gather portfolio metrics and commitment evidence',
        'Review exceptions and assign board follow-up actions',
      ),
    ],
  },
  Team: {
    individual: [
      goal(
        'Improve a delivery lead’s planning accuracy',
        'Compare estimates with actual effort for 10 completed work items.',
        'Capture planned and actual delivery effort',
        'Adjust the next planning cycle using observed variation',
      ),
      goal(
        'Resolve an analyst’s critical workflow bottleneck',
        'Identify the limiting step and complete one measured improvement experiment.',
        'Map handoffs and waiting time',
        'Test the improvement and review delivery evidence',
      ),
      goal(
        'Document a team coordinator’s handover process',
        'Publish a reviewed handover checklist with clear ownership for 6 recurring tasks.',
        'Identify missing handover information',
        'Review the checklist with task owners',
      ),
    ],
    team: [
      goal(
        'Reduce delivery-team work in progress',
        'Reduce open work items from 18 to 12 while monitoring throughput.',
        'Baseline throughput, cycle time and active work',
        'Agree work-in-progress limits and review signals',
      ),
      goal(
        'Clear shared-team dependency delays',
        'Resolve 5 overdue dependencies with accountable owners and due dates.',
        'Map blocked work and external handoffs',
        'Agree resolution commitments with dependent teams',
      ),
      goal(
        'Redesign the team’s operating rhythm',
        'Replace duplicated meetings with a documented daily and weekly review cadence.',
        'Assess meeting purpose, decisions and attendance',
        'Approve the revised cadence and review its effectiveness',
      ),
    ],
    enterprise: [
      goal(
        'Synchronise delivery across eight teams',
        'Publish a shared dependency plan with owners for every critical handoff.',
        'Map inter-team commitments and late dependencies',
        'Review portfolio bottlenecks and escalation triggers',
      ),
      goal(
        'Standardise delivery stability monitoring',
        'Agree consistent metrics and signal-review ownership across 5 departments.',
        'Compare metric definitions and historical series',
        'Approve monitoring thresholds and review responsibilities',
      ),
      goal(
        'Validate delivery continuity arrangements',
        'Review recovery priorities and cover for 12 critical delivery activities.',
        'Assess interruption impacts and recovery requirements',
        'Resolve gaps in continuity plans and accountable ownership',
      ),
    ],
  },
  SME: {
    individual: [
      goal(
        'Improve an owner-manager’s cash collection process',
        'Review 20 overdue invoices and agree follow-up dates with each account owner.',
        'Reconcile aged receivables and customer commitments',
        'Prioritise collection actions against the cash forecast',
      ),
      goal(
        'Review service-line pricing economics',
        'Calculate costs and contribution for the 3 highest-volume service lines.',
        'Gather direct costs and delivery effort',
        'Compare pricing alternatives and document the chosen approach',
      ),
      goal(
        'Prepare a practical supplier renewal plan',
        'Review terms and renewal dates for 8 critical supplier agreements.',
        'Capture obligations, owners and cancellation windows',
        'Approve renewal priorities and negotiation actions',
      ),
    ],
    team: [
      goal(
        'Balance demand across service delivery teams',
        'Identify overload and approve capacity adjustments for 3 service teams.',
        'Compare forecast demand with available capacity',
        'Review reassignment options and service commitments',
      ),
      goal(
        'Improve small-business financial control coverage',
        'Assign evidenced controls to 6 priority payment and reporting risks.',
        'Assess control gaps and responsible owners',
        'Approve remediation actions and review dates',
      ),
      goal(
        'Review the customer-service improvement cycle',
        'Close 5 prioritised improvements from recurring customer issues.',
        'Group issue patterns and investigate root causes',
        'Verify corrective actions with service owners',
      ),
    ],
    enterprise: [
      goal(
        'Align a multi-branch growth roadmap',
        'Rank expansion initiatives for 10 branches using shared assumptions.',
        'Compare branch opportunities and resource demand',
        'Approve a staged roadmap with measurable review triggers',
      ),
      goal(
        'Strengthen group-wide working-capital visibility',
        'Reconcile cash forecasts and key drivers across 6 business units.',
        'Standardise forecast inputs and reporting ownership',
        'Review consolidated cash exposure and contingency actions',
      ),
      goal(
        'Complete a branch compliance assessment',
        'Review control evidence and overdue obligations across all operating branches.',
        'Collect obligation registers and evidence references',
        'Assign remediation owners and escalation dates',
      ),
    ],
  },
  Enterprise: {
    individual: [
      goal(
        'Prepare an executive decision on capital allocation',
        'Document options, evidence gaps and trade-offs before the investment committee.',
        'Compare investment scenarios and confidence assumptions',
        'Review decision quality and prepare the recommendation',
      ),
      goal(
        'Build a director’s succession development plan',
        'Agree evidence-based development actions for 3 leadership requirements.',
        'Assess current capability against role expectations',
        'Review development priorities with the executive sponsor',
      ),
      goal(
        'Complete a portfolio sponsor’s commitment review',
        'Confirm owners and next actions for 10 strategic commitments.',
        'Reconcile commitments with delivery evidence',
        'Escalate overdue items and record sponsor decisions',
      ),
    ],
    team: [
      goal(
        'Deliver a transformation programme workstream',
        'Complete 4 agreed milestones with explicit dependency and risk reviews.',
        'Map milestones, owners and cross-functional dependencies',
        'Review warning indicators and adjust the delivery plan',
      ),
      goal(
        'Close critical workforce capability gaps',
        'Approve development and cover plans for 8 priority team capabilities.',
        'Assess current skills, required levels and capacity',
        'Prioritise development actions and successor cover',
      ),
      goal(
        'Review a divisional risk and controls register',
        'Assign current control evidence and owners to all high-priority divisional risks.',
        'Reconcile risk records with control evidence',
        'Review residual exposure and overdue mitigation actions',
      ),
    ],
    enterprise: [
      goal(
        'Align the enterprise strategy execution portfolio',
        'Approve quarterly objectives and owners for 20 strategic initiatives.',
        'Assess strategic alignment and competing priorities',
        'Review portfolio trade-offs and confirm success measures',
      ),
      goal(
        'Establish enterprise resilience priorities',
        'Approve recovery priorities and remediation plans for 15 critical activities.',
        'Assess business impact and current recovery capability',
        'Review risk appetite and fund priority resilience actions',
      ),
      goal(
        'Complete a group governance effectiveness review',
        'Present evidenced findings and accountable actions for every governance domain.',
        'Gather governance evidence from operating entities',
        'Approve improvement owners, dates and review triggers',
      ),
    ],
  },
  Institution: {
    individual: [
      goal(
        'Prepare a programme manager’s funding case',
        'Submit a reviewed case with outcomes, delivery assumptions and a cost baseline.',
        'Collect programme evidence and stakeholder requirements',
        'Compare funding options and complete the decision brief',
      ),
      goal(
        'Strengthen a policy analyst’s evidence quality',
        'Review source completeness and consistency for 5 priority policy indicators.',
        'Check indicator definitions and missing evidence',
        'Document data-quality limitations and corrective actions',
      ),
      goal(
        'Complete a research lead’s partner obligations review',
        'Confirm evidence and owners for 6 active research commitments.',
        'Reconcile partnership terms and reporting dates',
        'Resolve overdue submissions and record review evidence',
      ),
    ],
    team: [
      goal(
        'Coordinate delivery of a funded programme',
        'Agree responsibilities and milestones for 4 delivery partners.',
        'Map partner dependencies and resource constraints',
        'Review milestones, warning indicators and escalation owners',
      ),
      goal(
        'Develop programme-team capability coverage',
        'Create development and backup plans for 5 critical programme roles.',
        'Assess required competencies and available staff capability',
        'Approve training priorities and continuity cover',
      ),
      goal(
        'Evaluate a completed programme pilot',
        'Document outcomes, evidence limitations and 3 decisions for the next phase.',
        'Gather participant evidence and delivery results',
        'Review lessons and approve the next-phase adjustments',
      ),
    ],
    enterprise: [
      goal(
        'Align a multi-agency institutional mandate',
        'Agree common outcomes and accountabilities across 7 participating agencies.',
        'Map mandates, stakeholder priorities and overlaps',
        'Approve an alignment matrix and shared review cadence',
      ),
      goal(
        'Strengthen public-service continuity readiness',
        'Review recovery requirements and gaps for 10 critical public services.',
        'Assess service interruption impacts and dependencies',
        'Approve continuity priorities and accountable remediation',
      ),
      goal(
        'Complete an institution-wide obligations assurance cycle',
        'Review all statutory and funding commitments with evidence-backed exceptions.',
        'Reconcile obligation registers across departments',
        'Present assurance findings and assign corrective-action owners',
      ),
    ],
  },
};
export const TIER_CONSTRAINTS: Record<DemoTier, string> = {
  individual:
    'One accountable lead; limited weekly capacity; use evidence available within the current role.',
  team: 'Shared team capacity; handoffs and approval dependencies; agree owners before committing to dates.',
  enterprise:
    'Cross-unit dependencies; regional obligations and risk appetite; steering-group approval for resource commitments.',
};
