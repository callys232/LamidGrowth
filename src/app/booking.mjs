import { randomUUID } from 'node:crypto';
import { z } from 'zod';

const FORMATS = ['advisory_session', 'workshop', 'fractional_block'];

const slotSchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    format: z.enum(FORMATS).default('advisory_session'),
  })
  .strict();
const bookSchema = z
  .object({
    projectId: z.string().uuid().nullish(),
    notes: z.string().trim().max(1000).default(''),
  })
  .strict();

const fail = (message, status) => {
  throw Object.assign(new Error(message), { status });
};

export function mountBooking(app, store) {
  const { db, transaction, log } = store;

  async function ownProfile(userId) {
    const profile = await db.prepare('SELECT * FROM talent_profiles WHERE user_id = ?').get(userId);
    if (!profile) fail('Create your expert profile before publishing availability.', 400);
    return profile;
  }

  app.post('/api/booking/availability', async (req, res) => {
    const profile = await ownProfile(req.user.id);
    const input = slotSchema.parse(req.body);
    if (new Date(input.endAt) <= new Date(input.startAt))
      return res.status(400).json({ error: 'End time must be after start time.' });
    const id = randomUUID();
    await db
      .prepare('INSERT INTO availability_slots VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(
        id,
        profile.id,
        input.startAt,
        input.endAt,
        input.format,
        'open',
        new Date().toISOString(),
      );
    res.status(201).json(await db.prepare('SELECT * FROM availability_slots WHERE id = ?').get(id));
  });

  app.get('/api/booking/availability/mine', async (req, res) => {
    const profile = await ownProfile(req.user.id);
    res.json(
      await db
        .prepare('SELECT * FROM availability_slots WHERE profile_id = ? ORDER BY start_at')
        .all(profile.id),
    );
  });

  app.delete('/api/booking/availability/:id', async (req, res) => {
    const profile = await ownProfile(req.user.id);
    const slot = await db
      .prepare('SELECT * FROM availability_slots WHERE id = ?')
      .get(req.params.id);
    if (!slot || slot.profile_id !== profile.id)
      return res.status(404).json({ error: 'Slot not found.' });
    if (slot.status === 'booked')
      return res
        .status(400)
        .json({ error: 'A booked slot cannot be removed. Cancel the booking first.' });
    await db.prepare('DELETE FROM availability_slots WHERE id = ?').run(req.params.id);
    res.status(204).end();
  });

  app.get('/api/booking/availability/:expertUserId', async (req, res) => {
    const profile = await db
      .prepare('SELECT id FROM talent_profiles WHERE user_id = ?')
      .get(req.params.expertUserId);
    if (!profile) return res.json([]);
    res.json(
      await db
        .prepare(
          "SELECT * FROM availability_slots WHERE profile_id = ? AND status = 'open' AND start_at > ? ORDER BY start_at",
        )
        .all(profile.id, new Date().toISOString()),
    );
  });

  app.post('/api/booking/slots/:slotId/book', async (req, res) => {
    const slot = await db
      .prepare('SELECT * FROM availability_slots WHERE id = ?')
      .get(req.params.slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found.' });
    if (slot.status !== 'open')
      return res.status(400).json({ error: 'This slot is no longer available.' });
    const expertProfile = await db
      .prepare('SELECT user_id FROM talent_profiles WHERE id = ?')
      .get(slot.profile_id);
    if (expertProfile.user_id === req.user.id)
      return res.status(400).json({ error: 'You cannot book your own availability.' });
    const input = bookSchema.parse(req.body ?? {});
    // F-EX-04: projectId was previously accepted without proving the caller is actually a party
    // to that project — anyone could tag a booking onto someone else's project.
    if (input.projectId) {
      const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(input.projectId);
      if (!project) return res.status(404).json({ error: 'Project not found.' });
      const job = await db.prepare('SELECT client_user_id FROM job_posts WHERE id = ?').get(project.job_id);
      const isParty = (job && job.client_user_id === req.user.id) || project.freelancer_user_id === req.user.id;
      if (!isParty) return res.status(403).json({ error: 'You are not a party to this project.' });
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    let claimed;
    await transaction(async () => {
      // F-EX-04: the claim is this atomic UPDATE itself (guarded by status = 'open'), not the
      // preceding SELECT above — two concurrent bookings could otherwise both pass that read and
      // both insert a booking row for the same slot. A losing concurrent request affects no rows
      // and is rejected below instead of double-booking the expert.
      claimed = await db
        .prepare("UPDATE availability_slots SET status = 'booked' WHERE id = ? AND status = 'open'")
        .run(slot.id);
      if (claimed.changes === 0) return;
      await db
        .prepare('INSERT INTO bookings VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          id,
          slot.id,
          req.user.id,
          expertProfile.user_id,
          input.projectId ?? null,
          'confirmed',
          input.notes,
          now,
        );
      await log(req.workspace.id, req.user.name, 'Booked availability slot', id, slot.start_at);
    });
    if (claimed.changes === 0)
      return res.status(409).json({ error: 'This slot was just booked by someone else.' });
    res.status(201).json(await db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
  });

  app.get('/api/booking/mine', async (req, res) => {
    res.json(
      await db
        .prepare(
          `SELECT b.*, s.start_at, s.end_at, s.format FROM bookings b
           JOIN availability_slots s ON s.id = b.slot_id
           WHERE b.client_user_id = ? OR b.expert_user_id = ? ORDER BY s.start_at`,
        )
        .all(req.user.id, req.user.id),
    );
  });

  app.patch('/api/booking/:id/cancel', async (req, res) => {
    const booking = await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.client_user_id !== req.user.id && booking.expert_user_id !== req.user.id)
      return res.status(403).json({ error: 'You are not part of this booking.' });
    if (booking.status !== 'confirmed')
      return res.status(400).json({ error: 'This booking is not active.' });
    await transaction(async () => {
      await db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(booking.id);
      await db
        .prepare("UPDATE availability_slots SET status = 'open' WHERE id = ?")
        .run(booking.slot_id);
    });
    res.json(await db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
  });
}
