import { readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const root = resolve('.');
const out = resolve('audit-results/spec-review');
const snapshot = resolve('data/spec-review-snapshot');
const names = [
 ['CAN','LAMID_ONE_Canonical_Product_Technical_Architecture_Specification_v3.4_2026-09-14.md'],
 ['INT','LAMID_ONE_Shared_Intelligence_Goal_Opportunity_and_Guided_Scoping_Architecture_v1.0_2026-09-14.md'],
 ['EXP','LAMID_ONE_Cross_Domain_Expert_Network_Architecture_and_Gap_Closure_v1.1_2026-09-14.md'],
 ['AGT','LAMID_ONE_Agents_Intelligent_Engines_and_Tool_Fabric_Specification_v1.4_2026-09-14.md'],
 ['ENT','LAMID_ONE_Complete_Enterprise_Engineering_Documentation_Master_v2.3_2026-09-14.md'],
 ['DEL','LAMID_ONE_Implementation_Delivery_Contract_Layer_v1.4_2026-09-14.md'],
 ['BRAND','LAMID_ONE_Canonical_Brand_Experience_Master_Stillness_300_400_500_v1.4_2026-09-14.md'],
 ['COPY','LAMID_ONE_Pithy_103_Page_Copy_Only_with_Design_Colors_v1.8_2026-09-14.md'],
];
const hash = b => createHash('sha256').update(b).digest('hex');
mkdirSync(out,{recursive:true});
mkdirSync(join(snapshot,'documents'),{recursive:true});
const docs = names.map(([id,name]) => {
 const original = join('C:/Users/TechBuddy/Downloads',name);
 const data=readFileSync(original), text=data.toString('utf8'), lines=text.split(/\r?\n/);
 const target=join(snapshot,'documents',`${id}.md`); copyFileSync(original,target);
 const headings=lines.flatMap((s,i)=>/^#{1,6}\s/.test(s)?[{line:i+1,text:s}]:[]);
 return {id,name,original,snapshot:target,bytes:data.length,lines:lines.length,sha256:hash(data),headings};
});
const files=[];
function walk(dir) { if(!existsSync(dir))return; for(const e of readdirSync(dir,{withFileTypes:true})) { const file=join(dir,e.name); if(e.isDirectory())walk(file); else files.push(file); } }
for(const dir of ['src','server','tests','scripts','deploy','.github'])walk(resolve(dir));
for(const file of readdirSync(root))if(/^(package.*\.json|.*config\.(ts|cjs|mjs|json)|README\.md|\.prettierignore|\.gitignore)$/.test(file))files.push(resolve(file));
const code=files.map(file=>{const path=relative(root,file).replaceAll('\\','/'); const data=readFileSync(file); const target=join(snapshot,'code',path);mkdirSync(dirname(target),{recursive:true});copyFileSync(file,target);return {path,bytes:data.length,sha256:hash(data)};});
const manifest={capturedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirtyStatus:execFileSync('git',['status','--short'],{encoding:'utf8'}),documents:docs,code};
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2));
writeFileSync(join(out,'document-index.md'),docs.map(d=>`## ${d.id}: ${d.name}\n\n${d.lines} lines; SHA256 ${d.sha256}\n\n${d.headings.map(h=>`${h.line}: ${h.text}`).join('\n')}`).join('\n\n'));
console.log(JSON.stringify({capturedAt:manifest.capturedAt,head:manifest.head,codeFiles:code.length,documents:docs.map(({id,lines,bytes,headings})=>({id,lines,bytes,headings:headings.length}))},null,2));
