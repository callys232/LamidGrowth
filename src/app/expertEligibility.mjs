/**
 * Expert eligibility, shared by discovery (talent.mjs), the review queue (scoping.mjs) and
 * expert signals (signals.mjs) so all three apply the same rules.
 *
 * Eligibility is decided first and ranking only orders eligible experts: a case-specific
 * requirement (a licence in a jurisdiction, a credential type, a response window) is a gate,
 * not a bonus. A credential counts only while it is verified, unexpired and not revoked.
 */
import { z } from 'zod';

/** A credential that can be relied on right now. */
export function isCurrentCredential(c, now = new Date().toISOString()) {
  return (
    c.verification_status === 'verified' && !c.revoked_at && (!c.expires_at || c.expires_at > now)
  );
}

/** A current licence that covers this jurisdiction and, where the credential states a scope,
 * this category. A licence with no stated jurisdiction cannot show it covers one. */
export function licenceCovers(c, { jurisdiction, category }, now) {
  if (c.type !== 'license' || !isCurrentCredential(c, now)) return false;
  if (!c.jurisdiction || c.jurisdiction !== jurisdiction) return false;
  return !category || !c.scope || c.scope === category;
}

/** What a case or search requires of an expert. Every field is optional; each one given is a
 * hard requirement. */
export const requirementSchema = z
  .object({
    domain: z.string().trim().max(100).optional(),
    function: z.string().trim().max(100).optional(),
    industry: z.string().trim().max(100).optional(),
    jurisdiction: z.string().trim().max(100).optional(),
    credentialType: z
      .enum(['license', 'certification', 'degree', 'publication', 'prior-role'])
      .optional(),
    maxResponseHours: z.coerce
      .number()
      .int()
      .min(1)
      .max(24 * 30)
      .optional(),
  })
  .strict();

/** Pure check of one profile against a requirement, given its credentials and whether it has a
 * restricted conflict. Returns every unmet requirement, so the reason is never hidden. */
export function checkEligibility(
  profile,
  credentials,
  requirement,
  { restricted = false, now } = {},
) {
  const reasons = [];
  const current = credentials.filter((c) => isCurrentCredential(c, now));
  const list = (field) => JSON.parse(profile[field] || '[]');
  if (restricted) reasons.push('has a restricted conflict of interest');
  if (requirement.domain && !list('domains').includes(requirement.domain))
    reasons.push(`does not cover ${requirement.domain}`);
  if (requirement.function && !list('functions').includes(requirement.function))
    reasons.push(`does not cover ${requirement.function}`);
  if (requirement.industry && !list('industries').includes(requirement.industry))
    reasons.push(`does not cover ${requirement.industry}`);
  if (requirement.credentialType === 'license' && requirement.jurisdiction) {
    if (
      !credentials.some((c) =>
        licenceCovers(c, { ...requirement, category: requirement.domain }, now),
      )
    )
      reasons.push(`holds no current licence for ${requirement.jurisdiction}`);
  } else {
    if (requirement.credentialType && !current.some((c) => c.type === requirement.credentialType))
      reasons.push(`holds no current ${requirement.credentialType}`);
    if (
      requirement.jurisdiction &&
      profile.jurisdiction !== requirement.jurisdiction &&
      !current.some((c) => c.jurisdiction === requirement.jurisdiction)
    )
      reasons.push(`does not practise in ${requirement.jurisdiction}`);
  }
  if (
    requirement.maxResponseHours &&
    !(
      profile.expected_response_hours &&
      profile.expected_response_hours <= requirement.maxResponseHours
    )
  )
    reasons.push(`does not commit to responding within ${requirement.maxResponseHours} hours`);
  return { eligible: reasons.length === 0, reasons, currentCredentials: current };
}

/* ── Database loaders ─────────────────────────────────────────────────────────────── */

export async function credentialsByProfile(db) {
  const rows = await db.prepare('SELECT * FROM expert_credentials').all();
  const map = new Map();
  for (const r of rows)
    (map.get(r.profile_id) ?? map.set(r.profile_id, []).get(r.profile_id)).push(r);
  return map;
}

export async function restrictedProfileIds(db) {
  const rows = await db
    .prepare("SELECT DISTINCT profile_id FROM conflict_disclosures WHERE status = 'restricted'")
    .all();
  return new Set(rows.map((r) => r.profile_id));
}

/** A reviewer's eligibility for a scoping case, checked at claim and again at completion.
 * Where the case's jurisdiction rule requires a licence, a current, matching licence is required
 * — a declared jurisdiction on the profile is not enough. */
export async function reviewerEligibility(db, profile, caseRow, requiresLicense) {
  if (!profile || profile.vetting_status !== 'verified')
    return { eligible: false, reasons: ['profile is not verified'], licenceId: null };
  const credentials = await db
    .prepare('SELECT * FROM expert_credentials WHERE profile_id = ?')
    .all(profile.id);
  const restricted = Boolean(
    await db
      .prepare(
        "SELECT 1 FROM conflict_disclosures WHERE profile_id = ? AND status = 'restricted' LIMIT 1",
      )
      .get(profile.id),
  );
  const licence = caseRow.risk_band === 'red' && requiresLicense;
  const check = checkEligibility(
    profile,
    credentials,
    {
      domain: caseRow.category || undefined,
      ...(licence ? { jurisdiction: caseRow.jurisdiction, credentialType: 'license' } : {}),
    },
    { restricted, now: new Date().toISOString() },
  );
  const licenceRow = licence
    ? credentials.find((c) =>
        licenceCovers(c, { jurisdiction: caseRow.jurisdiction, category: caseRow.category }),
      )
    : null;
  return { eligible: check.eligible, reasons: check.reasons, licenceId: licenceRow?.id ?? null };
}
