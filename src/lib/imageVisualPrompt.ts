/**
 * Grounded image prompts + homonym lock.
 *
 * Image models will paint a job firing for "Termination" and an astronaut for
 * "EVA" if the prompt is only the short tab label. Always pass course/slide
 * domain and the panel body. Prompts never ask the model to typeset titles.
 */

export const IMAGE_NO_TEXT_RULE =
  'HARD RULE: The image must contain absolutely no text of any kind — no titles, captions, letters, numbers, words, labels, signs with writing, logos, watermarks, UI chrome, or typography. If an object would normally have writing (boxes, trucks, screens, posters, bags, bottles, packaging, machine displays), show that surface completely blank. Do not stamp the topic name onto the photo. Visuals only.';

const GENERIC_MEDIA_PROMPT =
  /^(professional illustration related to|unlabeled educational|simple educational illustration|short image prompt)/i;

const GENERIC_PANEL_LABEL =
  /^(introduction|intro|overview|summary|key takeaways|conclusion|topic)$/i;

const TECHNICAL_DOMAIN =
  /\b(polymer|polyethylene|polypropylene|plastic|resin|chemistry|chemical|radical|monomer|comonomer|electron|catalyst|reactor|refinery|olefin|ethylene|propylene|polymerization|density|crystall|pellet|extrusion|injection|process plant|steam crack|distill|feedstock|copolymer|vinyl acetate|hdpe|ldpe|lldpe|eva)\b/i;

const PEOPLE_OK_DOMAIN =
  /\b(safety culture|leadership|onboarding|teamwork|communication|hr policy|workplace behavior|incident report|permit to work)\b/i;

type HomonymRule = {
  match: RegExp;
  whenDomain: RegExp;
  visual: string;
  forbid: string;
};

