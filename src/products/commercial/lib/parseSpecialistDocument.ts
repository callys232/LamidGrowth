export interface ParsedDocument {
  heading: string;
  fields: Array<{ label: string; value: string }>;
  paragraphs: string[];
  note?: string;
}

const fieldLine = /^([A-Za-z][A-Za-z ]{1,30}):\s?(.+)$/;

/**
 * Turns a specialist's plain-text response into a structure a document-style UI can render.
 * The deterministic (no-AI-configured) templates in agents.mjs consistently use a
 * "Heading\n\nLabel: value\nLabel: value\n\n(disclaimer)" shape; once a real AI provider answers
 * in free prose instead, blocks with no colon-led lines just fall back to plain paragraphs, so
 * the UI never breaks, it just renders less structured.
 */
export function parseSpecialistDocument(text: string): ParsedDocument {
  const blocks = text.split('\n\n').map((b) => b.trim()).filter(Boolean);
  const heading = blocks.shift() || '';
  let note: string | undefined;
  if (blocks.length && blocks[blocks.length - 1].startsWith('(') && blocks[blocks.length - 1].endsWith(')')) {
    note = blocks.pop()!.slice(1, -1);
  }
  const fields: Array<{ label: string; value: string }> = [];
  const paragraphs: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const matches = lines.map((line) => line.match(fieldLine));
    if (matches.some(Boolean)) {
      lines.forEach((line, i) => {
        const match = matches[i];
        if (match) fields.push({ label: match[1], value: match[2] });
        else if (line.trim()) paragraphs.push(line.trim());
      });
    } else {
      paragraphs.push(block);
    }
  }
  return { heading, fields, paragraphs, note };
}
