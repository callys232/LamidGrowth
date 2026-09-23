/**
 * Archetype E — workforce roster input and derivation.
 *
 * Serves the A-Series modules that assess workforce structure: capability,
 * succession, bench strength, and planning. Every figure is computed here.
 */

/**
 * @typedef {Object} RoleRow
 * @property {string} id
 * @property {string} role
 * @property {number} headcount
 * @property {number} capability 1–5 average capability against the role's requirements.
 * @property {number} attritionRisk 1–5 likelihood of departure within 12 months.
 * @property {number} successors People ready to step into this role today.
 * @property {boolean} critical
 */

/**
 * @typedef {Object} RosterSummary
 * @property {number} totalHeadcount
 * @property {number} roleCount
 * @property {number} meanCapability
 * @property {number} weightedCapability Headcount-weighted, so a large weak team outweighs a small strong one.
 * @property {number} capabilityGapPct
 * @property {number} meanAttritionRisk
 * @property {number} headcountAtRisk % of headcount in roles rated 4–5 for attrition risk.
 * @property {number} atRiskPct
 * @property {string[]} singlePointRoles Critical roles with no ready successor.
 * @property {number} benchCoveragePct
 * @property {number} criticalRoleCount
 * @property {string[]} warnings
 */

const r1 = (n) => Math.round(n * 10) / 10;
const num = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** @param {RoleRow[]} rows */
export function computeRoster(rows) {
  const warnings = [];
  const clean = rows.filter((r) => r.role.trim() && num(r.headcount) > 0);

  const totalHeadcount = clean.reduce((a, r) => a + num(r.headcount), 0);
  const roleCount = clean.length;

  if (roleCount === 0) {
    return {
      totalHeadcount: 0,
      roleCount: 0,
      meanCapability: 0,
      weightedCapability: 0,
      capabilityGapPct: 0,
      meanAttritionRisk: 0,
      headcountAtRisk: 0,
      atRiskPct: 0,
      singlePointRoles: [],
      benchCoveragePct: 0,
      criticalRoleCount: 0,
      warnings: ['Add at least one role with headcount to run this assessment.'],
    };
  }

  const meanCapability = r1(clean.reduce((a, r) => a + num(r.capability), 0) / roleCount);

  const weightedCapability =
    totalHeadcount > 0
      ? r1(clean.reduce((a, r) => a + num(r.capability) * num(r.headcount), 0) / totalHeadcount)
      : 0;

  // Distance from a fully-capable workforce (5.0), as a percentage.
  const capabilityGapPct = r1(((5 - weightedCapability) / 5) * 100);

  const meanAttritionRisk = r1(clean.reduce((a, r) => a + num(r.attritionRisk), 0) / roleCount);

  const atRisk = clean.filter((r) => num(r.attritionRisk) >= 4);
  const headcountAtRisk = atRisk.reduce((a, r) => a + num(r.headcount), 0);
  const atRiskPct = totalHeadcount > 0 ? r1((headcountAtRisk / totalHeadcount) * 100) : 0;

  const criticalRoles = clean.filter((r) => r.critical);
  const singlePointRoles = criticalRoles.filter((r) => num(r.successors) === 0).map((r) => r.role);

  const benchCoveragePct =
    criticalRoles.length > 0
      ? r1((criticalRoles.filter((r) => num(r.successors) > 0).length / criticalRoles.length) * 100)
      : 0;

  /* ── Checks a CPO would raise ── */
  if (singlePointRoles.length > 0) {
    warnings.push(
      `${singlePointRoles.length} critical role${singlePointRoles.length > 1 ? 's have' : ' has'} no ready successor: ${singlePointRoles.slice(0, 3).join(', ')}${singlePointRoles.length > 3 ? '…' : ''}.`,
    );
  }
  if (atRiskPct > 20) {
    warnings.push(`${atRiskPct}% of headcount sits in high-attrition-risk roles.`);
  }
  if (weightedCapability < 3) {
    warnings.push(
      `Weighted capability is ${weightedCapability}/5 — below the level most roles require.`,
    );
  }
  if (criticalRoles.length === 0) {
    warnings.push('No roles marked critical — succession risk cannot be assessed.');
  }

  return {
    totalHeadcount,
    roleCount,
    meanCapability,
    weightedCapability,
    capabilityGapPct,
    meanAttritionRisk,
    headcountAtRisk,
    atRiskPct,
    singlePointRoles,
    benchCoveragePct,
    criticalRoleCount: criticalRoles.length,
    warnings,
  };
}

export function rosterToPrompt(s) {
  const lines = [
    `• Workforce: ${s.totalHeadcount} people across ${s.roleCount} roles`,
    `• Weighted capability: ${s.weightedCapability}/5 (${s.capabilityGapPct}% gap to full capability)`,
    `• Mean attrition risk: ${s.meanAttritionRisk}/5`,
    `• Headcount in high-risk roles: ${s.headcountAtRisk} (${s.atRiskPct}%)`,
    `• Critical roles: ${s.criticalRoleCount}, bench coverage ${s.benchCoveragePct}%`,
  ];
  if (s.singlePointRoles.length) {
    lines.push(`• Single points of failure: ${s.singlePointRoles.join(', ')}`);
  }
  return lines.join('\n');
}
