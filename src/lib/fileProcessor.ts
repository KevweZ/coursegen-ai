import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
import JSZip from 'jszip';

// Use the local worker bundled with pdfjs-dist to avoid CDN/import failures in Vite
// @ts-ignore
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = PdfJsWorker;

export interface SourceImage {
  /** 0-based index of the source page this image came from */
  pageIndex: number;
  /** JPEG data URL of the rendered page */
  dataUrl: string;
  /** Width in pixels at the rendering scale */
  width: number;
  height: number;
}

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'docx') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } 
  
  if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return text;
  }

  if (extension === 'txt') {
    return await file.text();
  }

  if (extension === 'pptx') {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Slide content lives in ppt/slides/slide1.xml, slide2.xml, ...
    const slideFiles = Object.keys(zip.files)
      .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] ?? '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] ?? '0', 10);
        return numA - numB;
      });

    let text = '';
    for (const slideFile of slideFiles) {
      const xml = await zip.files[slideFile].async('string');
      // <a:t> elements hold all visible text in OOXML
      const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) ?? [];
      const slideText = matches
        .map(m => m.replace(/<[^>]*>/g, '').trim())
        .filter(Boolean)
        .join(' ');
      if (slideText) text += slideText + '\n';
    }

    if (!text.trim()) throw new Error('No readable text found in the PowerPoint file.');
    return text;
  }

  throw new Error('Unsupported file format. Please upload a PDF, Word, PowerPoint, or Text file.');

}

/**
 * Extract page-level images from a PDF file by rendering each page to a canvas.
 * Returns an array of SourceImages (one per page), skipping blank/tiny renders.
 * PPT files cannot be rendered client-side — this function returns [] for non-PDF inputs.
 */
export async function extractImagesFromFile(file: File): Promise<SourceImage[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  const images: SourceImage[] = [];

  if (extension === 'pptx') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const mediaFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/') && !zip.files[name].dir);
      
      let imgIndex = 0;
      for (const filename of mediaFiles) {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (!['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) continue;
        
        const fileData = await zip.files[filename].async('base64');
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        const dataUrl = `data:${mimeType};base64,${fileData}`;
        
        const imgProps = await new Promise<{width: number, height: number, src: string}>((resolve) => {
           const img = new Image();
           img.onload = () => resolve({ width: img.width, height: img.height, src: dataUrl });
           img.onerror = () => resolve({ width: 0, height: 0, src: '' }); 
           img.src = dataUrl;
        });

        // Filter out decorative marks and tiny borders
        if (imgProps.width > 150 && imgProps.height > 150) {
          images.push({
            pageIndex: imgIndex++, // Assign sequential index since unstructured media lacks slide IDs
            dataUrl: imgProps.src,
            width: imgProps.width,
            height: imgProps.height,
          });
        }
      }
    } catch (err) {
      console.warn('[extractImagesFromFile] Failed to extract PPTX images:', err);
    }
    return images;
  }

  // Only PDFs can be rendered client-side
  if (extension !== 'pdf') return [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.2 }); // 1.2× for readable quality

      // Skip pages smaller than 100×100 (likely blank or decorative)
      if (viewport.width < 100 || viewport.height < 100) continue;

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      images.push({
        pageIndex: i - 1, // convert to 0-based
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      });

      // Cleanup
      canvas.width = 0;
      canvas.height = 0;
    }
  } catch (err) {
    console.warn('[extractImagesFromFile] Failed to extract images:', err);
  }

  return images;
}
