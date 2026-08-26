/** Accept messy classroom pastes: one per line, commas, semicolons, bullets. */

export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const chunk of text.split(/[\n,;|/]+/)) {
    const name = chunk.replace(/^[\s\-•*]+/, "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export const TEAM_LABELS = ["Team A", "Team B", "Team C", "Team D", "Team E", "Team F"];
