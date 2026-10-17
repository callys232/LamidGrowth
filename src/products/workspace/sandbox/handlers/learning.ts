import { ApiError } from '../../../../api';
import type { SandboxRoute } from '../router';
import type { SandboxData } from '../types';

function fail(message: string, status = 400): never {
  throw new ApiError(message, status);
}
const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
function input(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    fail('Enter valid learning details.');
  return body as Record<string, unknown>;
}
function text(value: unknown, name: string, max: number, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()))
    fail(`${name} is required and must be at most ${max} characters.`);
  return (value as string).trim();
}
function number(value: unknown, name: string, max: number, integer = false, min = 0) {
  if (value == null) return null;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    fail(`${name} must be ${integer ? 'an integer' : 'a number'} between ${min} and ${max}.`);
  return value as number;
}
function learning(data: SandboxData) {
  if (data.learning) return data.learning;
  const domain = data.talentProfile?.domains[0] ?? data.state.workspace.context;
  const paths = [
    {
      title: 'Decision quality foundations',
      description: 'Frame decisions, weigh alternatives and record what you will learn.',
      hours: 3,
    },
    {
      title: `${domain} delivery essentials`,
      description: 'Scope work into milestones, agree acceptance criteria and review delivery.',
      hours: 5,
    },
    {
      title: 'Running a weekly operating rhythm',
      description: 'Reviews, priorities and follow-through that keep important work moving.',
      hours: 2,
    },
  ].map((path, i) => ({
    id: `demo-path-${i}`,
    title: path.title,
    description: path.description,
    domain,
    function: null,
    industry: null,
    estimated_hours: path.hours,
    points_cost: null,
    language: 'en',
    coach_user_id: null,
    created_by: null,
    modules: ['Read', 'Practise', 'Check'].map((step, m) => ({
      id: `demo-path-${i}-module-${m}`,
      path_id: `demo-path-${i}`,
      title: `${step}: ${path.title.toLowerCase()}`,
      description: path.description,
      format: (['reading', 'exercise', 'assessment'] as const)[m],
      order_index: m,
      estimated_minutes: 20 + m * 10,
      content_url: null,
      quiz_skill: null,
    })),
    prerequisites: [],
    feedback: { count: 0, average: null },
  }));
  data.learning = {
    paths,
    enrollments: [
      {
        id: 'demo-enrollment-0',
        path_id: paths[0].id,
        path_title: paths[0].title,
        user_id: data.state.user.id,
        status: 'in_progress',
        progress: 33,
        assigned_by: null,
        due_at: null,
        completed_at: null,
      },
    ],
    completions: { 'demo-path-0-module-0': { score: null, graded: false } },
    feedback: {},
    certificates: {},
  };
  return data.learning;
}
function pathFor(data: SandboxData, pathId: string) {
  return (
    learning(data).paths.find((path) => path.id === pathId) ?? fail('Learning path not found.', 404)
  );
}

