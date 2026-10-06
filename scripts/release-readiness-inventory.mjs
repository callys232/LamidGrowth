import fs from 'node:fs';
import path from 'node:path';
import { TOOLS } from '../src/app/toolCatalog/catalog.mjs';
import { validationFor } from '../src/app/toolCatalog/validation.mjs';

const output = 'audit-results/release-readiness-2026-10-06';
const envText = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
// Retain only presence booleans; never print or persist configuration values.
const configKeys = ['DATABASE_URL', 'TEST_DATABASE_URL', 'ACCOUNT_SECURITY_KEY', 'PUBLIC_ORIGIN', 'FRONTEND_ORIGINS', 'TRUST_PROXY_HOPS', 'RESEND_API_KEY', 'SENDGRID_API_KEY', 'MAIL_FROM', 'OPENAI_API_KEY', 'OPENAI_MODEL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'PAYSTACK_SECRET_KEY', 'ECOSYSTEM_ADMIN_EMAILS', 'PG_POOL_MAX', 'WEB_CONCURRENCY', 'VITE_API_BASE_URL'];
const configuration = Object.fromEntries(configKeys.map(key => {
  const match = envText.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`, 'm'));
  const populated = Boolean(process.env[key] || (match && match[1].trim().replace(/^(['"])(.*)\1$/, '$2').trim()));
  return [key, populated];
}));
const app = fs.readFileSync('src/App.tsx', 'utf8');
const split = app.indexOf('<Route path="/os"');
const operational = new Set(['/os', ...[...app.slice(split).matchAll(/<Route path="([^"*]+)"/g)].map(m => m[1].startsWith('/') ? m[1] : `/os/${m[1]}`)]);
const manifest = JSON.parse(fs.readFileSync('src/content/page-manifest.json', 'utf8'));
const plannedRoutes = manifest.filter(p => p.route.startsWith('/os') && !operational.has(p.route.replace('[id]', ':id'))).map(p => p.route);
const validation = Object.entries(TOOLS).map(([id, tool]) => ({ id, name: tool.name, evidence: validationFor(id) }));
function walk(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(item => item.isDirectory() ? walk(path.join(root, item.name)) : [path.join(root, item.name)]);
}
const source = [...walk('src'), ...walk('server')].filter(f => /\.(mjs|tsx?|css)$/.test(f));
const endpoints = walk('src/app').filter(f => f.endsWith('.mjs')).flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)/g)].map(m => ({ file, method: m[1].toUpperCase(), path: m[2] })));
const summary = {
  date: '2026-10-06', configurationScope: 'local file/process only; boolean presence does not validate deployed settings', configuration,
  sourceFiles: source.length, sourceLines: source.reduce((n,f)=>n+fs.readFileSync(f,'utf8').split(/\r?\n/).length,0),
  backendRouteDeclarations: endpoints.length, unitTestFiles: fs.readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).length,
  browserTestFiles: walk('tests/browser').filter(f=>f.endsWith('.spec.ts')).length,
  manifestPages: manifest.length, publicManifestPages: manifest.filter(p=>!p.route.startsWith('/os')).length,
  osManifestPages: manifest.filter(p=>p.route.startsWith('/os')).length, plannedRoutes,
  toolCount: validation.length, toolValidation: validation,
  infrastructureFiles: ['vercel.json','Dockerfile','docker-compose.yml','deploy/deploy.sh','deploy/ecosystem.config.cjs','.github/workflows/ci.yml'].map(file=>({file,present:fs.existsSync(file)})),
};
fs.writeFileSync(`${output}/inventory.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ ...summary, toolValidation: undefined },null,2));
