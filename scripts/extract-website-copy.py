"""Extract Word paragraphs verbatim, retaining styles and source provenance."""
import hashlib
import json
import sys
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

source = Path(sys.argv[1])
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(source) as archive:
    root = ET.fromstring(archive.read('word/document.xml'))
assert not root.findall('.//w:tbl', ns), 'Tables require an explicit content review.'
paragraphs = []
for index, element in enumerate(root.findall('.//w:body/w:p', ns)):
    style = element.find('w:pPr/w:pStyle', ns)
    paragraphs.append({
        'sourceParagraph': index + 1,
        'style': style.get('{%s}val' % ns['w']) if style is not None else '',
        'text': ''.join(node.text or '' for node in element.findall('.//w:t', ns)),
    })
output = {'file': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'version': '1.4', 'paragraphs': paragraphs}
Path('document-study/pithy-v1.4-source.json').write_text(
    json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Extracted {len(paragraphs)} paragraphs without text normalization.')
