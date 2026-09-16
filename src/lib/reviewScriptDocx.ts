/**
 * SME review script: Word download of on-screen text + narration
 * in player / LMS slide order (no screenshots, no round-trip import).
 */
import JSZip from 'jszip';
import { coerceOstText, isSymbolOnlyOstLine } from './formatTabIntroOst';
import { isKnowledgeCheckSlide, slideSkipsNarration } from './enablingCoverage';
import { stripSlideTypePrefix } from './stripSlideTypePrefix';

type AnySlide = Record<string, any>;

interface OstLine {
  text: string;
  level: number;
  kind: 'bullet' | 'number' | 'plain';
}

interface ReviewBlock {
  label: string;
  lines: OstLine[];
  style: 'ost' | 'narration' | 'note';
}

interface ReviewSection {
  heading: string;
  blocks: ReviewBlock[];
}

interface ReviewSlideRow {
  heading: string;
  title: string;
  typeLabel: string;
  moduleLabel?: string;
  sections: ReviewSection[];
}

interface ReviewScriptExtras {
  examQuestions?: any[];
  tocRefs?: Record<string, string>;
}

const CHROME_HEADINGS: Record<string, string> = {
  cover: 'Course Introduction',
  'player-tour': 'Player Tour',
  'course-objectives': 'Course Objectives',
  'exam-intro': 'Mastery Quiz Intro',
  'mastery-exam': 'Quiz Questions',
  'exam-results': 'Quiz Results',
};

const TYPE_LABELS: Record<string, string> = {
  cover: 'Course cover',
  'player-tour': 'Player tour',
  'course-objectives': 'Course objectives',
  'module-cover': 'Module title',
  'module-overview': 'Module overview',
  content: 'Content',
  intro: 'Content',
  'key-takeaways': 'Key takeaways',
  summary: 'Summary',
  'tabbed-horizontal': 'Process / tabs',
  'tabbed-vertical': 'Vertical tabs',
  'folder-explorer': 'Folder explorer',
  'carousel-panel': 'Carousel',
  'click-reveal': 'Click to reveal',
  accordion: 'Accordion',
  timeline: 'Timeline',
  flashcards: 'Flashcards',
  hotspot: 'Hotspot',
  'wheel-diagram': 'Wheel diagram',
  diagram: 'Diagram',
  scenario: 'Scenario',
  quiz: 'Knowledge check',
  'multiple-choice': 'Knowledge check',
  'multiple-answers': 'Knowledge check',
  'multiple-answer': 'Knowledge check',
  'true-false': 'Knowledge check',
  'knowledge-check': 'Knowledge check',
  sorting: 'Knowledge check — sorting',
  matching: 'Knowledge check — matching',
  'drop-targets': 'Knowledge check — drop targets',
  'drag-drop': 'Knowledge check',
  'drag-drop-activity': 'Knowledge check',
  'exam-intro': 'Mastery quiz intro',
  'mastery-exam': 'Mastery quiz',
  'exam-results': 'Quiz results',
  closing: 'Closing',
};

