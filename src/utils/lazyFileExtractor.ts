/**
 * Lazy-loaded file extractor wrapper
 * Only loads the heavy OCR/PDF libraries when actually needed
 */

let fileExtractorModule: typeof import('./fileExtractor') | null = null;

export const extractTextFromFile = async (...args: Parameters<typeof import('./fileExtractor').extractTextFromFile>) => {
  if (!fileExtractorModule) {
    fileExtractorModule = await import('./fileExtractor');
  }
  return fileExtractorModule.extractTextFromFile(...args);
};
