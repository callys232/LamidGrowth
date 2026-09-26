import { readFileSync, appendFileSync } from 'node:fs';
const [id, from='1', to='200'] = process.argv.slice(2);
const manifest=JSON.parse(readFileSync('audit-results/spec-review/manifest.json','utf8'));
const doc=manifest.documents.find(d=>d.id===id);
if(!doc)throw new Error('Unknown document');
const lines=readFileSync(doc.snapshot,'utf8').split(/\r?\n/);
const start=Number(from),end=Math.min(Number(to),lines.length);
console.log(lines.slice(start-1,end).map((line,i)=>`${id}:${start+i} ${line}`).join('\n'));
appendFileSync('audit-results/spec-review/read-log.jsonl',JSON.stringify({id,start,end,at:new Date().toISOString()})+'\n');
