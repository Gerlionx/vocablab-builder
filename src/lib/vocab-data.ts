export type Difficulty = "Low" | "Medium" | "High";

export type Word = {
  id: string;
  year: string;
  term: string;
  topic: string;
  difficulty: Difficulty;
  french: string;
  english: string;
};

let counter = 0;
const w = (
  year: string,
  term: string,
  topic: string,
  difficulty: Difficulty,
  french: string,
  english: string,
): Word => ({
  id: `w${++counter}`,
  year,
  term,
  topic,
  difficulty,
  french,
  english,
});

export const YEARS = ["Year 7", "Year 8", "Year 9"];
export const TERMS = ["Term 1", "Term 2", "Term 3"];
export const TOPICS = [
  "Greetings",
  "Numbers",
  "Colours",
  "Family",
  "School",
  "Free time",
];
export const DIFFICULTIES: Difficulty[] = ["Low", "Medium", "High"];

export const SEED_WORDS: Word[] = [
  // Year 7 — Term 1 — Greetings
  w("Year 7", "Term 1", "Greetings", "Low", "Bonjour", "Hello"),
  w("Year 7", "Term 1", "Greetings", "Low", "Salut", "Hi"),
  w("Year 7", "Term 1", "Greetings", "Low", "Au revoir", "Goodbye"),
  w("Year 7", "Term 1", "Greetings", "Medium", "Ça va ?", "How are you?"),
  w("Year 7", "Term 1", "Greetings", "Medium", "Enchanté", "Nice to meet you"),
  w(
    "Year 7",
    "Term 1",
    "Greetings",
    "High",
    "Comment allez-vous ?",
    "How are you? (formal)",
  ),
  w(
    "Year 7",
    "Term 1",
    "Greetings",
    "High",
    "Je m'appelle…",
    "My name is…",
  ),

  // Year 7 — Term 1 — Numbers
  w("Year 7", "Term 1", "Numbers", "Low", "un", "one"),
  w("Year 7", "Term 1", "Numbers", "Low", "deux", "two"),
  w("Year 7", "Term 1", "Numbers", "Low", "trois", "three"),
  w("Year 7", "Term 1", "Numbers", "Medium", "onze", "eleven"),
  w("Year 7", "Term 1", "Numbers", "Medium", "quinze", "fifteen"),
  w("Year 7", "Term 1", "Numbers", "High", "soixante-dix", "seventy"),
  w("Year 7", "Term 1", "Numbers", "High", "quatre-vingt-dix", "ninety"),

  // Year 7 — Term 1 — Colours
  w("Year 7", "Term 1", "Colours", "Low", "rouge", "red"),
  w("Year 7", "Term 1", "Colours", "Low", "bleu", "blue"),
  w("Year 7", "Term 1", "Colours", "Low", "vert", "green"),
  w("Year 7", "Term 1", "Colours", "Medium", "jaune", "yellow"),
  w("Year 7", "Term 1", "Colours", "Medium", "violet", "purple"),
  w("Year 7", "Term 1", "Colours", "High", "gris foncé", "dark grey"),

  // Year 7 — Term 2 — Family
  w("Year 7", "Term 2", "Family", "Low", "la mère", "the mother"),
  w("Year 7", "Term 2", "Family", "Low", "le père", "the father"),
  w("Year 7", "Term 2", "Family", "Low", "le frère", "the brother"),
  w("Year 7", "Term 2", "Family", "Medium", "la sœur", "the sister"),
  w("Year 7", "Term 2", "Family", "Medium", "les grands-parents", "the grandparents"),
  w(
    "Year 7",
    "Term 2",
    "Family",
    "High",
    "J'ai deux frères et une sœur",
    "I have two brothers and one sister",
  ),

  // Year 7 — Term 2 — School
  w("Year 7", "Term 2", "School", "Low", "le stylo", "the pen"),
  w("Year 7", "Term 2", "School", "Low", "le cahier", "the exercise book"),
  w("Year 7", "Term 2", "School", "Medium", "la trousse", "the pencil case"),
  w("Year 7", "Term 2", "School", "Medium", "J'étudie", "I study"),
  w(
    "Year 7",
    "Term 2",
    "School",
    "High",
    "Je dois faire mes devoirs",
    "I have to do my homework",
  ),

  // Year 7 — Term 2 — Free time
  w("Year 7", "Term 2", "Free time", "Low", "le foot", "football"),
  w("Year 7", "Term 2", "Free time", "Medium", "J'aime nager", "I like swimming"),
  w(
    "Year 7",
    "Term 2",
    "Free time",
    "High",
    "Je joue de la guitare depuis deux ans",
    "I have played the guitar for two years",
  ),

  // Year 8 — a small slice so year switching feels real
  w("Year 8", "Term 1", "Free time", "Low", "le week-end", "the weekend"),
  w("Year 8", "Term 1", "Free time", "Medium", "Je fais du vélo", "I go cycling"),
  w(
    "Year 8",
    "Term 1",
    "Free time",
    "High",
    "Si j'avais le temps, je lirais plus",
    "If I had the time, I would read more",
  ),
];

export const SEED_NAMES = [
  "Sophie",
  "Jack",
  "Oliver",
  "Amélie",
  "Charlie",
  "Isabella",
  "Mohammed",
  "Freya",
  "Leo",
  "Mia",
  "Noah",
  "Priya",
];

export function nextId() {
  return `w${++counter}`;
}
