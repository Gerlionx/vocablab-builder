export type TeamColor = {
  id: string;
  label: string;
  fill: string;
  ink: string;
};

/** High-contrast projector palettes. Two teams pick from these. */
export const TEAM_COLORS: TeamColor[] = [
  { id: "red", label: "Red", fill: "oklch(0.58 0.21 25)", ink: "oklch(0.99 0 0)" },
  { id: "blue", label: "Blue", fill: "oklch(0.48 0.17 250)", ink: "oklch(0.99 0 0)" },
  { id: "gold", label: "Gold", fill: "oklch(0.68 0.16 82)", ink: "oklch(0.99 0 0)" },
  { id: "green", label: "Green", fill: "oklch(0.55 0.15 155)", ink: "oklch(0.99 0 0)" },
  { id: "purple", label: "Purple", fill: "oklch(0.52 0.18 310)", ink: "oklch(0.99 0 0)" },
  { id: "orange", label: "Orange", fill: "oklch(0.64 0.18 52)", ink: "oklch(0.99 0 0)" },
];

export const DEFAULT_TEAM_COLOR_IDS = ["red", "blue", "gold"] as const;

export type SlicePaint = {
  fill: string;
  ink: string;
  stroke: string;
};

export function colorById(id: string): TeamColor {
  return TEAM_COLORS.find((c) => c.id === id) ?? TEAM_COLORS[0]!;
}

export function splitTeams(names: string[], count: 2 | 3): string[][] {
  const buckets = Array.from({ length: count }, () => [] as string[]);
  names.forEach((name, i) => {
    buckets[i % count]!.push(name);
  });
  return buckets;
}

export function splitEven(names: string[]): [string[], string[]] {
  const [a, b] = splitTeams(names, 2);
  return [a ?? [], b ?? []];
}

const RAINBOW: SlicePaint[] = [
  { fill: "oklch(0.58 0.21 25)", ink: "oklch(0.99 0 0)", stroke: "oklch(0.14 0.04 25 / 0.85)" },
  { fill: "oklch(0.48 0.17 250)", ink: "oklch(0.99 0 0)", stroke: "oklch(0.14 0.05 250 / 0.85)" },
  { fill: "oklch(0.68 0.16 82)", ink: "oklch(0.99 0 0)", stroke: "oklch(0.14 0.04 80 / 0.85)" },
  { fill: "oklch(0.55 0.15 155)", ink: "oklch(0.99 0 0)", stroke: "oklch(0.14 0.04 155 / 0.85)" },
  { fill: "oklch(0.52 0.18 310)", ink: "oklch(0.99 0 0)", stroke: "oklch(0.14 0.05 310 / 0.85)" },
  { fill: "oklch(0.64 0.18 52)", ink: "oklch(0.99 0 0)", stroke: "oklch(0.16 0.05 52 / 0.85)" },
];

export function rainbowPaint(i: number): SlicePaint {
  return RAINBOW[i % RAINBOW.length]!;
}

/** Two shades of one team colour so slices read, without a second team on the disc. */
export function teamSlicePaint(base: TeamColor, i: number): SlicePaint {
  const dark = i % 2 === 0;
  const lightInk = base.ink.startsWith("oklch(0.99") || base.ink.includes("0.99");
  if (dark) {
    return {
      fill: `color-mix(in oklch, ${base.fill} 78%, black)`,
      ink: "oklch(0.995 0 0)",
      stroke: "oklch(0.12 0.03 80 / 0.88)",
    };
  }
  if (lightInk) {
    return {
      fill: `color-mix(in oklch, ${base.fill} 88%, white)`,
      ink: "oklch(0.995 0 0)",
      stroke: "oklch(0.12 0.03 80 / 0.88)",
    };
  }
  return {
    fill: `color-mix(in oklch, ${base.fill} 82%, white)`,
    ink: "oklch(0.16 0.04 80)",
    stroke: "oklch(1 0 0 / 0.92)",
  };
}
