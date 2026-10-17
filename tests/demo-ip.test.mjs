import test from 'node:test';
import assert from 'node:assert/strict';
import { demoIpHash } from '../src/app/demoAccess.mjs';

test('demo IP claims normalize IPv4, mapped IPv6, and IPv6 spelling', () => {
  const key = Buffer.alloc(32, 1);
  const ipv4 = demoIpHash('192.0.2.10', key);
  assert.equal(ipv4, demoIpHash('::ffff:192.0.2.10', key));
  assert.equal(ipv4, demoIpHash('::ffff:c000:20a', key));
  assert.equal(demoIpHash('2001:db8::1', key), demoIpHash('2001:0db8:0:0:0:0:0:1', key));
  assert.notEqual(ipv4, demoIpHash('192.0.2.11', key));
  assert.notEqual(ipv4, demoIpHash('192.0.2.10', Buffer.alloc(32, 2)));
  assert.match(ipv4, /^[a-f0-9]{64}$/);
  assert.throws(() => demoIpHash('', key));
});
