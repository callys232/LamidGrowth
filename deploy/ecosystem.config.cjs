// PM2 process definition for the API server. Run `pm2 start deploy/ecosystem.config.cjs`
// from the repo root.
//
// exec_mode is deliberately 'fork' with a single instance: server/index.mjs already manages
// its own multi-core scaling internally (node:cluster, see the top of that file). Running it
// under PM2's own cluster mode as well would multiply worker processes (PM2 instances x this
// app's own fork count) and blow through the Postgres connection pool budget, which is sized
// assuming only one cluster primary. PM2's job here is process supervision (restart on crash,
// restart on server reboot) — not horizontal scaling.
module.exports = {
  apps: [
    {
      name: 'lamid-api',
      script: 'server/index.mjs',
      args: '--production',
      cwd: __dirname + '/..',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      // Secrets live in .env (loaded by server/index.mjs itself via process.loadEnvFile) —
      // never duplicated here, since `pm2 save` would otherwise write them to disk again in
      // PM2's own dump file.
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
