import content from '../content.json';

/** Homepage sections are looked up by label so later additions never shift them. */
export function homeSection(label: string) {
  const section = content.sections.find((s) => s.label === label);
  if (!section) throw new Error(`Missing homepage section: ${label}`);
  return section;
}
