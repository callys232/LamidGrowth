const stopWords = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are',
  'we', 'you', 'our', 'your', 'this', 'that', 'be', 'will', 'can', 'at', 'as', 'by',
]);

export const wordSet = (input) =>
  new Set(
    input
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !stopWords.has(word)),
  );

export function scoreBid(job, bid) {
  const budgetFit =
    bid.proposed_amount >= job.budget_min && bid.proposed_amount <= job.budget_max
      ? 40
      : Math.max(
          0,
          40 -
            (Math.min(
              Math.abs(bid.proposed_amount - job.budget_min),
              Math.abs(bid.proposed_amount - job.budget_max),
            ) /
              Math.max(job.budget_max, 1)) *
              40,
        );
  const currencyMatch = bid.currency === job.currency ? 10 : 0;
  const jobWords = wordSet(`${job.description} ${job.deliverables}`);
  const bidWords = wordSet(bid.cover_letter);
  const overlap = [...bidWords].filter((word) => jobWords.has(word)).length;
  const relevance =
    jobWords.size === 0 ? 0 : Math.min(30, Math.round((overlap / jobWords.size) * 30 * 4));
  const timelineWords = wordSet(job.timeline);
  const bidTimelineWords = wordSet(bid.timeline);
  const timelineOverlap = [...bidTimelineWords].some((word) => timelineWords.has(word));
  const timeline =
    timelineWords.size === 0 || bidTimelineWords.size === 0 ? 10 : timelineOverlap ? 20 : 10;
  const total = Math.round(budgetFit + currencyMatch + relevance + timeline);
  return {
    total,
    breakdown: { budgetFit: Math.round(budgetFit), currencyMatch, relevance, timeline },
  };
}