/** Short labels whose everyday English meaning is wrong in this product's SME decks. */
const HOMONYMS: HomonymRule[] = [
  {
    match: /\bEVA\b/i,
    whenDomain: /polymer|plastic|vinyl|acetate|ethylene|chemistry|comonomer|polyethylene|resin/i,
    visual:
      'ethylene-vinyl acetate copolymer: clear-to-white flexible plastic resin pellets or a sheet of tough elastic EVA film in an industrial polymer setting',
    forbid: 'astronauts, spacesuits, spacewalks, NASA, rockets, planets, space photography',
  },
  {
    match: /\btermination\b/i,
    whenDomain: /polymer|radical|electron|chain|monomer|chemistry|polymerization/i,
    visual:
      'polymer-chain termination in free-radical chemistry: two reactive chain ends meeting so the finished polymer molecule becomes stable — laboratory or molecular, not employment',
    forbid: 'job firing, pink slips, HR meetings, cardboard boxes of belongings, layoff scenes, unemployed office workers',
  },
  {
    match: /\binitiation\b/i,
    whenDomain: /polymer|radical|electron|monomer|chemistry|polymerization|catalyst/i,
    visual:
      'free-radical polymerization initiation: heat or a catalyst creating a reactive radical that attacks a monomer double bond in a lab or reactor',
    forbid: 'handshakes, kickoff meetings, ceremonies, onboarding paperwork, starting pistols',
  },
  {
    match: /\bpropagation\b/i,
    whenDomain: /polymer|radical|chain|monomer|chemistry|polymerization/i,
    visual:
      'polymer-chain propagation: a growing macromolecule adding monomer units at a reactive radical site',
    forbid: 'radio towers, news broadcasts, propaganda posters, plant gardening',
  },
  {
    match: /\bmonomer\b/i,
    whenDomain: /polymer|chemistry|ethylene|vinyl|plastic|resin/i,
    visual:
      'a clear laboratory bottle of liquid monomer feedstock (small repeating-unit chemical) on a lab bench, unlabeled',
    forbid: 'monsters, cartoon characters, typeset chemical names on the glass',
  },
  {
    match: /\bcomonomer\b/i,
    whenDomain: /polymer|chemistry|ethylene|vinyl|plastic|resin/i,
    visual:
      'a second unlabeled laboratory bottle of comonomer beside polyethylene feedstock, industrial chemistry',
    forbid: 'people, typeset chemical names',
  },
  {
    match: /\bcatalyst\b/i,
    whenDomain: /polymer|chemistry|reactor|process|olefin|polymerization/i,
    visual:
      'industrial polymerization catalyst: pellets, powder, or a catalyst bed inside process equipment',
    forbid: 'motivational speakers, superhero characters, magic potions',
  },
  {
    match: /\b(PE|polyethylene)\b/i,
    whenDomain: /polymer|plastic|chemistry|density|hdpe|ldpe/i,
    visual: 'polyethylene resin pellets, film, or molded plastic parts in an industrial setting',
    forbid: 'physical-education class, gym class, sports drills',
  },
  {
    match: /\b(PP|polypropylene)\b/i,
    whenDomain: /polymer|plastic|chemistry|crystall/i,
    visual: 'polypropylene resin or molded PP parts in an industrial polymer plant',
    forbid: 'PowerPoint screens, presentation software',
  },
  {
    match: /\b(HDPE|LDPE|LLDPE)\b/i,
    whenDomain: /polymer|plastic|density|polyethylene/i,
    visual: 'polyethylene products at that density: bottles, film, or resin pellets — unlabeled packaging',
    forbid: 'city skylines used as a density metaphor, typeset resin grade names',
  },
  {
    match: /\b(cracking|cracker)\b/i,
    whenDomain: /steam|olefin|ethylene|refinery|furnace|process/i,
    visual: 'a steam-cracker furnace and process equipment converting hydrocarbon feedstock',
    forbid: 'soda crackers, Christmas crackers, broken objects, cookie factories',
  },
  {
    match: /\byield\b/i,
    whenDomain: /chemistry|process|reactor|polymer|refinery/i,
    visual: 'process equipment producing chemical product, not a traffic sign',
    forbid: 'yield traffic signs, road intersections',
  },
  {
    match: /\bconversion\b/i,
    whenDomain: /chemistry|process|reactor|polymer|refinery/i,
    visual: 'a chemical process converting feedstock into product inside industrial equipment',
    forbid: 'religious conversion, baptism, missionary scenes',
  },
  {
    match: /\bplant\b/i,
    whenDomain: /process|refinery|polymer|chemical|industrial|facility/i,
    visual: 'an industrial process plant: units, piping, and equipment',
    forbid: 'houseplants, gardens, botanical close-ups unless the lesson is agriculture',
  },
];

export type VisualPromptInput = {
  courseTitle?: string;
  moduleTitle?: string;
  slideTitle?: string;
  panelLabel?: string;
  panelBody?: string;
  mediaPrompt?: string;
};

export type GroundedVisualPrompt = {
  prompt: string;
  intended: string;
  visualSubject: string;
};

