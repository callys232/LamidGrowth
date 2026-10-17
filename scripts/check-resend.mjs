import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');
if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
  console.log('Resend API key or MAIL_FROM is missing from this environment.');
  process.exitCode = 1;
} else {
  console.log('Resend API key and sender are configured in this environment.');
  const sender = (process.env.MAIL_FROM.match(/<([^>]+)>/)?.[1] || process.env.MAIL_FROM).trim();
  const domain = sender.split('@')[1]?.toLowerCase();
  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.log(
        `Resend domain lookup returned HTTP ${response.status}. A sending-only key may lack permission to list domains; this does not establish whether sending works.`,
      );
      process.exitCode = 1;
    } else {
      const result = await response.json();
      const match = result.data?.find((entry) => entry.name?.toLowerCase() === domain);
      console.log(
        match
          ? `Configured sender domain status: ${match.status === 'verified' ? 'verified' : 'not verified'}.`
          : 'Configured sender domain was not found in the returned domain list; verification remains unconfirmed.',
      );
      if (match?.status !== 'verified') process.exitCode = 1;
    }
  } catch (error) {
    const code = error.cause?.code || error.name;
    console.log(
      `Resend lookup failed: ${/^[A-Za-z_0-9]+$/.test(code) ? code : 'connection failure'}.`,
    );
    process.exitCode = 1;
  }
  console.log('Read-only check: no email was sent and no provider settings were changed.');
}
