import JSZip from 'jszip';
import { CourseOutline } from '../types/course';

// ---------------------------------------------------------------------------
// SCORM 1.2 XSD schema file contents (required per SCORM 1.2 spec)
// ---------------------------------------------------------------------------
const XSD_ADLCP = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.adlnet.org/xsd/adlcp_rootv1p2" elementFormDefault="qualified" attributeFormDefault="unqualified"><xs:import namespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2"/><xs:attribute name="scormtype"><xs:simpleType><xs:restriction base="xs:string"><xs:enumeration value="sco"/><xs:enumeration value="asset"/></xs:restriction></xs:simpleType></xs:attribute></xs:schema>`;

const XSD_IMS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.w3.org/XML/1998/namespace" elementFormDefault="qualified" attributeFormDefault="unqualified"><xs:attribute name="lang" type="xs:language"/><xs:attribute name="space"><xs:simpleType><xs:restriction base="xs:NCName"><xs:enumeration value="default"/><xs:enumeration value="preserve"/></xs:restriction></xs:simpleType></xs:attribute></xs:schema>`;

const XSD_IMS_CP = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.imsproject.org/xsd/imscp_rootv1p1p2" elementFormDefault="qualified" attributeFormDefault="unqualified"><xs:element name="manifest"/><xs:element name="organizations"/><xs:element name="resources"/></xs:schema>`;

const XSD_IMS_MD = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1" elementFormDefault="qualified" attributeFormDefault="unqualified"><xs:element name="lom"/></xs:schema>`;

// ---------------------------------------------------------------------------
// Industry-standard pipwerks SCORM 1.2 API Wrapper (minimal inline version)
// ---------------------------------------------------------------------------
const PIPWERKS_SCORM_JS = `
var pipwerks={};pipwerks.UTILS={};pipwerks.debug={isActive:false};
pipwerks.SCORM={version:"1.2",handleCompletionStatusOnExit:"completed",API:{cache:null,isFound:false},
  connection:{isActive:false},data:{completionStatus:null,exitStatus:null}};
pipwerks.SCORM.API.find=function(win){
  var scorm=pipwerks.SCORM,f=scorm.API,tries=0,API=null,maxTries=500;
  while(!API&&tries<maxTries){
    if(win.API)API=win.API;
    else if(win.parent&&win.parent!=win)win=win.parent;
    else break;
    tries++;
  }
  return API;
};
pipwerks.SCORM.API.get=function(){
  var scorm=pipwerks.SCORM,API=null,win=window;
  if(scorm.API.cache)return scorm.API.cache;
  API=scorm.API.find(win);
  if(!API&&win.opener)API=scorm.API.find(win.opener);
  scorm.API.cache=API;
  scorm.API.isFound=!!API;
  return API;
};
pipwerks.SCORM.connection.initialize=function(){
  var API=pipwerks.SCORM.API.get();
  if(API){var result=API.LMSInitialize("");pipwerks.SCORM.connection.isActive=(result==="true"||result===true);}
  return pipwerks.SCORM.connection.isActive;
};
pipwerks.SCORM.connection.terminate=function(){
  var API=pipwerks.SCORM.API.get();
  if(API&&pipwerks.SCORM.connection.isActive){API.LMSFinish("");pipwerks.SCORM.connection.isActive=false;}
};
pipwerks.SCORM.data.set=function(param,val){
  var API=pipwerks.SCORM.API.get();
  if(API&&pipwerks.SCORM.connection.isActive){API.LMSSetValue(param,val);API.LMSCommit("");}
};
pipwerks.SCORM.data.get=function(param){
  var API=pipwerks.SCORM.API.get();
  if(API&&pipwerks.SCORM.connection.isActive)return API.LMSGetValue(param);
  return "";
};
pipwerks.SCORM.set=function(param,val){return pipwerks.SCORM.data.set(param,val);};
pipwerks.SCORM.get=function(param){return pipwerks.SCORM.data.get(param);};
pipwerks.SCORM.init=function(){return pipwerks.SCORM.connection.initialize();};
pipwerks.SCORM.quit=function(){pipwerks.SCORM.connection.terminate();};
`;

