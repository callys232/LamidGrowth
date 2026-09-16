import { randomUUID, createHmac } from 'node:crypto';
import { createApp } from '../src/app/app.mjs';
const key = 'ab'.repeat(32);
const sign = text => createHmac('sha256', Buffer.from(key, 'hex')).update(text).digest('hex');
const instance = await createApp({ filename: ':memory:', aiProvider: null, mailProvider: null, securityKey: key, publicOrigin: 'https://test.example', welcomeIpVelocityLimit: 3 });
const server = instance.app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
let failures = 0;
try {
  for (let round = 1; round <= 3; round++) {
    const ip = sign(`round-${round}`), challenges = [];
    await instance.store.transaction(async () => {
      // Two earlier claims: exactly one welcome slot remains for this network.
      for (let i = 0; i < 2; i++) await instance.store.db.prepare("INSERT INTO welcome_claims VALUES (?,?,?,?,'granted','fixture prior claim',?)").run(randomUUID(), sign(randomUUID()), sign(randomUUID()), ip, Date.now());
      for (let i = 0; i < 3; i++) {
        const user = randomUUID(), workspace = randomUUID(), challenge = randomUUID(), code = '123456';
        await instance.store.db.prepare('INSERT INTO users (id,email,name,created_at) VALUES (?,?,?,?)').run(user, `${user}@example.test`, 'Reward fixture', new Date().toISOString());
        await instance.store.db.prepare('INSERT INTO workspaces (id,user_id,name,context) VALUES (?,?,?,?)').run(workspace, user, 'Reward fixture', 'Founder');
        await instance.store.db.prepare('INSERT INTO signup_signals VALUES (?,?,?,?,?)').run(user, sign(user), sign(randomUUID()), ip, Date.now());
        await instance.store.db.prepare("INSERT INTO otp_challenges VALUES (?,?,'verification',?,0,?,NULL,?)").run(challenge, user, sign(`${challenge}:${code}`), Date.now() + 120000, Date.now());
        challenges.push({ challengeId: challenge, code });
      }
    });
    const results = await Promise.all(challenges.map(async body => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
      return { status: response.status, data: await response.json() };
    }));
    const granted = Number((await instance.store.db.prepare("SELECT COUNT(*) AS n FROM welcome_claims WHERE ip_hash = ? AND status = 'granted'").get(ip)).n);
    const passed = granted <= 3 && results.every(r => r.status === 200);
    if (!passed) failures++;
    console.log(JSON.stringify({ round, priorClaims: 2, concurrentVerifications: 3, allowedTotal: 3, actualGrantedTotal: granted, results, passed }));
  }
} finally { await new Promise(resolve => server.close(resolve)); await instance.store.dropSchema(); }
console.log(JSON.stringify({ rounds: 3, failures, scope: 'Real OTP HTTP endpoint; synthetic signup fixtures in an isolated test schema; no email sent' }));
process.exitCode = failures ? 1 : 0;
