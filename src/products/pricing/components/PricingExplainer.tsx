export function PricingExplainer({
  unitPriceMinor,
  currency = 'USD',
}: {
  unitPriceMinor?: number;
  currency?: string;
}) {
  const format = (n: number) =>
    new Intl.NumberFormat('en', { style: 'currency', currency }).format(n / 100);
  return (
    <section className="panel settings-card" aria-labelledby="pricing-explained-title">
      <h2 id="pricing-explained-title">Understand access and usage before you pay</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">What you choose</th>
            <th scope="col">What it provides</th>
            <th scope="col">What to check</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Plan or tool access</th>
            <td>Permission to use the included tools in your workspace.</td>
            <td>Check the included tools and any recurring billing terms at checkout.</td>
          </tr>
          <tr>
            <th scope="row">Points</th>
            <td>
              A balance used by billable tool runs. Buying points alone does not unlock an excluded
              tool.
            </td>
            <td>
              The tool shows its points cost before submission. Repeat charged runs use more points.
            </td>
          </tr>
          <tr>
            <th scope="row">One-time tool bundle</th>
            <td>The listed tool access and included points, after payment is confirmed.</td>
            <td>
              No automatic renewal. Your points balance is shared by the tools you can access.
            </td>
          </tr>
          <tr>
            <th scope="row">Project funding</th>
            <td>A separate payment for a project milestone.</td>
            <td>
              Points do not pay contractors. Review the amount, currency, approval and refund terms
              separately.
            </td>
          </tr>
        </tbody>
      </table>
      {unitPriceMinor !== undefined && (
        <p style={{ color: '#4b5563' }}>
          <strong>Current points price:</strong> {format(unitPriceMinor)} per point. For example,
          100 points cost {format(100 * unitPriceMinor)}. A tool priced at 35 points would use 35 of
          those points for a charged run; this example is not a quote for every tool.
        </p>
      )}
      <p style={{ color: '#4b5563' }}>
        Check the checkout total and settlement currency before confirming. Access and points are
        added after confirmed payment. Demo runs use sample data and no real points.
      </p>
    </section>
  );
}
