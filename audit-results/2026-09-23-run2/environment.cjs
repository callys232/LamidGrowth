const { existsSync } = require('node:fs');
if (existsSync('.env')) process.loadEnvFile('.env');
process.env.TEST_DATABASE_URL = 'postgresql://lamid_test:local_audit_only@127.0.0.1:55434/lamid_test?sslmode=disable';
for (const name of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'PAYSTACK_SECRET_KEY', 'RESEND_API_KEY', 'SENDGRID_API_KEY']) {
  process.env[name] = '';
}
