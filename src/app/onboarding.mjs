/** Mounted after session authentication. Only new signups receive an onboarding row. */
export function mountUserGuideOnboarding(app, store) {
  app.post('/api/onboarding/user-guide/claim', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.user.demo) return res.json({ showGuide: false });
    // One atomic claim across tabs/devices; existing users and unverified accounts are excluded.
    const claimed = await store.db
      .prepare(
        `UPDATE user_guide_onboarding SET first_shown_at = ?
      WHERE user_id = ? AND first_shown_at IS NULL AND EXISTS
      (SELECT 1 FROM users WHERE id = ? AND demo = 0 AND verified_at IS NOT NULL AND disabled_at IS NULL)
      RETURNING user_id`,
      )
      .get(Date.now(), req.user.id, req.user.id);
    res.json({ showGuide: Boolean(claimed) });
  });
}
