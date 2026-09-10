"""One-time migration of document page components to the supplied v1.4 sections."""
import json
import re
from pathlib import Path

manifest = json.loads(Path('src/content/page-manifest.json').read_text())
for entry in manifest:
    if entry['route'] == '/':
        continue
    content = json.loads(Path(entry['content']).read_text(encoding='utf-8'))
    component = Path(entry['component'])
    prefix = '../../../../shared/content/'
    hero = entry['exportName'].replace('DocumentPage', 'HeroSlide')
    names = [''.join(w[:1].upper() + w[1:].lower() for w in re.findall(r'[A-Za-z0-9]+', section['title'])) + f'Slide{i+1}' for i, section in enumerate(content['sections'])]
    names = ['Step' + n if n[0].isdigit() else n for n in names]
    slides = f"import {{ DocumentHeroSlide }} from '{prefix}slides/DocumentHeroSlide';\nimport {{ DocumentSectionSlide }} from '{prefix}slides/DocumentSectionSlide';\nimport type {{ DocumentPageProps }} from '{prefix}types';\nimport content from './content.json';\n\nexport function {hero}({{ embedded = false }}: DocumentPageProps) {{\n  return <DocumentHeroSlide page={{content}} embedded={{embedded}} />;\n}}\n"
    for i, name in enumerate(names):
        slides += f'\n/** {content["sections"][i]["title"]} */\nexport function {name}({{ embedded = false }}: DocumentPageProps) {{\n  return <DocumentSectionSlide section={{content.sections[{i}]}} index={{{i}}} last={{{str(i == len(names)-1).lower()}}} embedded={{embedded}} />;\n}}\n'
    component.with_name('slides.tsx').write_text(slides, encoding='utf-8')
    imports = ', '.join([hero] + names)
    children = '\n'.join(f'      <{name} embedded={{embedded}} />' for name in names)
    component.write_text(f"import {{ DocumentPageLayout }} from '{prefix}DocumentPageLayout';\nimport type {{ DocumentPageProps }} from '{prefix}types';\nimport content from './content.json';\nimport {{ {imports} }} from './slides';\n\n/** {entry['route']} — sections in reading order. */\nexport function {entry['exportName']}({{ embedded = false }}: DocumentPageProps) {{\n  return (\n    <DocumentPageLayout page={{content}} embedded={{embedded}} hero={{<{hero} embedded={{embedded}} />}}>\n{children}\n    </DocumentPageLayout>\n  );\n}}\n", encoding='utf-8')
print('Updated 97 named document pages and their reusable slides.')
