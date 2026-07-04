import JSZip from 'jszip';
import { CourseOutline } from '../types/course';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ScormVersion = '1.2' | '2004';

export interface ScormExportOptions {
  version?: ScormVersion;
  /** 0–100; defaults to course.examConfig?.passingScore ?? 80 */
  masteryScore?: number;
  language?: string;
  onProgress?: (pct: number) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanitisation: strip large binary data before embedding in the package
// ─────────────────────────────────────────────────────────────────────────────

function isLargeBlob(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  return v.startsWith('data:') || v.startsWith('blob:');
}

function sanitizeCourseForExport(course: CourseOutline): CourseOutline {
  return {
    ...course,
    modules: course.modules.map(mod => ({
      ...mod,
      slides: mod.slides.map((slide: any) => {
        const cleaned: any = {};
        for (const [k, v] of Object.entries(slide)) {
          // Drop any key whose value is a large data-URI or blob-URL
          if (isLargeBlob(v)) continue;
          cleaned[k] = v;
        }
        return cleaned;
      }),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Rough estimation: 2 minutes per 10 slides */
function estimateDurationISO(totalSlides: number): string {
  const minutes = Math.max(5, Math.round(totalSlides * 2));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `PT${h}H${m}M` : `PT${m}M`;
}

function countSlides(course: CourseOutline): number {
  return course.modules.reduce((sum, mod) => sum + mod.slides.length, 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// imsmanifest.xml — SCORM 1.2
// ─────────────────────────────────────────────────────────────────────────────

function buildScorm12Manifest(course: CourseOutline, masteryScore: number, lang: string): string {
  const id = `CourseGen_${Date.now()}`;
  const title = escapeXml(course.title);
  const desc  = escapeXml(course.description || course.title);
  const totalSlides = countSlides(course);
  const duration = estimateDurationISO(totalSlides);

  let slideGlobalIdx = 0;
  const moduleItems = course.modules.map((mod, mIdx) => {
    const modTitle = escapeXml(mod.title);
    const slideItems = mod.slides.map((slide) => {
      const idx = slideGlobalIdx++;
      const sTitle = escapeXml(slide.title);
      return `      <item identifier="item_m${mIdx}_s${idx}" identifierref="res_sco" parameters="?slide=${idx}">
        <title>${sTitle}</title>
      </item>`;
    }).join('\n');
    return `    <item identifier="item_mod_${mIdx}">
      <title>${modTitle}</title>
${slideItems}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:lom="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title><lom:langstring xml:lang="${lang}">${title}</lom:langstring></lom:title>
        <lom:description><lom:langstring xml:lang="${lang}">${desc}</lom:langstring></lom:description>
        <lom:language>${lang}</lom:language>
      </lom:general>
      <lom:educational>
        <lom:typicallearningtime><lom:datetime>${duration}</lom:datetime></lom:typicallearningtime>
      </lom:educational>
      <lom:technical>
        <lom:format>text/html</lom:format>
      </lom:technical>
    </lom:lom>
  </metadata>
  <organizations default="org_main">
    <organization identifier="org_main">
      <title>${title}</title>
${moduleItems}
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_sco" type="webcontent" adlcp:scormtype="sco" href="story.html">
      <file href="story.html"/>
      <file href="index.html"/>
      <file href="scorm_bridge.js"/>
      <file href="course_data.js"/>
    </resource>
  </resources>
</manifest>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// imsmanifest.xml — SCORM 2004 3rd Edition
// ─────────────────────────────────────────────────────────────────────────────

function buildScorm2004Manifest(course: CourseOutline, masteryScore: number, lang: string): string {
  const id = `CourseGen_${Date.now()}`;
  const title = escapeXml(course.title);
  const desc  = escapeXml(course.description || course.title);
  const totalSlides = countSlides(course);
  const duration = estimateDurationISO(totalSlides);

  let slideGlobalIdx = 0;
  const moduleItems = course.modules.map((mod, mIdx) => {
    const modTitle = escapeXml(mod.title);
    const slideItems = mod.slides.map((slide) => {
      const idx = slideGlobalIdx++;
      const sTitle = escapeXml(slide.title);
      return `      <item identifier="item_m${mIdx}_s${idx}" identifierref="res_sco" parameters="?slide=${idx}">
        <title>${sTitle}</title>
      </item>`;
    }).join('\n');
    return `    <item identifier="item_mod_${mIdx}">
      <title>${modTitle}</title>
${slideItems}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${id}" version="1"
          xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
          xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
          xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
          xmlns:imsss="http://www.imsglobal.org/xsd/imsss"
          xmlns:lom="http://ltsc.ieee.org/xsd/LOM"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd
                              http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                              http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                              http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd
                              http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 3rd Edition</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title><lom:string language="${lang}">${title}</lom:string></lom:title>
        <lom:description><lom:string language="${lang}">${desc}</lom:string></lom:description>
        <lom:language>${lang}</lom:language>
      </lom:general>
      <lom:educational>
        <lom:typicalLearningTime><lom:duration>${duration}</lom:duration></lom:typicalLearningTime>
      </lom:educational>
    </lom:lom>
  </metadata>
  <organizations default="org_main">
    <organization identifier="org_main" adlseq:objectivesGlobalToSystem="false">
      <title>${title}</title>
${moduleItems}
      <imsss:sequencing>
        <imsss:objectives>
          <imsss:primaryObjective objectiveID="obj_main" satisfiedByMeasure="true">
            <imsss:minNormalizedMeasure>${(masteryScore / 100).toFixed(2)}</imsss:minNormalizedMeasure>
          </imsss:primaryObjective>
        </imsss:objectives>
        <imsss:deliveryControls completionSetByContent="true" objectiveSetByContent="true"/>
      </imsss:sequencing>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_sco" type="webcontent" adlcp:scormType="sco" href="story.html">
      <file href="story.html"/>
      <file href="index.html"/>
      <file href="scorm_bridge.js"/>
      <file href="course_data.js"/>
    </resource>
  </resources>
</manifest>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORM Bridge JS — works with both 1.2 and 2004 APIs
// Injected as scorm_bridge.js into the SCORM package
// ─────────────────────────────────────────────────────────────────────────────

function buildScormBridgeJS(totalSlides: number, masteryScore: number): string {
  return `/* CourseGen AI — SCORM Completion Bridge v2.0
 * Auto-detects SCORM 2004 (API_1484_11) or 1.2 (API) and reports completion.
 * Marks complete when learner reaches the final slide OR receives a postMessage.
 */
(function () {
  var TOTAL_SLIDES   = ${totalSlides};
  var MASTERY_SCORE  = ${masteryScore};

  var visited   = {};
  var SCORM     = null;
  var apiVer    = null; // '2004' | '1.2' | null
  var started   = false;
  var completed = false;

  // ── API discovery ──────────────────────────────────────────────────────────
  function findApi(win) {
    var tries = 0;
    while (tries < 300) {
      if (win.API_1484_11) return { api: win.API_1484_11, v: '2004' };
      if (win.API)         return { api: win.API,         v: '1.2'  };
      if (win.parent && win.parent !== win) { win = win.parent; tries++; }
      else break;
    }
    return null;
  }

  function discover() {
    var found = findApi(window);
    if (!found && window.opener) found = findApi(window.opener);
    if (found) { SCORM = found.api; apiVer = found.v; }
  }

  // ── API wrappers ───────────────────────────────────────────────────────────
  function lmsInit() {
    if (!SCORM || started) return;
    started = true;
    if (apiVer === '2004') { SCORM.Initialize(''); }
    else                   { SCORM.LMSInitialize(''); }
  }

  function lmsSet(key2004, key12, val) {
    if (!SCORM) return;
    try {
      if (apiVer === '2004') SCORM.SetValue(key2004, val);
      else                   SCORM.LMSSetValue(key12,   val);
    } catch(e) {}
  }

  function lmsCommit() {
    if (!SCORM) return;
    try {
      if (apiVer === '2004') SCORM.Commit('');
      else                   SCORM.LMSCommit('');
    } catch(e) {}
  }

  function lmsTerminate() {
    if (!SCORM) return;
    try {
      if (apiVer === '2004') SCORM.Terminate('');
      else                   SCORM.LMSFinish('');
    } catch(e) {}
  }

  // ── Completion ─────────────────────────────────────────────────────────────
  function markIncomplete() {
    lmsSet('cmi.completion_status', 'cmi.core.lesson_status', 'incomplete');
    lmsCommit();
  }

  function markComplete(rawScore) {
    if (completed) return;
    completed = true;
    rawScore = Math.min(100, Math.max(0, Math.round(rawScore || 100)));
    var passed = rawScore >= MASTERY_SCORE;
    var scaled  = (rawScore / 100).toFixed(2);
    lmsSet('cmi.score.raw',         'cmi.core.score.raw',  String(rawScore));
    lmsSet('cmi.score.min',         'cmi.core.score.min',  '0');
    lmsSet('cmi.score.max',         'cmi.core.score.max',  '100');
    lmsSet('cmi.score.scaled',      '',                    scaled);
    lmsSet('cmi.success_status',    '',                    passed ? 'passed' : 'failed');
    lmsSet('cmi.completion_status', 'cmi.core.lesson_status', passed ? 'passed' : 'completed');
    lmsCommit();
  }

  // ── Slide tracking ─────────────────────────────────────────────────────────
  function recordSlide(idx) {
    if (idx < 0 || idx >= TOTAL_SLIDES) return;
    visited[idx] = true;
    if (idx >= TOTAL_SLIDES - 1) markComplete(100);
  }

  function parseSlideFromUrl() {
    try {
      var search = window.location.search + '&' + window.location.hash;
      var m = search.match(/[?&#]slide=(\\d+)/);
      if (m) recordSlide(parseInt(m[1], 10));
    } catch(e) {}
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  function boot() {
    discover();
    lmsInit();
    markIncomplete();
    parseSlideFromUrl();

    // Poll for SPA URL changes (hash/search driven navigation)
    var lastUrl = window.location.href;
    setInterval(function () {
      var cur = window.location.href;
      if (cur !== lastUrl) { lastUrl = cur; parseSlideFromUrl(); }
    }, 600);
  }

  // ── postMessage bridge (React app can also call this directly) ─────────────
  window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'COURSE_COMPLETE') markComplete(e.data.score);
    if (e.data.type === 'SLIDE_CHANGE')   recordSlide(e.data.slideIndex || 0);
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  window.addEventListener('beforeunload', function () {
    lmsCommit();
    lmsTerminate();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy SCORM 1.2 XSD stubs (required by some strict LMS validators)
// ─────────────────────────────────────────────────────────────────────────────

const XSD_ADLCP = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.adlnet.org/xsd/adlcp_rootv1p2" elementFormDefault="qualified" attributeFormDefault="unqualified"><xs:import namespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2"/><xs:attribute name="scormtype"><xs:simpleType><xs:restriction base="xs:string"><xs:enumeration value="sco"/><xs:enumeration value="asset"/></xs:restriction></xs:simpleType></xs:attribute></xs:schema>`;
const XSD_IMS_XML = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.w3.org/XML/1998/namespace"><xs:attribute name="lang" type="xs:language"/><xs:attribute name="space"><xs:simpleType><xs:restriction base="xs:NCName"><xs:enumeration value="default"/><xs:enumeration value="preserve"/></xs:restriction></xs:simpleType></xs:attribute></xs:schema>`;
const XSD_IMS_CP = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2"><xs:element name="manifest"/><xs:element name="organizations"/><xs:element name="resources"/></xs:schema>`;
const XSD_IMS_MD = `<?xml version="1.0" encoding="UTF-8"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1"><xs:element name="lom"/></xs:schema>`;

// ─────────────────────────────────────────────────────────────────────────────
// Main export function
// ─────────────────────────────────────────────────────────────────────────────

export async function createScormPackage(
  course: CourseOutline,
  options: ScormExportOptions = {},
): Promise<Blob> {
  const {
    version      = '1.2',
    language     = 'en',
    onProgress,
  } = options;

  const masteryScore = options.masteryScore
    ?? (course as any).examConfig?.passingScore
    ?? 80;

  const report = (pct: number) => onProgress?.(pct);
  report(5);

  const zip = new JSZip();
  const totalSlides = countSlides(course);

  // ── 1. imsmanifest.xml ────────────────────────────────────────────────────
  const manifest = version === '2004'
    ? buildScorm2004Manifest(course, masteryScore, language)
    : buildScorm12Manifest(course, masteryScore, language);

  zip.file('imsmanifest.xml', manifest);
  report(10);

  // ── 2. SCORM schema stubs (1.2 only; 2004 validators are more lenient) ───
  if (version === '1.2') {
    zip.file('adlcp_rootv1p2.xsd',    XSD_ADLCP);
    zip.file('ims_xml.xsd',           XSD_IMS_XML);
    zip.file('imscp_rootv1p1p2.xsd',  XSD_IMS_CP);
    zip.file('imsmd_rootv1p2p1.xsd',  XSD_IMS_MD);
  }
  report(15);

  // ── 3. SCORM completion bridge ────────────────────────────────────────────
  zip.file('scorm_bridge.js', buildScormBridgeJS(totalSlides, masteryScore));
  report(20);

  // ── 4. Course data as external JS (prevents huge inline <script>) ─────────
  const sanitised = sanitizeCourseForExport(course);
  const examConfigJson = (course as any).examConfig
    ? JSON.stringify((course as any).examConfig)
    : 'null';
  const courseDataJs = [
    `/* CourseGen AI — Course Data */`,
    `window.__COURSE_DATA__ = ${JSON.stringify(sanitised)};`,
    `window.__EXAM_CONFIG__ = ${examConfigJson};`,
    `window.__SCORM_VERSION__ = '${version}';`,
    `window.__MASTERY_SCORE__ = ${masteryScore};`,
  ].join('\n');
  zip.file('course_data.js', courseDataJs);
  report(25);

  // ── 5. Fetch SCORM player bundle ──────────────────────────────────────────
  try {
    const htmlRes = await fetch('/scorm-player/index.html');
    if (!htmlRes.ok) {
      throw new Error(
        `SCORM Player bundle not found (HTTP ${htmlRes.status}). ` +
        `Run 'npm run build:player' first, then retry.`,
      );
    }

    let html = await htmlRes.text();
    if (!html?.trim()) {
      throw new Error('SCORM Player build is empty. Re-run npm run build:player.');
    }
    report(40);

    // Fetch all JS/CSS assets referenced in the HTML
    const assetRegex = /(?:src|href)="([^"]+\.(?:js|css))"/g;
    const assetPaths: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = assetRegex.exec(html)) !== null) {
      const p = m[1];
      if (p.startsWith('./'))      assetPaths.push(p.slice(2));
      else if (p.startsWith('/')) assetPaths.push(p.slice(1));
      else                         assetPaths.push(p);
    }

    let fetched = 0;
    for (const assetPath of assetPaths) {
      const res = await fetch('/scorm-player/' + assetPath);
      if (res.ok) zip.file(assetPath, await res.blob());
      else console.warn('[SCORM] Could not fetch asset:', assetPath);
      fetched++;
      report(40 + Math.round((fetched / Math.max(assetPaths.length, 1)) * 40));
    }
    report(80);

    // ── 6. Inject scorm_bridge.js + course_data.js into HTML ─────────────────
    //    Inject bridge in <head> so it runs before the React app boots
    const headClose = html.lastIndexOf('</head>');
    if (headClose !== -1) {
      html =
        html.slice(0, headClose) +
        '\n<script src="scorm_bridge.js"></script>\n' +
        '\n<script src="course_data.js"></script>\n' +
        html.slice(headClose);
    }

    // Remove any leftover __COURSE_DATA__ inline injection from older builds
    html = html.replace(
      /<script>\s*window\.__COURSE_DATA__[\s\S]*?<\/script>/g,
      '',
    );
    report(90);

    zip.file('index.html', html);
    zip.file('story.html', html);  // story.html is the primary SCO launch file
  } catch (err: any) {
    throw new Error('Failed to package SCORM player: ' + err.message);
  }

  report(95);
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  report(100);
  return blob;
}
