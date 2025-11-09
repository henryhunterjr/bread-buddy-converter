import { createWorker } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore - Vite specific import
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up PDF.js worker with Vite-specific URL import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Rate limiting: Track file upload attempts
const uploadAttempts: number[] = [];
const MAX_UPLOADS_PER_MINUTE = 10;

// Magic number signatures for file type validation
const FILE_SIGNATURES = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46] // RIFF (first 4 bytes, followed by WEBP)
};

async function validateFileSignature(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check PDF signature
  if (file.type === 'application/pdf') {
    return bytes[0] === FILE_SIGNATURES.pdf[0] &&
           bytes[1] === FILE_SIGNATURES.pdf[1] &&
           bytes[2] === FILE_SIGNATURES.pdf[2] &&
           bytes[3] === FILE_SIGNATURES.pdf[3];
  }

  // Check JPEG signature
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    return bytes[0] === FILE_SIGNATURES.jpeg[0] &&
           bytes[1] === FILE_SIGNATURES.jpeg[1] &&
           bytes[2] === FILE_SIGNATURES.jpeg[2];
  }

  // Check PNG signature
  if (file.type === 'image/png') {
    return bytes[0] === FILE_SIGNATURES.png[0] &&
           bytes[1] === FILE_SIGNATURES.png[1] &&
           bytes[2] === FILE_SIGNATURES.png[2] &&
           bytes[3] === FILE_SIGNATURES.png[3];
  }

  // Check WEBP signature
  if (file.type === 'image/webp') {
    return bytes[0] === FILE_SIGNATURES.webp[0] &&
           bytes[1] === FILE_SIGNATURES.webp[1] &&
           bytes[2] === FILE_SIGNATURES.webp[2] &&
           bytes[3] === FILE_SIGNATURES.webp[3] &&
           bytes[8] === 0x57 && bytes[9] === 0x45 &&
           bytes[10] === 0x42 && bytes[11] === 0x50; // "WEBP"
  }

  return false;
}

function checkRateLimit(): void {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove attempts older than 1 minute
  while (uploadAttempts.length > 0 && uploadAttempts[0] < oneMinuteAgo) {
    uploadAttempts.shift();
  }

  // Check if rate limit exceeded
  if (uploadAttempts.length >= MAX_UPLOADS_PER_MINUTE) {
    throw new Error('Too many upload attempts. Please wait a moment and try again.');
  }

  // Record this attempt
  uploadAttempts.push(now);
}

export async function extractTextFromFile(file: File): Promise<string> {
  // Rate limiting check
  checkRateLimit();

  const fileType = file.type;

  // Validate file signature matches declared type
  const isValidSignature = await validateFileSignature(file);
  if (!isValidSignature) {
    throw new Error('Invalid file format. The file content does not match its declared type.');
  }

  if (fileType === 'application/pdf') {
    return await extractTextFromPDF(file);
  } else if (fileType.startsWith('image/')) {
    return await extractTextFromImage(file);
  }

  throw new Error('Unsupported file type');
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const numPages = Math.min(pdf.numPages, 10); // Limit to first 10 pages
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    if (!fullText.trim()) {
      throw new Error('No text found in PDF. The PDF might be scanned - try saving it as an image and uploading that instead.');
    }

    return fullText;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractTextFromImage(file: File): Promise<string> {
  try {
    const worker = await createWorker('eng');
    
    const imageUrl = URL.createObjectURL(file);
    const { data: { text } } = await worker.recognize(imageUrl);
    await worker.terminate();
    URL.revokeObjectURL(imageUrl);

    if (!text.trim()) {
      throw new Error('No text found in image. Make sure the recipe text is clear and readable.');
    }

    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
