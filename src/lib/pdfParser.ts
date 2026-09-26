import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function convertPdfToImageAndText(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), useSystemFonts: true }).promise;
  const numPages = Math.min(pdfDoc.numPages, 10);

  const canvases: HTMLCanvasElement[] = [];
  const textPieces: string[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // @ts-ignore - pdfjs typing variance
      await page.render({ canvasContext: ctx, viewport }).promise;
      canvases.push(canvas);
    }

    try {
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
      if (pageText.trim()) {
        textPieces.push(pageText);
      }
    } catch {
      // Ignore text extraction error
    }
  }

  if (canvases.length === 0) {
    throw new Error('No pages could be rendered from PDF');
  }

  // Multi-page stitching and image export
  const totalWidth = Math.max(...canvases.map(c => c.width));
  const totalHeight = canvases.reduce((s, c) => s + c.height, 0);
  const combined = document.createElement('canvas');
  combined.width = totalWidth;
  combined.height = totalHeight;
  const ctx = combined.getContext('2d');
  let curY = 0;
  for (const c of canvases) {
    ctx?.drawImage(c, 0, curY);
    curY += c.height;
  }

  const dataUrl = combined.toDataURL('image/jpeg', 0.90);
  return {
    previewUrl: dataUrl,
    imageBase64: dataUrl.replace(/^data:image\/jpeg;base64,/, ''),
    mimeType: 'image/jpeg',
    extractedText: textPieces.join('\n'),
  };
}
