from pathlib import Path
p = Path('src/products/website/pages/home/components/WorkspacePreview.tsx')
s = p.read_text(encoding='utf-8')
start = s.index('const previews = [')
end = s.index('\n\n/**', start)
s = s[:start] + '''const previews = [
  { name: 'Clarity', icon: Compass, route: '/how-it-works/clarity' },
  { name: 'Capability', icon: Layers3, route: '/how-it-works/capability' },
  { name: 'Consistency', icon: ListChecks, route: '/how-it-works/consistency' },
].map((item) => {
  const copy = sourcePage(item.route)!;
  return {
    ...item,
    label: copy.name,
    title: copy.title,
    description: copy.description,
    rows: copy.sections.slice(0, 3).map((section) => section.title),
  };
});''' + s[end:]
s = s.replace("import { DemoAccessSlide }", "import { sourcePage } from '../../../../../shared/content/sourcePage';\nimport home from '../content.json';\nimport { DemoAccessSlide }")
s = s.replace('''            <p>
              Your judgment.
              <br />
              At every important step.
            </p>''', '''            <p>{home.hero.paragraphs[5].text}</p>''')
s = s.replace('''            <span className="home-preview-status">
              <span />
              {preview.status}
            </span>''', '')
s = s.replace('<p>Bring your context. Choose your next move.</p>', '<p>{home.sections[0].paragraphs[1].text}</p>')
s = s.replace('Start with a sample workspace. Make it real when you’re ready.', 'Sample workspace')
p.write_text(s, encoding='utf-8')
# Old homepage sections are absent from v1.4; the pre-import archive retains them.
base = Path('src/products/website/pages/home/slides')
for name in ['HomeOperatingCycleSlide', 'HomeContextsSlide', 'HomeGovernanceSlide', 'HomeSimplicitySlide', 'HomePlansSlide']:
    (base / (name + '.tsx')).unlink()
