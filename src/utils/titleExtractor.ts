/**
 * Extracts and validates recipe titles and descriptions from recipe text
 * Following the BGB title extraction rules
 */

interface ExtractedRecipeInfo {
  title: string;
  description: string;
}

const METADATA_PATTERNS = [
  /https?:\/\//i,                           // URLs
  /\d{1,2}\/\d{1,2}\/\d{2,4}/,             // Dates (11/8/25)
  /\d+\s*min\s*read/i,                      // "6 min read"
  /back\s*to\s*blog/i,                      // Navigation
  /baking\s*great\s*bread/i,                // Site name
  /prep\s*time|cook\s*time|total\s*time/i, // Metadata headers
  /january|february|march|april|may|june|july|august|september|october|november|december/i, // Month names
  /\d{1,2}:\d{2}\s*(am|pm)/i,              // Times (2:15 AM)
];

const TITLE_MARKERS = [
  /^recipe:\s*/i,
  /^title:\s*/i,
  /^name:\s*/i,
];

/**
 * Check if a line is likely metadata and not a recipe title
 */
function isMetadata(line: string): boolean {
  return METADATA_PATTERNS.some(pattern => pattern.test(line));
}

/**
 * Extract title from explicit markers like "Recipe: " or "Title: "
 */
function extractTitleFromMarkers(line: string): string | null {
  for (const marker of TITLE_MARKERS) {
    if (marker.test(line)) {
      return line.replace(marker, '').trim();
    }
  }
  return null;
}

/**
 * Validate that a title looks reasonable
 * - Between 2-60 characters
 * - Doesn't contain ingredient-like patterns (measurements, asterisks)
 * - Doesn't contain metadata patterns
 */
function isValidTitle(text: string): boolean {
  if (text.length < 2 || text.length > 60) return false;
  
  // Should not contain measurements or ingredient markers
  const invalidPatterns = [
    /\d+\s*(g|grams?|ml|cups?|tablespoons?|tbsp|teaspoons?|tsp)/i,
    /\*/,  // asterisks used for bullet points in ingredients
    /\d+\s*[-–]\s*\d+/,  // ranges like "2-3 cups"
  ];
  
  if (invalidPatterns.some(pattern => pattern.test(text))) return false;
  if (isMetadata(text)) return false;
  
  return true;
}

/**
 * Extract the first 2-8 words as a title candidate
 */
function extractFirstWords(line: string): string {
  const words = line.trim().split(/\s+/);
  const titleWords = words.slice(0, Math.min(8, words.length));
  return titleWords.join(' ');
}

/**
 * Extract a description from text (1-2 sentences, max 150 chars)
 */
function extractDescription(lines: string[], startIndex: number): string {
  let description = '';
  
  for (let i = startIndex; i < Math.min(startIndex + 3, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines, metadata, and ingredient lines
    if (!line || isMetadata(line) || /\d+\s*(g|ml|cup|tbsp|tsp)/i.test(line)) {
      continue;
    }
    
    // Accumulate sentences up to 150 chars
    if (description) description += ' ';
    description += line;
    
    // Stop if we've got 1-2 sentences or reached 150 chars
    if (description.length > 150 || (description.match(/[.!?]/g) || []).length >= 2) {
      break;
    }
  }
  
  // Truncate to 150 chars if needed
  if (description.length > 150) {
    description = description.substring(0, 147) + '...';
  }
  
  return description;
}

/**
 * Main function to extract recipe title and description from recipe text
 */
export function extractRecipeInfo(recipeText: string): ExtractedRecipeInfo {
  const lines = recipeText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  
  let title = 'Converted Bread Recipe'; // Default fallback
  let description = '';
  
  // Try to find a valid title from the first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    
    // Skip obvious metadata
    if (isMetadata(line)) continue;
    
    // Check for explicit title markers
    const markerTitle = extractTitleFromMarkers(line);
    if (markerTitle && isValidTitle(markerTitle)) {
      title = markerTitle;
      description = extractDescription(lines, i + 1);
      break;
    }
    
    // Check if the whole line is a valid title
    if (isValidTitle(line)) {
      title = line;
      description = extractDescription(lines, i + 1);
      break;
    }
    
    // Try extracting first 2-8 words as title
    const firstWords = extractFirstWords(line);
    if (isValidTitle(firstWords)) {
      title = firstWords;
      // Get description from remainder of line + next lines
      const remainder = line.substring(firstWords.length).trim();
      if (remainder && remainder.length > 10) {
        description = remainder;
      } else {
        description = extractDescription(lines, i + 1);
      }
      break;
    }
  }
  
  // Validate final title length
  if (title.length > 60) {
    title = 'Converted Bread Recipe';
  }
  
  return { title, description };
}
