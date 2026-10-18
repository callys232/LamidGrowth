export const REVIEW_FUNDING_STATES = [
  'awaiting_provider',
  'pending',
  'amount_mismatch',
  'reconciliation_required',
  'refund_unknown',
  'refund_failed',
  'refund_pending',
  'refunding',
];
export const REVIEW_TRANSFER_STATES = [
  'pending',
  'processing',
  'unknown',
  'amount_mismatch',
  'reversed',
  'failed',
];

export function providerAmountMatches(event, expectedAmountMinor, expectedCurrency) {
  const reportedAmount = Number(event.data?.amount);
  const reportedCurrency = String(event.data?.currency || '').toUpperCase();
  return (
    Number.isFinite(reportedAmount) &&
    reportedAmount === expectedAmountMinor &&
    reportedCurrency === String(expectedCurrency || '').toUpperCase()
  );
}
