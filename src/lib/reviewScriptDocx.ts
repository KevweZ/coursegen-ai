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

function optionText(o: any): string {
  return firstText(o?.text, o?.label, o?.content, typeof o === 'string' ? o : '').join(' ');
}

function isOptionCorrect(o: any, i: number, data: any): boolean {
  if (o && typeof o === 'object' && (o.isCorrect === true || o.correct === true)) return true;
  const ca = data?.correctAnswer;
  if (ca == null) return false;
  if (typeof ca === 'number') return ca === i;
  if (typeof ca === 'string') {
    if (typeof o === 'string') return o === ca;
    return ca === String(o?.id || '') || ca === String(o?.text || '');
  }
  if (Array.isArray(ca)) {
    if (ca.includes(i)) return true;
    if (o && typeof o === 'object') return ca.includes(o.id) || ca.includes(o.text);
  }
  return false;
}

function quizOptionBlock(data: any): { label: string; lines: OstLine[] } | null {
  if (!data || typeof data !== 'object') return null;

  if (Array.isArray(data.options) && data.options.length) {
    const lines = data.options.flatMap((o: any, i: number) => {
      const t = optionText(o);
      if (!t) return [];
      const letter = `${String.fromCharCode(65 + (i % 26))}. ${t}`;
      return [{
        text: isOptionCorrect(o, i, data) ? `${letter}    ✓ Correct` : letter,
        level: 0,
        kind: 'bullet' as const,
      }];
    });
    return lines.length ? { label: 'Options', lines } : null;
  }

  if (Array.isArray(data.pairs) && data.pairs.length) {
    const lines = data.pairs.flatMap((p: any) => {
      const term = firstText(p?.term, p?.left).join(' ');
      const def = firstText(p?.definition, p?.right, p?.match).join(' ');
      if (term && def) return [{ text: `${term} → ${def}    ✓ Correct`, level: 0, kind: 'bullet' as const }];
      return term ? [{ text: `${term}    ✓ Correct`, level: 0, kind: 'bullet' as const }] : [];
    });
    return lines.length ? { label: 'Correct matches', lines } : null;
  }

  if (Array.isArray(data.correctOrder) && data.correctOrder.length && Array.isArray(data.items)) {
    const byId = new Map((data.items as any[]).map((it: any) => [String(it?.id ?? ''), it]));
    const lines = data.correctOrder.map((id: any, i: number) => {
      const it = byId.get(String(id));
      const t = firstText(it?.content, it?.label, it?.text, typeof it === 'string' ? it : '').join(' ') || String(id);
      return { text: `${i + 1}. ${t}    ✓ Correct order`, level: 0, kind: 'number' as const };
    });
    return lines.length ? { label: 'Correct order', lines } : null;
  }

  if (Array.isArray(data.items) && Array.isArray(data.targets) && data.correctAnswers && typeof data.correctAnswers === 'object') {
    const items = data.items as any[];
    const targets = data.targets as any[];
    const map = data.correctAnswers as Record<string, string>;
    const lines = Object.entries(map).flatMap(([itemId, targetId]) => {
      const item = items.find((it: any) => String(it?.id) === String(itemId));
      const target = targets.find((it: any) => String(it?.id) === String(targetId));
      const left = firstText(item?.content, item?.label, item?.text, itemId).join(' ');
      const right = firstText(target?.content, target?.label, target?.text, targetId).join(' ');
      if (!left && !right) return [];
      return [{ text: `${left} → ${right}    ✓ Correct`, level: 0, kind: 'bullet' as const }];
    });
    return lines.length ? { label: 'Correct matches', lines } : null;
  }

  if (Array.isArray(data.items) && data.items.length) {
    const lines = (data.items as any[]).flatMap((it: any) => {
      const t = firstText(it?.content, it?.label, it?.text).join(' ');
      return t ? [{ text: t, level: 0, kind: 'bullet' as const }] : [];
    });
    return lines.length ? { label: 'Options / items', lines } : null;
  }

  return null;
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
          const opts = quizOptionBlock(q);
          const blocks: ReviewBlock[] = [
            {
              label: 'On-screen text',
              lines: qOst.length ? toOstLines(qOst) : [{ text: '(No question text)', level: 0, kind: 'plain' }],
              style: 'ost',
            },
          ];
          if (opts) blocks.push({ label: opts.label, lines: opts.lines, style: 'ost' });
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
      const opts = quizOptionBlock(data);
      const blocks = ostAndNarrationBlocks(qOst, [], true);
      if (opts) {
        blocks.splice(1, 0, { label: opts.label, lines: opts.lines, style: 'ost' });
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
    ? `<w:pPr><w:pStyle w:val="${style}"/>${italic ? '<w:rPr><w:i/></w:rPr>' : ''}</w:pPr>`
    : italic
      ? '<w:pPr><w:rPr><w:i/></w:rPr></w:pPr>'
      : '';
  if (!text) return `<w:p>${pPr}</w:p>`;
  if (italic) {
    const t = xmlEscape(text);
    const space = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
    return `<w:p>${pPr}<w:r><w:rPr><w:i/></w:rPr><w:t${space}>${t}</w:t></w:r></w:p>`;
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
  return `<w:p><w:pPr><w:ind w:left="${left}" w:hanging="180"/><w:spacing w:after="60"/></w:pPr>${wText(`• ${text}`)}</w:p>`;
}

function headingLooksLikeType(heading: string, typeLabel: string): boolean {
  const h = heading.replace(/^Slide\s+[\d.]+\s+[—–-]\s+/, '').trim().toLowerCase();
  return h === typeLabel.trim().toLowerCase();
}

function wBlockLabel(label: string, style: ReviewBlock['style']): string {
  if (style === 'narration' || style === 'note') return wP(label, 'LabelNarration');
  return wP(label, 'LabelOst');
}

function documentXml(courseTitle: string, rows: ReviewSlideRow[]): string {
  const parts: string[] = [];
  parts.push(wP(courseTitle || 'Untitled course', 'Title'));

  rows.forEach((row, index) => {
    const mod = row.moduleLabel ? ` · ${row.moduleLabel}` : '';
    parts.push(wP(row.heading, index === 0 ? 'Heading1First' : 'Heading1'));
    if (!headingLooksLikeType(row.heading, row.typeLabel)) {
      parts.push(wP(`${row.typeLabel}${mod}`, 'Heading2'));
    }
    for (const section of row.sections) {
      if (section.heading && section.heading !== 'Slide') {
        parts.push(wP(section.heading, 'Heading2'));
      }
      for (const block of section.blocks) {
        parts.push(wBlockLabel(block.label, block.style));
        if (block.style === 'note' || block.style === 'narration') {
          for (const line of block.lines) parts.push(wP(line.text, 'NarrationBody', true));
        } else {
          for (const line of block.lines) parts.push(wOstLine(line));
        }
      }
    }
  });

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
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="240"/></w:pPr><w:rPr><w:b/><w:sz w:val="48"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1First"><w:name w:val="Slide heading first"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120" w:after="80"/><w:pbdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="CBD5E1"/></w:pbdr></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="560" w:after="80"/><w:pbdr><w:top w:val="single" w:sz="12" w:space="18" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="6" w:space="4" w:color="E2E8F0"/></w:pbdr></w:pPr><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="280" w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="LabelOst"><w:name w:val="On-screen text label"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr><w:rPr><w:b/><w:caps/><w:sz w:val="20"/><w:color w:val="0F766E"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="LabelNarration"><w:name w:val="Narration label"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="280" w:after="80"/></w:pPr><w:rPr><w:b/><w:caps/><w:sz w:val="20"/><w:color w:val="4338CA"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="NarrationBody"><w:name w:val="Narration body"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/><w:ind w:left="180"/></w:pPr><w:rPr><w:i/><w:sz w:val="22"/><w:color w:val="334155"/></w:rPr></w:style>
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
