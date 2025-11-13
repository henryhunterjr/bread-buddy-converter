/**
 * Lazy-loaded PDF generator wrapper
 * Only loads the heavy PDF libraries when actually needed
 */

let pdfGeneratorModule: typeof import('./pdfGenerator') | null = null;

export const generatePDF = async (...args: Parameters<typeof import('./pdfGenerator').generatePDF>) => {
  if (!pdfGeneratorModule) {
    pdfGeneratorModule = await import('./pdfGenerator');
  }
  return pdfGeneratorModule.generatePDF(...args);
};
