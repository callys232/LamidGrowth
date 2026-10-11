import { ApiError } from '../../../../api';
import type { JobWatch, WatchMatch } from '../../../talent/talentTypes';
import { JOB_CATEGORIES } from '../jobTaxonomy';
import type { SandboxRoute } from '../router';
import type { SandboxData } from '../types';

const watchFor = (data: SandboxData, id: string) => {
  const watch = data.watches.find((w) => w.id === id);
  if (!watch) throw new ApiError('Job watch not found.', 404);
  return watch;
};
/** The open marketplace jobs a saved search covers (expertWatches.mjs scan rule). */
const watchedJobs = (data: SandboxData, watch: JobWatch) => {
  const keywords = watch.keywords.toLowerCase();
  return data.marketplace.filter(
    (job) =>
      watch.categories.includes(job.category) ||
      (keywords !== '' && `${job.title} ${job.description}`.toLowerCase().includes(keywords)),
  );
};

/** Job search, bids, saved searches, reputation and bid screening, in the server's shapes. */
export const talentRoutes: SandboxRoute[] = [
  {
    method: 'GET',
    pattern: '/marketplace/jobs',
    handler: ({ store, query }) => {
      const q = (query.get('q') ?? '').trim().toLowerCase();
      return store
        .read()
        .marketplace.filter((job) => `${job.title} ${job.category}`.toLowerCase().includes(q));
    },
  },
  { method: 'GET', pattern: '/bids/mine', handler: ({ store }) => store.read().bids },
  {
    method: 'GET',
    pattern: '/talent/credentials/mine',
    handler: ({ store }) => store.read().credentials,
  },
  // Lists the sample workspace keeps empty: invitations, availability, bookings, teams, reviews.
  { method: 'GET', pattern: '/talent/invitations/mine', handler: () => [] },
  { method: 'GET', pattern: '/booking/availability/mine', handler: () => [] },
  { method: 'GET', pattern: '/booking/mine', handler: () => [] },
  { method: 'GET', pattern: '/expert-teams/mine', handler: () => [] },
  { method: 'GET', pattern: '/review-queue', handler: () => [] },
  { method: 'GET', pattern: '/handoffs/inbox', handler: () => [] },
  { method: 'GET', pattern: '/talent/watches', handler: ({ store }) => store.read().watches },
  {
    method: 'POST',
    pattern: '/talent/watches',
    handler: ({ store, body }) => {
      const input = (body ?? {}) as { categories?: string[]; keywords?: string };
      const categories = (input.categories ?? []).filter((c) =>
        (JOB_CATEGORIES as readonly string[]).includes(c),
      );
      const keywords = (input.keywords ?? '').trim().slice(0, 500);
      if (!categories.length && !keywords)
        throw new ApiError(
          'A watch needs at least one category or a keyword to match against.',
          400,
        );
      const data = store.read();
      const watch: JobWatch = {
        id: `demo-watch-${crypto.randomUUID()}`,
        categories,
        keywords,
        createdAt: new Date().toISOString(),
      };
      data.watches.unshift(watch);
      data.watchMatches[watch.id] = [];
      store.write(data);
      return watch;
    },
  },
  {
    method: 'DELETE',
    pattern: '/talent/watches/:id',
    handler: ({ store, params }) => {
      const data = store.read();
      watchFor(data, params.id);
      data.watches = data.watches.filter((w) => w.id !== params.id);
      delete data.watchMatches[params.id];
      store.write(data);
      return undefined;
    },
  },
  {
    method: 'POST',
    pattern: '/talent/watches/:id/scan',
    handler: ({ store, params }) => {
      const data = store.read();
      const watch = watchFor(data, params.id);
      const known = new Set((data.watchMatches[watch.id] ?? []).map((m) => m.jobId));
      const fresh: WatchMatch[] = watchedJobs(data, watch)
        .filter((job) => !known.has(job.id))
        .map((job) => ({
          id: `demo-watch-match-${crypto.randomUUID()}`,
          jobId: job.id,
          title: job.title,
          category: job.category,
          budgetMin: job.budget_min,
          budgetMax: job.budget_max,
          currency: job.currency,
          matchedAt: new Date().toISOString(),
          seen: false,
        }));
      data.watchMatches[watch.id] = [...fresh, ...(data.watchMatches[watch.id] ?? [])];
      store.write(data);
      return {
        newMatches: fresh.map((m) => ({
          id: m.id,
          jobId: m.jobId,
          title: m.title,
          category: m.category,
        })),
      };
    },
  },
  {
    method: 'GET',
    pattern: '/talent/watches/:id/matches',
    handler: ({ store, params }) => {
      const data = store.read();
      return data.watchMatches[watchFor(data, params.id).id] ?? [];
    },
  },
  {
    method: 'GET',
    pattern: '/talent/:userId/reputation',
    handler: ({ store, params }) =>
      store.read().reputation[params.userId] ?? {
        userId: params.userId,
        reviewCount: 0,
        averageRating: null,
        completedMilestones: 0,
      },
  },
  {
    method: 'GET',
    pattern: '/jobs/:id/bids',
    // Bids received on a posted job, in GET /api/jobs/:id/bids row shape (owner only).
    handler: ({ store, params }) => {
      const data = store.read();
      const job = data.jobs.find((j) => j.id === params.id);
      if (!job) throw new ApiError('Only the job owner can review bids.', 403);
      return (data.screening[job.id] ?? []).map((result) => ({
        id: result.bidId,
        job_id: job.id,
        freelancer_user_id: result.freelancerUserId,
        cover_letter: 'Available to start this week; I have delivered similar work recently.',
        proposed_amount: Math.round((job.budget_min + job.budget_max) / 2),
        currency: job.currency,
        timeline: job.timeline,
        status: 'submitted',
      }));
    },
  },
  { method: 'GET', pattern: '/jobs/:id/proposals', handler: () => [] },
  {
    method: 'GET',
    pattern: '/jobs/:id/screening',
    handler: ({ store, params }) => {
      const data = store.read();
      if (!data.jobs.some((job) => job.id === params.id))
        throw new ApiError('Only the job owner can view candidate screening.', 403);
      return data.screening[params.id] ?? [];
    },
  },
];
