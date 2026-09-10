import pathlib, re, collections, json, csv, hashlib

p = pathlib.Path(__file__).parent
e = (p / 'enterprise-compact.txt').read_text(encoding='utf-8').splitlines()
a = (p / 'agents-compact.txt').read_text(encoding='utf-8').splitlines()
w = (p / 'website.txt').read_text(encoding='utf-8').splitlines()

def rows(lines, start, end):
    return [re.sub(r'^\[\d+\] ', '', x).split(' | ') for x in lines
            if start <= int(x[1:5]) < end and ' | ' in x]

er = rows(e, 3818, 4828)
ar = rows(a, 682, 1692)
tr = rows(e, 4963, 6579)
results = {
    'registry_counts': [len(er), len(ar), len(tr)],
    'registries_identical': er == ar,
    'engine_counts': dict(collections.Counter(x[2] for x in er)),
    'tier_counts': dict(collections.Counter(x[3] for x in er)),
    'unique_tool_names': len(set(x[1] for x in er)),
    'trace_names_match': [x[1] for x in er] == [x[2] for x in tr],
    'phase_counts': dict(collections.Counter(x[5] for x in tr)),
    'agent_count': len(set(re.findall(r'AG-\d{3}', '\n'.join(a)))),
}
routes = [re.search(r'Route: (\S+)', x).group(1) for x in w if 'Route: ' in x]
results.update(route_count=len(routes), unique_routes=len(set(routes)),
               os_routes=sum(x.startswith('/os') for x in routes),
               expert_routes=[x for x in routes if 'expert' in x or 'talent' in x],
               search_routes=[x for x in routes if x == '/search' or x.startswith('/search/')])
results['missing_exact_catalog_names'] = [x for x in ['Strategic Alignment Check', 'Trend & Signal Analyzer', 'Dependency Tracker', 'Modernization Readiness'] if x not in set(t[1] for t in er)]
with (p / 'capability-inventory.csv').open('w', newline='', encoding='utf-8-sig') as f:
    wr = csv.writer(f)
    wr.writerow(['tool_id','domain','capability','engine','epic','phase','tier','visibility'])
    wr.writerows(tr)
pages = []
for x in w:
    t = x[7:]
    if re.match(r'PAGE \d+ - ', t):
        pages.append({'page':int(re.search(r'\d+',t).group()), 'name':t.split(' - ',1)[1], 'source_paragraph':int(x[1:5]), 'gates':[]})
    elif pages:
        for prefix,key in [('Route: ','route'),('SEO title: ','seo_title'),('Meta description: ','meta_description')]:
            if t.startswith(prefix): pages[-1][key] = t[len(prefix):].split('    |')[0]
        if re.match(r'(VERIFICATION|CAPABILITY|COMMERCIAL|EVIDENCE|IMPLEMENTATION|PUBLICATION|CONTENT) GATE', t): pages[-1]['gates'].append(t)
(p / 'route-inventory.json').write_text(json.dumps(pages, indent=2, ensure_ascii=False), encoding='utf-8')
results['pages_with_explicit_gates'] = len([x for x in pages if x['gates']])
results['suspicious_metadata_endings'] = [(x['page'],x['meta_description']) for x in pages if re.search(r'\b(and|or|the|a|an|can|over|You|person|change|operational|freshness|workflows)\.$', x.get('meta_description',''))]
results['source_word_counts'] = {label:len(re.sub(r'(?m)^\[\d+\] ', '', (p / (label+'.txt')).read_text(encoding='utf-8')).split()) for label in ['enterprise','website','agents']}
results['source_files'] = [{'path':str(f),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()} for f in pathlib.Path(r'C:\Users\TechBuddy\Downloads').glob('LAMID_ONE_*.docx') if any(s in f.name for s in ['Complete_Enterprise','FINAL_Go_Live','Agents_Intelligent'])]
assert len(er) == len(ar) == len(tr) == 202
assert er == ar
assert [x[0] for x in tr] == [f'T-{i:03}' for i in range(1,203)]
assert len(routes) == len(set(routes)) == len(pages) == 98
(p / 'audit-results.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(json.dumps(results, indent=2))
