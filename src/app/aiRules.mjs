import { z } from 'zod';

export const sourceKinds = [
  'objective',
  'action',
  'knowledge',
  'progress',
  'review',
  'notification',
  'job',
  'proposal',
  'submission',
];
export const changeModes = ['block', 'ask', 'allow'];
export const aiRulesSchema = z
  .object({
    pathways: z.boolean().default(true),
    reviews: z.boolean().default(true),
    specialists: z.boolean().default(true),
    documents: z.boolean().default(true),
    deliverableReviews: z.boolean().default(true),
    workflowCommands: z.boolean().default(true),
    humanHandoffs: z.boolean().default(true),
    allowedSources: z.array(z.enum(sourceKinds)).max(sourceKinds.length).default(sourceKinds),
    maxPointsPerRequest: z.number().int().min(0).max(10000).default(100),
    instructions: z.string().trim().max(2000).default(''),
    changes: z
      .object({
        'action.prepare': z.enum(changeModes).default('ask'),
        'progress.snapshot': z.enum(changeModes).default('ask'),
        'review.reminder': z.enum(changeModes).default('ask'),
      })
      .strict()
      .default({}),
  })
  .strict();

export function rulesFor(policy) {
  return aiRulesSchema.parse(policy?.rules || {});
}
export async function readAIRules(store, workspaceId) {
  const policy = (await store.records(workspaceId, 'ai_policy'))[0];
  return { ...policy, version: policy?.version || 0, rules: rulesFor(policy) };
}
export function enforceFeature(policy, feature, points = 0) {
  const rules = rulesFor(policy);
  if (rules[feature] !== true)
    throw Object.assign(
      new Error(`Your AI rules block ${feature}. Update AI Settings to allow it.`),
      { status: 403 },
    );
  if (points > rules.maxPointsPerRequest)
    throw Object.assign(
      new Error('This request exceeds your AI points limit. Update AI Settings to allow it.'),
      { status: 403 },
    );
  return rules;
}
export function scopeAIPayload(policy, payload, feature) {
  const rules = enforceFeature(policy, feature);
  const sources = payload.sources.filter((source) => rules.allowedSources.includes(source.kind));
  if (!sources.length)
    throw Object.assign(
      new Error('Your AI data rules do not allow any of the context needed for this request.'),
      { status: 403 },
    );
  return { ...payload, sources, planningPreferences: rules.instructions };
}
