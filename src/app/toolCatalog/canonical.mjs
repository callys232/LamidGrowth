/**
 * Canonical capability → implementation traceability (engine audit 2026-10-05, A1).
 *
 * For each of the specification's 202 capabilities: which catalog tools compute part of it,
 * who may call those tools, their input schema form, their validation evidence, and what is
 * still missing. The 248→63 legacy migration map (migration.mjs) is provenance only and does not
 * establish canonical coverage.
 *
 * A link here means "this tool computes part of what the capability names" — never that the
 * capability is implemented or accepted. Capabilities that build documents, discover or
 * research things, or are platform services have no catalog tool and stay unlinked; other parts
 * of the application may relate to them (see capabilities-202.md), but that is not asserted here.
 */
import { CANONICAL } from './canonicalList.mjs';
import { TOOLS, PRIMARY } from './catalog.mjs';
import { validationFor } from './validation.mjs';

/** Catalog tool → the canonical capabilities it computes part of. */
export const TOOL_TO_CANONICAL = {
  T01: [],
  T02: ['T-027'],
  T03: ['T-026'],
  T06: ['T-100', 'T-104'],
  T07: ['T-101', 'T-119'],
  T08: ['T-010'],
  T09: ['T-043', 'T-102'],
  T10: ['T-009'],
  T11: ['T-007'],
  T12: ['T-097', 'T-099'],
  T13: ['T-160'],
  T15: ['T-161'],
  T17: ['T-028'],
  T19: ['T-012', 'T-188'],
  T21: ['T-018', 'T-019'],
  T22: ['T-013', 'T-021', 'T-023'],
  T23: ['T-015'],
  T24: ['T-016'],
  T25: ['T-031'],
  T27: ['T-020'],
  T28: ['T-030'],
  T29: ['T-032'],
  T30: ['T-162'],
  T33: ['T-112', 'T-135'],
  T40: ['T-065'],
  T41: ['T-066'],
  T42: ['T-070'],
  T46: ['T-161'],
  T48: ['T-080'],
  T50: ['T-174'],
  T51: ['T-033'],
  T53: ['T-039'],
  T54: ['T-039', 'T-148'],
  T55: ['T-004', 'T-146'],
  T56: ['T-001'],
  T63: ['T-003'],
};

/** The full crosswalk. `agentCallers` maps tool id → agent ids allowed to run it. */
export function traceability(agentCallers = {}) {
  const byCanonical = new Map(CANONICAL.map((c) => [c.id, []]));
  for (const [toolId, ids] of Object.entries(TOOL_TO_CANONICAL))
    for (const id of ids) byCanonical.get(id).push(toolId);
  return CANONICAL.map((c) => {
    const tools = byCanonical.get(c.id).map((toolId) => ({
      toolId,
      code: PRIMARY[toolId],
      name: TOOLS[toolId].name,
      relation: 'partial',
      schema: TOOLS[toolId].engine === 'existing' ? TOOLS[toolId].kind : TOOLS[toolId].engine,
      callers: [
        'ui',
        'workflow:capability.run',
        ...(agentCallers[toolId] ?? []).map((a) => `agent:${a}`),
      ],
      validation: validationFor(toolId),
    }));
    return {
      ...c,
      tools,
      // No capability has an acceptance pack yet; a partial tool link is not acceptance.
      acceptance: 'not established',
      gap: tools.length
        ? 'Catalog tools compute part of this capability; its full scope and acceptance criteria are not implemented or tested.'
        : 'No catalog tool computes this capability.',
    };
  });
}

export function traceabilitySummary(rows) {
  return {
    canonical: rows.length,
    withPartialTool: rows.filter((r) => r.tools.length).length,
    withoutTool: rows.filter((r) => !r.tools.length).length,
    accepted: rows.filter((r) => r.acceptance === 'accepted').length,
    toolsUnlinked: Object.keys(TOOLS).filter((t) => !(TOOL_TO_CANONICAL[t] ?? []).length),
  };
}
