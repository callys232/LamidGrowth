import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const target='data/working-tools-review-20260924';
if(fs.existsSync(target))throw Error('Do not overwrite a captured baseline.');
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.isFile())files.push(p);}}
for(const dir of ['src','server','tests','scripts','deploy','.github'])walk(dir);
for(const p of fs.readdirSync('.'))if(/^(package.*\.json|.*config\.(ts|cjs|mjs|json)|README\.md)$/.test(p))files.push(p);
if(fs.existsSync('document-study/pithy-v1.4-source.json'))files.push('document-study/pithy-v1.4-source.json');
const records=files.map(p=>{const b=fs.readFileSync(p),dst=path.join(target,p);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.writeFileSync(dst,b);return {path:p.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(b).digest('hex')};});
fs.writeFileSync('audit-results/spec-review/working-tools-manifest.json',JSON.stringify({at:new Date().toISOString(),target,files:records},null,2));
console.log(JSON.stringify({target,files:files.length}));
