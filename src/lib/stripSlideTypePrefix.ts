/**
 * stripSlideTypePrefix — removes eLearning slide type labels from titles.
 *
 * When the accent header already shows the slide type (e.g. "KNOWLEDGE CHECK"),
 * we strip that prefix so titles render as clean topic names.
 *
 * Handles patterns like:
 *   "Knowledge Check — Player Components"  →  "Player Components"
 *   "Accordion — Deep Dive"               →  "Deep Dive"
 *   "Flashcards - Terminology"            →  "Terminology"
 */

const SLIDE_TYPE_PREFIXES = [
  'Knowledge Check',
  'Quiz',
  'Multiple Choice',
  'Accordion',
  'Flashcards',
  'Flashcard',
  'Timeline',
  'Sorting',
  'Matching',
  'Hotspot',
  'Branching Scenario',
  'Branching',
  'Interaction',
  'Drag and Drop',
  'Drop Targets',
  'Game Template',
  'Summary',
];

// Matches: <Prefix> followed by em dash, en dash, or hyphen (with optional spaces)
const PREFIX_RE = new RegExp(
  `^(${SLIDE_TYPE_PREFIXES.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*[—–-]+\\s*`,
  'i'
);

export function stripSlideTypePrefix(title: string): string {
  return title.replace(PREFIX_RE, '');
}
