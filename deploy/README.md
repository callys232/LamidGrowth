# Deploying the API to a VPS

The frontend is built and hosted on Vercel from this same repo. This backend (Express +
Postgres) runs separately, as a persistent process — Vercel does not run it.

## One-time server setup

As root on a fresh AlmaLinux / Rocky / CentOS Stream box:

```
curl -fsSL https://raw.githubusercontent.com/callys232/LamidGrowth/main/deploy/setup-vps.sh | bash
```

Or copy `deploy/setup-vps.sh` over and run it directly. It installs Node 22, nginx, PM2,
certbot, opens the firewall, and creates a non-root `lamid` app user. It prints the exact
next commands when it finishes.

## `.env` on the VPS

Create `~/app/.env` (as the `lamid` user) by hand over SSH — never paste secrets into a chat
tool. Required/relevant keys:

| Key | Notes |
|---|---|
| `DATABASE_URL` | Postgres connection string (Supabase) |
| `ACCOUNT_SECURITY_KEY` | 32 random bytes, hex-encoded (64 hex chars) |
| `PUBLIC_ORIGIN` | This API's own public HTTPS origin: `https://api.lamidconsulting.com` |
| `FRONTEND_ORIGINS` | The Vercel frontend's origin(s), comma-separated: `https://lamidconsultingcom.vercel.app,https://lamidconsulting.com` — enables the cross-origin allowlist (see `src/app/app.mjs`) |
| `PAYSTACK_SECRET_KEY` | Live secret key |
| `RESEND_API_KEY` | or `SENDGRID_API_KEY` |
| `MAIL_FROM` | Sender address |
| `TRUST_PROXY_HOPS` | Set to `1` — nginx sits in front of the app, so this makes `req.ip` reflect the real client IP instead of nginx's, which matters for per-IP rate limiting |
| `PORT` | Optional, defaults to `3000` |
| `CLUSTER` | Optional, defaults to `true` in production (the app forks its own workers — see `server/index.mjs`) |
| `PG_POOL_MAX` | Optional, total Postgres connections across all workers combined — mind Supabase's pooler cap |
| `ECOSYSTEM_ADMIN_EMAILS` | Comma-separated admin emails |
| `ENTERPRISE_MEMBER_LIMIT` | Optional |

Generate `ACCOUNT_SECURITY_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## First deploy

```
sudo su - lamid
git clone https://github.com/callys232/LamidGrowth.git app
cd app
npm ci
nano .env                          # fill in the table above
npm run build
pm2 start deploy/ecosystem.config.cjs
pm2 save
```

Then, as root, wire up nginx + SSL:

```
cp ~lamid/app/deploy/nginx-api.conf /etc/nginx/conf.d/api.conf
nginx -t && systemctl reload nginx
certbot --nginx -d api.lamidconsulting.com
```

Point DNS: add an A record for `api.lamidconsulting.com` -> this VPS's IP address, before
running certbot (it validates ownership over HTTP).

Enable PM2 on boot:

```
su - lamid -c 'pm2 startup' | tail -1   # copy the printed "sudo env PATH=... pm2 startup ..." line
# run that exact copied command as root
su - lamid -c 'pm2 save'
```

## Redeploying after future changes

```
sudo su - lamid
cd app
./deploy/deploy.sh
```

## Frontend side (Vercel)

Set these in the Vercel project's environment variables, then redeploy:

- `VITE_API_BASE_URL` = `https://api.lamidconsulting.com` (no trailing slash)

That's the only frontend change needed — `src/api.ts` already switches to
`credentials: 'include'` automatically whenever this is set.

## Verifying it's live

```
curl https://api.lamidconsulting.com/api/health
```

Should return `{"status":"ok"}`. Then load the Vercel frontend and confirm sign-in/purchases
work end to end (check the browser network tab for any CORS or cookie errors on first try).
