import fs from 'node:fs';
const root='data/spec-review-snapshot/code/';
const manifest=JSON.parse(fs.readFileSync(root+'src/content/page-manifest.json','utf8'));
const entries=manifest.map(m=>({...m,data:JSON.parse(fs.readFileSync(root+m.content,'utf8'))}));
const app=fs.readFileSync(root+'src/App.tsx','utf8');
const os=app.slice(app.indexOf('<Route path="/os"'));
const routes=new Map([...os.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<([A-Za-z]+)/g)].map(m=>['/os/'+m[1],m[2]]));
routes.set('/os','Dashboard');routes.set('/os/workflows/[id]',routes.get('/os/workflows/:id'));
const normalize=s=>s.normalize('NFKC').replace(/\\([#|>])/g,'$1').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/^\s*(?:#{1,6}\s*|>\s*(?:•\s*)?)/,'').replace(/\s+/g,' ').trim().toLowerCase();
function strings(o){if(typeof o==='string')return[o];if(!o||typeof o!=='object')return[];return Object.values(o).flatMap(strings);}
const copy=fs.readFileSync('data/spec-review-snapshot/documents/COPY.md','utf8').split(/\r?\n/);
const pages=[];
for(let i=0;i<copy.length;i++){const m=copy[i].match(/^# (\d+) (.+)/);if(m)pages.push({page:Number(m[1]),name:m[2],start:i+1});}
const rows=pages.map((p,i)=>{
 const end=(pages[i+1]?.start||copy.length+1)-1;
 const entry=entries.find(e=>e.data.page===p.page);
 const haystack=entry?strings(entry.data).map(normalize).join('\n'):'';
 const lines=copy.slice(p.start,end).map((text,j)=>({line:p.start+j+1,text})).filter(x=>x.text.trim()&&!/^Design Colors:/.test(x.text)&&normalize(x.text));
 const unmatched=lines.filter(x=>!haystack.includes(normalize(x.text)));
 return {...p,end,route:entry?.route||null,content:entry?.content||null,component:entry?.component||null,dispatch:entry?(entry.route.startsWith('/os')?(routes.get(entry.route)||'PlannedModule'):['/start','/signup','/login','/demo','/forgot-password','/reset-password','/verify','/onboarding'].includes(entry.route)?'ContentPage + working controls':'ContentPage (document composition)'):'Missing catalog entry',copyLines:lines.length,unmatched};
});
fs.writeFileSync('audit-results/spec-review/route-audit.json',JSON.stringify(rows,null,2));
fs.writeFileSync('audit-results/spec-review/route-audit.md',`# 103-page route and copy inventory\n\nFrozen snapshot. Static dispatch is not proof that every control works. Copy comparison normalizes typography/Markdown and searches page content strings; unmatched lines require editorial review, not automatic defect classification. Runtime controls may supply wording separately.\n\n| Page | COPY lines | Route | Runtime dispatch | Unmatched copy lines |\n|---|---|---|---|---|\n`+rows.map(r=>`| ${r.page} ${r.name.replaceAll('|','/')} | ${r.start}–${r.end} | ${r.route||'No catalog entry'} | ${r.dispatch} | ${r.unmatched.length}/${r.copyLines} |`).join('\n')+'\n');
console.log(JSON.stringify({pages:rows.length,missing:rows.filter(r=>!r.route).map(r=>r.page),planned:rows.filter(r=>r.dispatch==='PlannedModule').map(r=>r.route),unmatchedLines:rows.reduce((n,r)=>n+r.unmatched.length,0)},null,2));
