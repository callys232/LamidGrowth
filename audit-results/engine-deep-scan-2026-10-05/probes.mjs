import { writeFileSync } from 'node:fs';
import { runEngine, parseEngineCode } from '../../src/app/engines.mjs';
import { TOOLS, PRIMARY, inputSpecFor } from '../../src/app/toolCatalog/catalog.mjs';
import { MAP } from '../../src/app/toolCatalog/migration.mjs';
import { EXAMPLES } from '../../src/app/toolCatalog/examples.mjs';

const run = (id, input) => runEngine(parseEngineCode(PRIMARY[id]), input);
const clone = structuredClone;
function nonfinite(v, path = '') {
  if (typeof v === 'number') return Number.isFinite(v) ? [] : [path];
  if (!v || typeof v !== 'object') return [];
  return Object.entries(v).flatMap(([k, x]) => nonfinite(x, `${path}.${k}`));
}
const inventory = Object.entries(TOOLS).map(([id, t]) => {
  try {
    const out = run(id, clone(EXAMPLES[id]));
    return { id, code: PRIMARY[id], name: t.name, engine: t.engine, kind: out.kind,
      exampleRuns: true, nonfinite: nonfinite(out), computes: out.computes, limits: out.limits };
  } catch (e) { return { id, name: t.name, exampleRuns: false, error: e.message }; }
});
const probes = [];
function probe(name, id, input) {
  try {
    const r = run(id, input);
    probes.push({ name, tool: id, accepted: true, summary: r.summary, warnings: r.warnings,
      nonfinite: nonfinite(r), working: r.working });
  } catch (e) { probes.push({ name, tool: id, accepted: false, error: e.message, status: e.status }); }
}
probe('Fractional evidence creates NaN', 'T01', {answers:{p1:{level:5,evidence:0.5}}});
probe('One answer produces overall 100% mature', 'T01', {answers:{p1:{level:5,evidence:2}}});
probe('No supporting facts still names most probable root', 'T11', {
  problem:'Lost sales', causes:[{cause:'Bad product',category:'Process',evidence:'none',fitsFacts:'no'}]});
probe('Impossible active time yields efficiency above 100%', 'T06', {
  periodDays:7, periods:[1,2,3].map(i=>({label:`W${i}`,throughput:7,cycleTimeDays:1,wip:1,activeDays:10}))});
probe('Constant labels mask latest drift', 'T07', {
  metric:'Defects',betterWhen:'lower',values:[10,11,10,9,10,11,10,9,10,25].map(value=>({label:'Week',value}))});
probe('Unique labels detect latest drift', 'T07', {
  metric:'Defects',betterWhen:'lower',values:[10,11,10,9,10,11,10,9,10,25].map((value,i)=>({label:`W${i}`,value}))});
probe('Whitespace required objective and numeric budget', 'T02', {
  objectives:[{name:'   '}],initiatives:[{name:'   ',budget:'   '}]});
probe('Prototype name causes internal exception', 'T19', {
  decisions:[{title:'Example',raised:'2026-01-01',status:'open',topic:'constructor'}]});
probe('Invalid calendar date', 'T19', {
  decisions:[{title:'Example',raised:'2026-02-31',status:'open'}]});
probe('Reversed chronology silently omitted', 'T19', {
  decisions:[{title:'Example',raised:'2026-03-01',decided:'2026-02-01',status:'decided'}]});
probe('Annual plan satisfies quarterly strategy review', 'T12', {
  people:5,meetings:[{name:'Annual plan',frequency:'yearly',minutes:60,attendees:5,purpose:'plan'}]});
probe('More leavers than current staff creates negative supply', 'T41', {
  roles:[{role:'Analyst',current:2,leavers:10,needed:3}]});
probe('Single small survey group leaks aggregate score', 'T45', {
  teams:[{team:'Small',invited:1,promoters:1,passives:0,detractors:0,engagementAvg:5}]});
probe('Large finite inputs overflow arithmetic', 'T51', {
  opportunities:[{opportunity:'X',horizon:EXAMPLES.T51.opportunities[0].horizon,
    ansoff:'market penetration',reach:1e308,impact:3,confidence:100,effort:0.1}]});
const emptyInput = Object.entries(TOOLS).map(([id,t])=>{
  try { const r=run(id,{}); return {id,name:t.name,accepted:true,summary:r.summary,warnings:r.warnings}; }
  catch(e) { return {id,name:t.name,accepted:false,error:e.message,status:e.status}; }
});
const fieldSweep = [];
for (const [id,t] of Object.entries(TOOLS)) {
  if(t.engine!=='schema') continue;
  const spec=inputSpecFor(id);
  for (const table of spec.tables) {
    for(const col of table.columns.filter(c=>c.type==='text')) {
      const input=clone(EXAMPLES[id]);
      if(!input[table.key]?.length) continue;
      input[table.key][0][col.key]='constructor';
      try { const r=run(id,input); const bad=nonfinite(r); if(bad.length)fieldSweep.push({id,table:table.key,field:col.key,nonfinite:bad}); }
      catch(e) { if(e.status!==400)fieldSweep.push({id,table:table.key,field:col.key,error:e.message,status:e.status}); }
    }
  }
}
const output = { inventory, emptyInput, fieldSweep, migration: Object.values(MAP).reduce((a,m)=>(a[m.verdict]=(a[m.verdict]||0)+1,a),{}), probes };
writeFileSync(new URL('./probe-results.json', import.meta.url), JSON.stringify(output,null,2));
console.log(JSON.stringify({tools:inventory.length, examplesPassed:inventory.filter(x=>x.exampleRuns).length,
  exampleNonfinite:inventory.filter(x=>x.nonfinite?.length),migration:output.migration,
  emptyAccepted:emptyInput.filter(x=>x.accepted).map(x=>({id:x.id,name:x.name})),fieldSweep,
  probes:probes.map(p=>({name:p.name,accepted:p.accepted,nonfinite:p.nonfinite,error:p.error}))},null,2));