function xmlEscape(s: string): string {
  return String(s || '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function htmlToLines(raw: unknown): string[] {
  const text = coerceOstText(raw).replace(/\r\n/g, '\n');
  if (!text) return [];
  const withBreaks = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1');
  return withBreaks
    .split('\n')
    .map(l => l
      .replace(/^\s*>\s+/, '')
      .replace(/^\s*#{1,6}\s+/, '')
      .replace(/^\s*[-*•]\s+/, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(l => l && l !== '[object Object]' && !isSymbolOnlyOstLine(l));
}

function narrationLines(raw: unknown): string[] {
  return htmlToLines(raw);
}

function firstText(...vals: unknown[]): string[] {
  for (const v of vals) {
    const lines = htmlToLines(v);
    if (lines.length) return lines;
  }
  return [];
}

function typeLabel(slide: AnySlide): string {
  const t = String(slide?.type || '').trim();
  if (TYPE_LABELS[t]) return TYPE_LABELS[t];
  if (isKnowledgeCheckSlide(slide)) return 'Knowledge check';
  return t ? t.replace(/-/g, ' ') : 'Slide';
}

function nestedKind(type: string): { listKey: string; prefix: string } | null {
  if (type === 'tabbed-horizontal' || type === 'tabbed-vertical') {
    return { listKey: 'tabs', prefix: 'Tab' };
  }
  if (type === 'folder-explorer') return { listKey: 'items', prefix: 'Folder' };
  if (type === 'carousel-panel') return { listKey: 'cards', prefix: 'Card' };
  if (type === 'click-reveal' || type === 'accordion') return { listKey: 'items', prefix: 'Item' };
  if (type === 'timeline') return { listKey: 'events', prefix: 'Event' };
  if (type === 'flashcards') return { listKey: 'cards', prefix: 'Card' };
  if (type === 'hotspot') return { listKey: 'hotspots', prefix: 'Hotspot' };
  if (type === 'wheel-diagram') return { listKey: 'segments', prefix: 'Segment' };
  if (type === 'key-takeaways') return { listKey: 'objectives', prefix: 'Takeaway' };
  return null;
}

function listFor(data: any, preferred: string | null): any[] {
  if (!data || typeof data !== 'object') return [];
  if (preferred && Array.isArray(data[preferred]) && data[preferred].length) return data[preferred];
  for (const key of ['tabs', 'items', 'cards', 'events', 'hotspots', 'points', 'segments', 'steps', 'pairs', 'objectives']) {
    if (Array.isArray(data[key]) && data[key].length) return data[key];
  }
  return [];
}

function itemHeading(item: any, index: number, prefix: string): string {
  const year = firstText(item?.year).join(' ');
  const title = firstText(item?.title, item?.heading).join(' ');
  if (year && title) return `${prefix}: ${year} — ${title}`;
  const label = firstText(
    item?.label,
    item?.title,
    item?.term,
    item?.year,
    item?.heading,
    item?.name,
    item?.front,
  ).join(' ');
  if (label) return `${prefix}: ${label}`;
  return `${prefix} ${index + 1}`;
}

function parseOstLine(line: string): OstLine {
  const raw = String(line || '');
  const dashed = raw.match(/^[—–]\s+(.*)$/);
  if (dashed) return { text: dashed[1], level: 1, kind: 'bullet' };
  return { text: raw, level: 0, kind: 'bullet' };
}

function toOstLines(lines: string[]): OstLine[] {
  return lines.map(parseOstLine);
}

function uniqueOst(...groups: OstLine[][]): OstLine[] {
  const seen = new Set<string>();
  const out: OstLine[] = [];
  for (const group of groups) {
    for (const line of group) {
      const key = line.text.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(line);
    }
  }
  return out;
}

function uniqueLines(...groups: string[][]): string[] {
  return uniqueOst(...groups.map(toOstLines)).map(l => l.text);
}

function itemOst(item: any): string[] {
  return uniqueLines(
    htmlToLines(item?.content),
    htmlToLines(item?.definition),
    htmlToLines(item?.description),
    htmlToLines(item?.expandedContent),
    htmlToLines(item?.back),
    htmlToLines(item?.body),
    htmlToLines(item?.text),
  );
}

function itemNarration(item: any): string[] {
  return narrationLines(item?.voiceOverText || item?.narration);
}

function quizOptions(data: any): string[] {
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.options)) {
    return data.options.flatMap((o: any, i: number) => {
      const t = firstText(o?.text, o?.label, o?.content, typeof o === 'string' ? o : '').join(' ');
      return t ? [`${String.fromCharCode(65 + (i % 26))}. ${t}`] : [];
    });
  }
  if (Array.isArray(data.pairs)) {
    return data.pairs.flatMap((p: any) => {
      const term = firstText(p?.term, p?.left).join(' ');
      const def = firstText(p?.definition, p?.right, p?.match).join(' ');
      if (term && def) return [`${term} → ${def}`];
      return term ? [term] : [];
    });
  }
  if (Array.isArray(data.items)) {
    return data.items.flatMap((it: any) => firstText(it?.content, it?.label, it?.text));
  }
  return [];
}

function objectiveOst(raw: unknown): OstLine[] {
  if (!Array.isArray(raw) || !raw.length) return [];
  const out: OstLine[] = [];
  let n = 0;
  for (const obj of raw) {
    if (typeof obj === 'string') {
      const t = obj.trim();
      if (!t) continue;
      n += 1;
      out.push({ text: `${n}. ${t}`, level: 0, kind: 'number' });
      continue;
    }
    const term = String(obj?.terminalObjective || '').trim();
    if (term) {
      n += 1;
      out.push({ text: `${n}. ${term}`, level: 0, kind: 'number' });
    }
    for (const en of obj?.enablingObjectives || []) {
      const e = String(en || '').trim();
      if (e) out.push({ text: e, level: 1, kind: 'bullet' });
    }
  }
  return out;
}

function ostAndNarrationBlocks(ost: OstLine[] | string[], narration: string[], silent: boolean): ReviewBlock[] {
  const ostLines = Array.isArray(ost) && ost.length && typeof ost[0] === 'object'
    ? (ost as OstLine[])
    : toOstLines((ost as string[]) || []);
  const blocks: ReviewBlock[] = [];
  blocks.push({
    label: 'On-screen text',
    lines: ostLines.length ? ostLines : [{ text: '(No on-screen text)', level: 0, kind: 'plain' }],
    style: 'ost',
  });
  if (silent) {
    blocks.push({
      label: 'Narration',
      lines: [{
        text: 'No narration — knowledge checks and the mastery quiz are silent.',
        level: 0,
        kind: 'plain',
      }],
      style: 'note',
    });
  } else {
    const narr = narration.length ? narration : ['(No narration script)'];
    blocks.push({
      label: 'Narration',
      lines: narr.map(t => ({ text: t, level: 0, kind: 'plain' as const })),
      style: 'narration',
    });
  }
  return blocks;
}

function inferTocRefs(slides: AnySlide[]): Record<string, string> {
  const refs: Record<string, string> = {};
  const skip = new Set([
    'cover', 'player-tour', 'course-objectives', 'module-cover',
    'exam-intro', 'mastery-exam', 'exam-results', 'closing',
  ]);
  let moduleNum = 0;
  let n = 0;
  for (const slide of slides) {
    if (!slide) continue;
    const type = String(slide.type || '');
    const id = String(slide.id || '');
    if (type === 'module-cover' || id.startsWith('__module-cover-')) {
      const m = id.match(/__module-cover-(\d+)__/);
      moduleNum = Number(slide._moduleNumber) || (m ? Number(m[1]) : moduleNum + 1);
      n = 0;
      continue;
    }
    if (skip.has(type)) continue;
    const overview = id.match(/__module-overview-(\d+)__/);
    if (overview) {
      moduleNum = Number(overview[1]);
      n = 0;
    } else if (!moduleNum) {
      moduleNum = 1;
    }
    n += 1;
    if (id) refs[id] = `${moduleNum}.${n}`;
  }
  return refs;
}

function playerHeading(slide: AnySlide, tocRef?: string): string {
  const type = String(slide?.type || '');
  const title = stripSlideTypePrefix(String(slide?.title || 'Untitled slide')).trim() || 'Untitled slide';
  if (CHROME_HEADINGS[type]) return CHROME_HEADINGS[type];
  if (type === 'closing') return title || 'Thank You';
  if (type === 'module-cover') return title;
  if (tocRef) return `Slide ${tocRef} — ${title}`;
  return title;
}

export function buildReviewScriptModel(
  slides: AnySlide[],
  extras?: ReviewScriptExtras,
): ReviewSlideRow[] {
  const examQuestions = Array.isArray(extras?.examQuestions) ? extras!.examQuestions! : [];
  const tocRefs = { ...inferTocRefs(slides), ...(extras?.tocRefs || {}) };
  let moduleLabel = '';
  const rows: ReviewSlideRow[] = [];

  slides.forEach((slide) => {
    if (!slide) return;
    const type = String(slide.type || '');
    const id = String(slide.id || '');
    if (id.startsWith('__module-cover-') || type === 'module-cover') {
      moduleLabel = stripSlideTypePrefix(String(slide.title || slide._moduleTitle || '')).trim();
    }

    const silent = slideSkipsNarration(slide);
    const kind = nestedKind(type);
    const data = slide.data && typeof slide.data === 'object' ? slide.data : {};
    const nested = listFor(data, kind?.listKey || null);
    const prefix = kind?.prefix || 'Item';

    const introOst = toOstLines(uniqueLines(
      htmlToLines(slide.content),
      htmlToLines(data.introContent),
      htmlToLines(data.prompt),
      htmlToLines(data.question),
      htmlToLines(data.questionText),
      htmlToLines(data.introduction),
    ));
    const introNarr = silent ? [] : narrationLines(slide.voiceOverText || slide.narration);
    const ost = uniqueOst(objectiveOst(slide._objectives), introOst);

    const sections: ReviewSection[] = [];

    if (type === 'mastery-exam') {
      if (!examQuestions.length) {
        sections.push({
          heading: 'Questions',
          blocks: [{
            label: 'Note',
            lines: [{ text: 'No mastery-quiz questions were attached to this course.', level: 0, kind: 'plain' }],
            style: 'note',
          }],
        });
      } else {
        examQuestions.forEach((q: any, qi: number) => {
          const qOst = firstText(q?.question, q?.prompt, q?.questionText);
          const opts = quizOptions(q);
          const blocks: ReviewBlock[] = [
            {
              label: 'On-screen text',
              lines: qOst.length ? toOstLines(qOst) : [{ text: '(No question text)', level: 0, kind: 'plain' }],
              style: 'ost',
            },
          ];
          if (opts.length) blocks.push({ label: 'Options', lines: toOstLines(opts), style: 'ost' });
          blocks.push({
            label: 'Narration',
            lines: [{
              text: 'No narration — knowledge checks and the mastery quiz are silent.',
              level: 0,
              kind: 'plain',
            }],
            style: 'note',
          });
          sections.push({ heading: `Question ${qi + 1}`, blocks });
        });
      }
    } else if (isKnowledgeCheckSlide(slide)) {
      const qOst = ost.length ? ost : toOstLines(firstText(data.question, data.questionText, data.prompt, slide.content));
      const opts = quizOptions(data);
      const blocks = ostAndNarrationBlocks(qOst, [], true);
      if (opts.length) {
        blocks.splice(1, 0, { label: 'Options / items', lines: toOstLines(opts), style: 'ost' });
      }
      sections.push({ heading: 'Question', blocks });
    } else if (silent) {
      sections.push({
        heading: 'Slide',
        blocks: ostAndNarrationBlocks(ost, [], true),
      });
    } else if (nested.length) {
      if (ost.length || introNarr.length) {
        sections.push({
          heading: 'Introduction',
          blocks: ostAndNarrationBlocks(ost, introNarr, false),
        });
      }
      nested.forEach((item, i) => {
        sections.push({
          heading: itemHeading(item, i, prefix),
          blocks: ostAndNarrationBlocks(itemOst(item), itemNarration(item), false),
        });
      });
    } else {
      sections.push({
        heading: 'Slide',
        blocks: ostAndNarrationBlocks(ost, introNarr, false),
      });
    }

    const title = stripSlideTypePrefix(String(slide.title || 'Untitled slide')).trim() || 'Untitled slide';
    rows.push({
      heading: playerHeading(slide, tocRefs[id]),
      title,
      typeLabel: typeLabel(slide),
      moduleLabel: moduleLabel || undefined,
      sections,
    });
  });

  return rows;
}

function wText(text: string): string {
  const t = xmlEscape(text);
  const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
  return `<w:r><w:t${space}>${t}</w:t></w:r>`;
}

function wP(text: string, style?: string, italic?: boolean): string {
  const pPr = style
    ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`
    : italic
      ? '<w:pPr><w:rPr><w:i/></w:rPr></w:pPr>'
      : '';
  if (!text) return `<w:p>${pPr}</w:p>`;
  if (italic && !style) {
    const t = xmlEscape(text);
    const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
    return `<w:p><w:pPr><w:rPr><w:i/></w:rPr></w:pPr><w:r><w:rPr><w:i/></w:rPr><w:t${space}>${t}</w:t></w:r></w:p>`;
  }
  return `<w:p>${pPr}${wText(text)}</w:p>`;
}

function wOstLine(line: OstLine): string {
  const text = line.text;
  if (line.kind === 'plain') {
    return wP(text);
  }
  if (line.kind === 'number') {
    const t = xmlEscape(text);
    const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
    return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t${space}>${t}</w:t></w:r></w:p>`;
  }
  const level = Math.max(0, line.level || 0);
  const left = 360 + level * 360;
  return `<w:p><w:pPr><w:ind w:left="${left}" w:hanging="180"/><w:spacing w:after="40"/></w:pPr>${wText(`• ${text}`)}</w:p>`;
}

function headingLooksLikeType(heading: string, typeLabel: string): boolean {
  const h = heading.replace(/^Slide\s+[\d.]+\s+[—–-]\s+/, '').trim().toLowerCase();
  return h === typeLabel.trim().toLowerCase();
}

function documentXml(courseTitle: string, rows: ReviewSlideRow[]): string {
  const parts: string[] = [];
  parts.push(wP(courseTitle || 'Untitled course', 'Title'));
  parts.push(wP('Review script — on-screen text and narration', 'Subtitle'));
  parts.push(wP(
    'Headings match the table of contents (Course Objectives, Slide 1.1, and so on). '
    + 'Mark up this file and send slide + section notes for edits. '
    + 'This document does not update the course automatically.',
  ));
  parts.push(wP(`Generated ${new Date().toISOString().slice(0, 10)}.`));

  for (const row of rows) {
    const mod = row.moduleLabel ? ` · ${row.moduleLabel}` : '';
    parts.push(wP(row.heading, 'Heading1'));
    if (!headingLooksLikeType(row.heading, row.typeLabel)) {
      parts.push(wP(`${row.typeLabel}${mod}`, 'Heading2'));
    }
    for (const section of row.sections) {
      if (section.heading && section.heading !== 'Slide') {
        parts.push(wP(section.heading, 'Heading2'));
      }
      for (const block of section.blocks) {
        parts.push(wP(block.label));
        if (block.style === 'note' || block.style === 'narration') {
          for (const line of block.lines) parts.push(wP(line.text, undefined, true));
        } else {
          for (const line of block.lines) parts.push(wOstLine(line));
        }
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${parts.join('\n    ')}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>
  </w:body>
</w:document>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="360" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="60"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr></w:style>
</w:styles>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

function safeFileStem(title: string): string {
  const stem = String(title || 'course').replace(/[<>:"/\\|?*\x00-\x1F]/g, ' ').replace(/\s+/g, ' ').trim();
  return (stem || 'course').slice(0, 80);
}

export async function buildReviewScriptDocxBlob(
  courseTitle: string,
  slides: AnySlide[],
  extras?: ReviewScriptExtras,
): Promise<Blob> {
  const rows = buildReviewScriptModel(slides, extras);
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.folder('_rels')!.file('.rels', RELS);
  const word = zip.folder('word')!;
  word.file('document.xml', documentXml(courseTitle, rows));
  word.file('styles.xml', STYLES_XML);
  word.folder('_rels')!.file('document.xml.rels', DOC_RELS);
  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
  });
  return new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export async function downloadReviewScriptDocx(
  courseTitle: string,
  slides: AnySlide[],
  extras?: ReviewScriptExtras,
): Promise<void> {
  const blob = await buildReviewScriptDocxBlob(courseTitle, slides, extras);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeFileStem(courseTitle)}_review_script.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