export const learningRoutes: SandboxRoute[] = [
  {
    method: 'GET',
    pattern: '/learning/paths',
    handler: ({ store, query }) => {
      const data = store.read();
      return learning(data).paths.filter((path) =>
        ['domain', 'function', 'industry'].every(
          (key) =>
            !query.get(key) || path[key as 'domain' | 'function' | 'industry'] === query.get(key),
        ),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/learning/enrollments/mine',
    handler: ({ store }) => learning(store.read()).enrollments,
  },
  {
    method: 'GET',
    pattern: '/learning/completions/mine',
    handler: ({ store }) => Object.keys(learning(store.read()).completions),
  },
  {
    method: 'GET',
    pattern: '/learning/certificates/mine',
    handler: ({ store }) => Object.values(learning(store.read()).certificates),
  },
  { method: 'GET', pattern: '/learning/compliance/mine', handler: () => [] },
  {
    method: 'GET',
    pattern: '/learning/enrollments/attention',
    handler: () => ({ needsYou: [], stalled: [] }),
  },
  {
    method: 'POST',
    pattern: '/learning/paths',
    handler: ({ store, body }) => {
      const data = store.read(),
        state = learning(data),
        value = input(body);
      const path = {
        id: id(),
        title: text(value.title, 'Title', 200, true),
        description: text(value.description, 'Description', 4000),
        domain: text(value.domain, 'Domain', 200) || null,
        function: null,
        industry: null,
        estimated_hours: number(
          value.estimatedHours,
          'Estimated hours',
          1000,
          false,
          Number.MIN_VALUE,
        ),
        points_cost: number(value.pointsCost, 'Points cost', Number.MAX_SAFE_INTEGER, true),
        language: 'en',
        coach_user_id: null,
        created_by: data.state.user.id,
        modules: [],
        prerequisites: [],
        feedback: { count: 0, average: null },
      };
      state.paths.unshift(path);
      store.write(data);
      return path;
    },
  },
  {
    method: 'POST',
    pattern: '/learning/paths/:id/modules',
    handler: ({ store, body, params }) => {
      const data = store.read(),
        path = pathFor(data, params.id),
        value = input(body);
      if (path.created_by !== data.state.user.id)
        fail('Only the path author can add modules.', 403);
      if (learning(data).enrollments.some((row) => row.path_id === path.id))
        fail('Add modules before enrolling in this demo path.', 409);
      const format = value.format ?? 'reading';
      if (!['reading', 'video', 'exercise', 'assessment'].includes(String(format)))
        fail('Choose a valid module format.');
      const module = {
        id: id(),
        path_id: path.id,
        title: text(value.title, 'Title', 200, true),
        description: text(value.description, 'Description', 4000),
        format: format as 'reading' | 'video' | 'exercise' | 'assessment',
        order_index: path.modules.length,
        estimated_minutes: number(value.estimatedMinutes, 'Estimated minutes', 10000, true, 1),
        content_url: null,
        quiz_skill: null,
      };
      path.modules.push(module);
      store.write(data);
      return module;
    },
  },
  {
    method: 'POST',
    pattern: '/learning/paths/:id/enroll',
    handler: ({ store, params }) => {
      const data = store.read(),
        state = learning(data),
        path = pathFor(data, params.id);
      if (state.enrollments.some((row) => row.path_id === path.id))
        fail('Already enrolled in this path.');
      if (!path.modules.length) fail('Add at least one module before enrolling.');
      const row = {
        id: id(),
        path_id: path.id,
        path_title: path.title,
        user_id: data.state.user.id,
        status: 'in_progress' as const,
        progress: 0,
        assigned_by: null,
        due_at: null,
        completed_at: null,
      };
      state.enrollments.unshift(row);
      store.write(data);
      return row;
    },
  },
  {
    method: 'POST',
    pattern: '/learning/modules/:id/complete',
    handler: ({ store, body, params }) => {
      const data = store.read(),
        state = learning(data),
        value = input(body);
      const path = state.paths.find((path) =>
        path.modules.some((module) => module.id === params.id),
      );
      if (!path) fail('Module not found.', 404);
      const module = path.modules.find((module) => module.id === params.id)!;
      const row = state.enrollments.find((row) => row.path_id === path.id);
      if (!row) fail('Enroll in this path before completing its modules.');
      if (state.completions[module.id]) fail('This module is already completed.');
      const score = number(value.score, 'Score', 100, true);
      if (module.format === 'assessment' && score === null)
        fail('An assessment module requires a score.');
      state.completions[module.id] = { score, graded: false };
      const completed = path.modules.filter((module) => state.completions[module.id]).length;
      row.progress = Math.round((completed / path.modules.length) * 100);
      row.status = completed === path.modules.length ? 'completed' : 'in_progress';
      row.completed_at = row.status === 'completed' ? now() : null;
      store.write(data);
      return row;
    },
  },
  {
    method: 'POST',
    pattern: '/learning/enrollments/:id/certificate',
    handler: ({ store, params }) => {
      const data = store.read(),
        state = learning(data),
        row = state.enrollments.find((row) => row.id === params.id);
      if (!row) fail('Enrollment not found.', 404);
      if (row.status !== 'completed') fail('Complete the path before issuing a certificate.');
      if (state.certificates[row.id])
        fail('A certificate has already been issued for this enrollment.');
      const certificate = { id: id(), enrollment_id: row.id, demo: true as const };
      state.certificates[row.id] = certificate;
      store.write(data);
      return certificate;
    },
  },
  {
    method: 'POST',
    pattern: '/learning/paths/:id/feedback',
    handler: ({ store, body, params }) => {
      const data = store.read(),
        state = learning(data),
        path = pathFor(data, params.id),
        value = input(body);
      if (!state.enrollments.some((row) => row.path_id === path.id && row.status === 'completed'))
        fail('Complete this path before leaving feedback.');
      const rating = number(value.rating, 'Rating', 5, true, 1);
      if (rating === null) fail('Choose a rating.');
      state.feedback[path.id] = { rating, comment: text(value.comment, 'Comment', 2000) };
      path.feedback = { count: 1, average: rating };
      store.write(data);
      return { ok: true };
    },
  },
];
