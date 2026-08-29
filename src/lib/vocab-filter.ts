export type VocabFilter = {
  years: string[];
  terms: string[];
  topics: string[];
  difficulties: string[];
};

export type FilterWordsOptions = {
  /**
   * When true (default), an empty list for a dimension matches any value.
   * When false, an empty list matches nothing — used by the lesson builder
   * so teachers can clear filters and build from scratch.
   */
  emptyMeansAll?: boolean;
};

type FilterableWord = {
  french: string;
  english: string;
  year: string;
  term: string;
  topic: string;
  difficulty: string;
};

/** Filter vocabulary by year / term / topic / level. */
export function filterWords<T extends FilterableWord>(
  words: T[],
  filter: VocabFilter,
  opts: FilterWordsOptions = {},
): T[] {
  const emptyMeansAll = opts.emptyMeansAll !== false;
  return words.filter((word) => {
    if (!word.french.trim() || !word.english.trim()) return false;
    if (!matchDimension(filter.years, word.year, emptyMeansAll)) return false;
    if (!matchDimension(filter.terms, word.term, emptyMeansAll)) return false;
    if (!matchDimension(filter.topics, word.topic, emptyMeansAll)) return false;
    if (!matchDimension(filter.difficulties, word.difficulty, emptyMeansAll)) return false;
    return true;
  });
}

function matchDimension(selected: string[], value: string, emptyMeansAll: boolean): boolean {
  if (!selected.length) return emptyMeansAll;
  return selected.includes(value);
}

export function toggleFilterValue(current: string[], value: string): string[] {
  if (current.includes(value)) return current.filter((v) => v !== value);
  return [...current, value];
}

/**
 * Word counts per option for one filter dimension, respecting the other
 * selected filters. Empty sibling dimensions stay unconstrained so teachers
 * can see what is available as they build the lesson.
 */
export function facetOptionCounts(
  words: FilterableWord[],
  filter: VocabFilter,
  dimension: keyof VocabFilter,
  options: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const option of options) {
    const next: VocabFilter = {
      years: dimension === "years" ? [option] : filter.years,
      terms: dimension === "terms" ? [option] : filter.terms,
      topics: dimension === "topics" ? [option] : filter.topics,
      difficulties: dimension === "difficulties" ? [option] : filter.difficulties,
    };
    counts[option] = filterWords(words, next, { emptyMeansAll: true }).length;
  }
  return counts;
}
