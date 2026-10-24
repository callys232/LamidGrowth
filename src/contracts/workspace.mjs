import { z } from 'zod';

const text = z.string().trim().min(1).max(500);
const longText = z.string().trim().max(5000).default('');
export const workspaceContextSchema = z.enum([
  'Individual',
  'Professional',
  'Creator',
  'Founder',
  'Team',
  'SME',
  'Enterprise',
  'Institution',
]);
const dateSchema = z
  .string()
  .refine(
    (value) =>
      value === '' ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
    'Enter a valid date',
  );

export const objectiveSchema = z
  .object({
    title: text,
    description: longText,
    context: workspaceContextSchema,
    priority: z.enum(['High', 'Medium', 'Low']),
    status: z.enum(['Active', 'Paused', 'Complete']).default('Active'),
    targetDate: dateSchema.default(''),
    constraints: longText,
    success: longText,
  })
  .strict();

export const actionSchema = z
  .object({
    title: text,
    objectiveId: z.string().uuid(),
    status: z.enum(['Planned', 'In progress', 'Needs review', 'Done', 'Paused']).default('Planned'),
    dueDate: dateSchema.default(''),
    owner: text,
    requiresApproval: z.boolean().default(false),
    notes: longText,
  })
  .strict();

export const reviewSchema = z.object({ progressed: text, learned: longText, next: text }).strict();

const objectiveResultSchema = objectiveSchema
  .extend({
    id: z.string(),
    version: z.number().int().positive(),
    createdAt: z.string(),
  })
  .passthrough();
const actionResultSchema = actionSchema
  .extend({
    id: z.string(),
    version: z.number().int().positive(),
    createdAt: z.string(),
    pathwayOrder: z.number().optional(),
  })
  .passthrough();
const reviewResultSchema = reviewSchema
  .extend({
    id: z.string(),
    createdAt: z.string(),
  })
  .passthrough();
const workspaceSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    context: workspaceContextSchema,
    tier: z.string(),
    member_limit: z.number(),
    role: z.enum(['owner', 'member', 'concierge']),
  })
  .passthrough();

export const workspaceStateSchema = z
  .object({
    user: z
      .object({
        id: z.string(),
        name: z.string(),
        email: z.string().nullable(),
        demo: z.boolean(),
        ecosystemAdmin: z.boolean().optional(),
      })
      .passthrough(),
    workspace: workspaceSchema,
    permissions: z.array(z.string()),
    workspaces: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          context: workspaceContextSchema,
          tier: z.string(),
          member_limit: z.number(),
          role: z.string(),
          status: z.string(),
        })
        .passthrough(),
    ),
    objectives: z.array(objectiveResultSchema),
    actions: z.array(actionResultSchema),
    reviews: z.array(reviewResultSchema),
    audit: z.array(
      z
        .object({
          id: z.string(),
          actor: z.string(),
          action: z.string(),
          objectId: z.string().nullable(),
          detail: z.string(),
          createdAt: z.string(),
        })
        .passthrough(),
    ),
  })
  .passthrough();