function stripToPlain(text: unknown): string {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[#*_`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function isGenericMediaPrompt(text: string): boolean {
  const t = stripToPlain(text);
  return !t || GENERIC_MEDIA_PROMPT.test(t);
}

function domainText(input: VisualPromptInput): string {
  return [
    input.courseTitle,
    input.moduleTitle,
    input.slideTitle,
    input.panelLabel,
    input.panelBody,
    input.mediaPrompt,
  ]
    .map(stripToPlain)
    .filter(Boolean)
    .join(' ');
}

function findHomonym(label: string, domain: string): HomonymRule | null {
  for (const rule of HOMONYMS) {
    if (rule.match.test(label) && rule.whenDomain.test(domain)) return rule;
  }
  return null;
}

function bodySnippet(body: string): string {
  const plain = stripToPlain(body);
  if (!plain) return '';
  const sentence = plain.split(/(?<=[.!?])\s+/)[0] || plain;
  return clip(sentence, 220);
}

export function resolveVisualSubject(input: VisualPromptInput): {
  visual: string;
  forbid: string[];
} {
  const course = stripToPlain(input.courseTitle);
  const slide = stripToPlain(input.slideTitle);
  const label = stripToPlain(input.panelLabel);
  const body = stripToPlain(input.panelBody);
  const domain = domainText(input);
  const forbid: string[] = [];

  const media = stripToPlain(input.mediaPrompt);
  const mediaUsable = media && !isGenericMediaPrompt(media);

  const homonymLabel = findHomonym(label, domain);
  const homonymSlide = !homonymLabel ? findHomonym(slide, domain) : null;
  const rule = homonymLabel || homonymSlide;
  if (rule) {
    forbid.push(rule.forbid);
    const extra = bodySnippet(body);
    return {
      visual: extra ? `${rule.visual}. Context: ${extra}` : rule.visual,
      forbid,
    };
  }

  if (mediaUsable) {
    return { visual: clip(media, 280), forbid };
  }

  const heading = GENERIC_PANEL_LABEL.test(label) ? slide || course : label || slide || course;
  const extra = bodySnippet(body);
  if (heading && extra) {
    return { visual: `${heading}: ${extra}`, forbid };
  }
  if (extra) return { visual: extra, forbid };
  if (heading) return { visual: heading, forbid };
  return { visual: 'the technical subject of this lesson', forbid };
}

export function withImageNoTextRule(prompt: string): string {
  const p = String(prompt || '').trim();
  if (/HARD RULE: The image must contain absolutely no text/i.test(p)) return p;
  return `${p}\n\n${IMAGE_NO_TEXT_RULE}`;
}

/**
 * Build a generation prompt that prefers the technical meaning of a short
 * label and never asks the model to typeset on-screen titles.
 */
export function buildGroundedVisualPrompt(input: VisualPromptInput): GroundedVisualPrompt {
  const course = stripToPlain(input.courseTitle);
  const moduleTitle = stripToPlain(input.moduleTitle);
  const slide = stripToPlain(input.slideTitle);
  const domain = domainText(input);
  const { visual, forbid } = resolveVisualSubject(input);
  const technical = TECHNICAL_DOMAIN.test(domain) && !PEOPLE_OK_DOMAIN.test(domain);

  const domainLine = [course, moduleTitle, slide].filter(Boolean).join(' / ');
  const peopleRule = technical
    ? 'Do not show people, faces, office drama, handshakes, or staged workplace acting. Show materials, equipment, or a lab/plant setting.'
    : 'No close-up faces. People only if the lesson is clearly about human skills or safety culture.';

  const prompt = withImageNoTextRule(
    [
      `Photorealistic educational photograph of: ${clip(visual, 360)}.`,
      domainLine
        ? `Course domain (for meaning only — never typeset these words): ${clip(domainLine, 180)}.`
        : '',
      `Show that technical/industrial meaning only — not a metaphor, acronym joke, or everyday-English pun on a short label.`,
      peopleRule,
      `Wide landscape, clean professional lighting, the subject filling most of the frame.`,
      `The player already shows titles and captions — the picture must be unlabeled.`,
    ]
      .filter(Boolean)
      .join(' '),
  );

  const intended = [
    `Technical photo of: ${clip(visual, 220)}`,
    domainLine ? `Domain: ${clip(domainLine, 120)}` : '',
    forbid.length ? `Must not show: ${clip(forbid.join('; '), 180)}` : '',
    'Must contain no readable text, letters, numbers, or labels.',
  ]
    .filter(Boolean)
    .join(' | ');

  return { prompt, intended, visualSubject: visual };
}

/** Cover / module banners: topic photo, still no typeset title. */
export function buildBannerVisualPrompt(subject: string, courseTitle?: string): GroundedVisualPrompt {
  return buildGroundedVisualPrompt({
    courseTitle,
    panelLabel: stripToPlain(subject),
    panelBody: stripToPlain(courseTitle),
  });
}