export async function createScormPackage(course: CourseOutline): Promise<Blob> {
  const zip = new JSZip();

  let slideGlobalIdx = 0;
  const moduleItems = course.modules.map((module, mIdx) => {
    const slideItems = module.slides.map((slide) => {
      const idx = slideGlobalIdx++;
      const safeTitle = slide.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      return `      <item identifier="item_m${mIdx}_s${idx}" identifierref="res_1" parameters="?slide=${idx}">\n        <title>${safeTitle}</title>\n      </item>`;
    }).join('\n');
    const safeModTitle = module.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `    <item identifier="item_mod_${mIdx}">\n      <title>${safeModTitle}</title>\n${slideItems}\n    </item>`;
  }).join('\n');

  const safeCourseTitle = course.title.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="CourseGenAI_${Date.now()}" version="1"
          xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
          xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                              http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org_1">
    <organization identifier="org_1">
      <title>${safeCourseTitle}</title>
${moduleItems}
    </organization>
  </organizations>
  <resources>
    <resource identifier="res_1" type="webcontent" adlcp:scormtype="sco" href="story.html">
      <file href="story.html"/>
      <file href="index.html"/>
      <file href="scorm_api.js"/>
    </resource>
  </resources>
</manifest>`;

  zip.file('imsmanifest.xml', manifest);
  zip.file('adlcp_rootv1p2.xsd', XSD_ADLCP);
  zip.file('ims_xml.xsd', XSD_IMS_XML);
  zip.file('imscp_rootv1p1p2.xsd', XSD_IMS_CP);
  zip.file('imsmd_rootv1p2p1.xsd', XSD_IMS_MD);
  zip.file('scorm_api.js', PIPWERKS_SCORM_JS);

  try {
    const htmlRes = await fetch('/scorm-player/index.html');
    if (!htmlRes.ok) {
      console.error("[SCORM Builder] Validation Failed: Launch file missing. HTTP status:", htmlRes.status);
      throw new Error(`CRITICAL EXPORT FAILURE: SCORM Player bundle not found. Please run 'npm run build:player' before exporting.`);
    }
    
    let htmlContent = await htmlRes.text();
    if (!htmlContent || htmlContent.trim().length === 0) {
      throw new Error("CRITICAL EXPORT FAILURE: The generated launch file is empty.");
    }

    const assetRegex = /(?:src|href)="([^"]+\.(?:js|css))"/g;
    let match;
    const assetsToFetch = [];
    while ((match = assetRegex.exec(htmlContent)) !== null) {
      if (match[1].startsWith('./')) assetsToFetch.push(match[1].substring(2));
      else if (match[1].startsWith('/')) assetsToFetch.push(match[1].substring(1));
      else assetsToFetch.push(match[1]);
    }

    for (const assetPath of assetsToFetch) {
      const assetRes = await fetch('/scorm-player/' + assetPath);
      if (assetRes.ok) {
        const assetBlob = await assetRes.blob();
        zip.file(assetPath, assetBlob);
      } else {
        console.warn("[SCORM Builder] Warning: Could not fetch referenced asset:", assetPath);
      }
    }

    // Single source of truth payload injection
    // Use lastIndexOf to ensure we don't accidentally replace a string literal inside the JS bundle!
    const injection = `<script>window.__COURSE_DATA__ = ${JSON.stringify(course)};</script>`;
    const bodyCloseIndex = htmlContent.lastIndexOf('</body>');
    const headCloseIndex = htmlContent.lastIndexOf('</head>');
    
    // Inject SCORM API near </head> safely
    if (headCloseIndex !== -1) {
       htmlContent = htmlContent.slice(0, headCloseIndex) + `\n<script src="scorm_api.js"></script>\n` + htmlContent.slice(headCloseIndex);
    }
    
    // Inject __COURSE_DATA__ near </body> safely
    const finalBodyCloseIndex = htmlContent.lastIndexOf('</body>');
    if (finalBodyCloseIndex !== -1) {
       htmlContent = htmlContent.slice(0, finalBodyCloseIndex) + `\n${injection}\n` + htmlContent.slice(finalBodyCloseIndex);
    } else {
       htmlContent += `\n${injection}\n`;
    }

    // Output index.html as fallback, but story.html as the primary launch file
    zip.file('index.html', htmlContent);
    zip.file('story.html', htmlContent);
  } catch (err: any) {
    throw new Error("Failed to package React SPA player: " + err.message);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return blob;
}
