import jsPDF from 'jspdf';
import { ConvertedRecipe, BakersPercentage } from '@/types/recipe';
import { calculateBakersPercentages } from './recipeConverter';

// Beautiful parchment color palette
const COLORS = {
  parchment: '#faf8f3',
  darkText: '#3d2817',
  serif: '#8b6f47',
  wheat: '#d4a574',
  lightBorder: '#e8dcc8',
  infoBlue: '#e3f2fd',
  warningYellow: '#fff9e6',
  cautionOrange: '#fff3e0',
  proTipGray: '#f5f5f5',
  iconGray: '#9e9e9e'
};

// Beautiful typography with serif for titles
const FONTS = {
  title: 'times',
  body: 'helvetica',
  titleSize: 28,
  subtitleSize: 11,
  headingSize: 16,
  subheadingSize: 13,
  bodySize: 11,
  smallSize: 9,
  footerSize: 8
};

/**
 * Clean text for PDF to avoid UTF-8 encoding issues
 * Replaces common problem characters with ASCII equivalents
 */
function cleanTextForPDF(text: string): string {
  if (!text) return '';
  
  return text
    // HTML entities to regular characters
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x26;/g, '&')
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    // Smart quotes to straight quotes
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    // Various dashes to simple dash
    .replace(/[–—]/g, '-')
    // Keep bullet points for now - we'll render them properly
    // .replace(/[•●]/g, '-')
    // Degree symbol to 'F' or 'C'
    .replace(/°F/g, 'F')
    .replace(/°C/g, 'C')
    .replace(/°/g, ' degrees')
    // Multiplication sign
    .replace(/×/g, 'x')
    // Ellipsis
    .replace(/…/g, '...')
    // Non-breaking space
    .replace(/\u00A0/g, ' ')
    // Remove any remaining non-ASCII characters except bullet points
    .replace(/[^\x00-\x7F•●]/g, '');
}

interface IngredientGroup {
  section: string;
  ingredients: BakersPercentage[];
}

function groupIngredients(percentages: BakersPercentage[], direction: string): IngredientGroup[] {
  if (direction === 'yeast-to-sourdough') {
    // Group into Levain and Dough sections
    const levainIngredients = percentages.slice(0, 3); // First 3 are levain (starter, water, flour)
    const doughIngredients = percentages.slice(3);
    
    return [
      { section: 'Levain / Starter', ingredients: levainIngredients },
      { section: 'Dough', ingredients: doughIngredients }
    ];
  } else {
    // For sourdough-to-yeast, check if there are enrichments/finishing
    const mainIngredients = percentages.filter(p => 
      ['flour', 'water', 'salt', 'yeast'].some(type => 
        p.ingredient.toLowerCase().includes(type)
      )
    );
    const finishingIngredients = percentages.filter(p => 
      !mainIngredients.includes(p)
    );
    
    if (finishingIngredients.length > 0) {
      return [
        { section: 'Dough', ingredients: mainIngredients },
        { section: 'Finishing', ingredients: finishingIngredients }
      ];
    }
    
    return [{ section: 'Dough', ingredients: percentages }];
  }
}

/**
 * Mobile detection helper
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Helper to draw wheat icon decoration
function drawWheatIcon(doc: jsPDF, x: number, y: number, size: number = 0.15) {
  doc.setFillColor(212, 165, 116); // wheat color
  doc.setDrawColor(212, 165, 116);
  // Simple wheat stalk as three small ovals
  for (let i = 0; i < 3; i++) {
    doc.ellipse(x, y - (i * size * 0.6), size * 0.3, size * 0.5, 'F');
  }
  // Stem line
  doc.setLineWidth(0.01);
  doc.line(x, y, x, y - (2.5 * size * 0.6));
}

// Helper to draw circular step icon
function drawStepIcon(doc: jsPDF, x: number, y: number, stepNum: number) {
  // Circle
  doc.setFillColor(212, 165, 116);
  doc.circle(x, y, 0.15, 'F');
  // Number
  doc.setFontSize(10);
  doc.setFont(FONTS.body, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(stepNum.toString(), x, y + 0.04, { align: 'center' });
}

// Helper to draw info box
function drawInfoBox(doc: jsPDF, x: number, y: number, width: number, text: string, type: 'info' | 'warning' | 'caution') {
  const bgColors: Record<string, [number, number, number]> = {
    info: [227, 242, 253],
    warning: [255, 249, 230],
    caution: [255, 243, 224]
  };
  const iconSymbols = {
    info: 'i',
    warning: '!',
    caution: '⚠'
  };
  
  const lines = doc.splitTextToSize(text, width - 0.6);
  const boxHeight = (lines.length * 0.16) + 0.25;
  
  // Background box
  const [r, g, b] = bgColors[type];
  doc.setFillColor(r, g, b);
  doc.roundedRect(x, y, width, boxHeight, 0.05, 0.05, 'F');
  
  // Border
  doc.setDrawColor(232, 220, 200);
  doc.setLineWidth(0.01);
  doc.roundedRect(x, y, width, boxHeight, 0.05, 0.05, 'S');
  
  // Icon circle
  doc.setFillColor(158, 158, 158);
  doc.circle(x + 0.2, y + 0.2, 0.08, 'F');
  doc.setFontSize(8);
  doc.setFont(FONTS.body, 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(iconSymbols[type], x + 0.2, y + 0.23, { align: 'center' });
  
  // Text
  doc.setFontSize(FONTS.bodySize);
  doc.setFont(FONTS.body, 'normal');
  doc.setTextColor(61, 40, 23);
  let textY = y + 0.2;
  lines.forEach((line: string) => {
    doc.text(line, x + 0.4, textY);
    textY += 0.16;
  });
  
  return boxHeight;
}

export function generatePDF(
  result: ConvertedRecipe,
  recipeName: string = 'Converted Recipe',
  recipeDescription: string = '',
  sourceFileName?: string
) {
  // Clean all input text to avoid encoding issues
  const cleanRecipeName = cleanTextForPDF(recipeName || 'Converted Recipe');
  const cleanDescription = cleanTextForPDF(recipeDescription);
  const cleanSourceFileName = cleanTextForPDF(sourceFileName || '');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter',
    putOnlyUsedFonts: true,
    compress: true
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 0.75;
  const topMargin = 0.6;
  const contentWidth = pageWidth - (margin * 2);
  
  // Cream parchment background for entire page
  doc.setFillColor(250, 248, 243);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let yPos = topMargin;
  
  // ========== 1. DECORATIVE HEADER WITH WHEAT ICONS ==========
  // Draw wheat decorations on both sides
  drawWheatIcon(doc, margin + 0.3, yPos + 0.3);
  drawWheatIcon(doc, pageWidth - margin - 0.3, yPos + 0.3);
  
  // Recipe Title (Centered, Elegant Serif)
  doc.setFontSize(FONTS.titleSize);
  doc.setFont(FONTS.title, 'bold');
  doc.setTextColor(61, 40, 23);
  const titleLines = doc.splitTextToSize(cleanRecipeName, contentWidth - 1);
  doc.text(titleLines, pageWidth / 2, yPos + 0.35, { align: 'center' });
  yPos += (titleLines.length * 0.4) + 0.2;
  
  // Subtitle line with conversion info and branding
  doc.setFontSize(FONTS.subtitleSize);
  doc.setFont(FONTS.body, 'normal');
  doc.setTextColor(139, 111, 71);
  const conversionLabel = result.direction === 'sourdough-to-yeast'
    ? 'SOURDOUGH → YEAST'
    : 'YEAST → SOURDOUGH';
  const subtitle = `CONVERTED BY BAKING GREAT BREAD AT HOME • ${conversionLabel} • HYDRATION ${result.converted.hydration.toFixed(0)}% • ${new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}`.toUpperCase();
  doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 0.35;
  
  // Description if provided
  if (cleanDescription) {
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.body, 'italic');
    doc.setTextColor(61, 40, 23);
    const descLines = doc.splitTextToSize(cleanDescription, contentWidth - 0.5);
    descLines.forEach((line: string) => {
      doc.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 0.18;
    });
    yPos += 0.2;
  }
  
  yPos += 0.1;
  
  // ========== 2. INGREDIENTS - TWO COLUMN GRID ==========
  const convertedPercentages = calculateBakersPercentages(result.converted);
  const ingredientGroups = groupIngredients(convertedPercentages, result.direction);

  // Section heading
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.body, 'bold');
  doc.setTextColor(61, 40, 23);
  doc.text('Ingredients', margin, yPos);
  yPos += 0.35;

  // Two-column ingredient table
  ingredientGroups.forEach((group) => {
    if (yPos > pageHeight - 2) {
      doc.addPage();
      doc.setFillColor(250, 248, 243);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = topMargin;
    }

    // Group subheading
    doc.setFontSize(FONTS.subheadingSize);
    doc.setFont(FONTS.body, 'bold');
    doc.setTextColor(139, 111, 71);
    doc.text(cleanTextForPDF(group.section), margin, yPos);
    yPos += 0.3;

    // Table header row
    doc.setFillColor(232, 220, 200);
    doc.rect(margin, yPos - 0.15, contentWidth, 0.25, 'F');
    doc.setFontSize(FONTS.smallSize);
    doc.setFont(FONTS.body, 'bold');
    doc.setTextColor(61, 40, 23);
    doc.text('Ingredient', margin + 0.1, yPos);
    doc.text('Amount', margin + contentWidth - 1.5, yPos);
    doc.text("Baker's %", margin + contentWidth - 0.6, yPos);
    yPos += 0.25;

    // Ingredient rows
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.body, 'normal');
    group.ingredients.forEach((item, idx) => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        doc.setFillColor(250, 248, 243);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = topMargin;
      }

      // Alternating row background
      if (idx % 2 === 1) {
        doc.setFillColor(255, 253, 248);
        doc.rect(margin, yPos - 0.15, contentWidth, 0.22, 'F');
      }

      doc.setTextColor(61, 40, 23);
      const ingredientName = cleanTextForPDF(item.ingredient);
      // Capitalize first letter
      const capitalizedName = ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1);
      doc.text(capitalizedName, margin + 0.1, yPos);
      doc.text(`${item.amount.toFixed(0)}g`, margin + contentWidth - 1.5, yPos);
      doc.text(`${item.percentage.toFixed(0)}%`, margin + contentWidth - 0.6, yPos);
      yPos += 0.22;
    });

    yPos += 0.15;
  });

  // Total Hydration highlight
  doc.setFillColor(255, 249, 230);
  doc.roundedRect(margin, yPos, contentWidth, 0.3, 0.05, 0.05, 'F');
  doc.setFontSize(FONTS.bodySize);
  doc.setFont(FONTS.body, 'bold');
  doc.setTextColor(61, 40, 23);
  doc.text(`Total Hydration: ${result.converted.hydration.toFixed(0)}%`, margin + 0.15, yPos + 0.18);
  yPos += 0.45;
  
  // ========== 3. METHOD WITH NUMBERED STEP ICONS ==========
  if (yPos > pageHeight - 2) {
    doc.addPage();
    doc.setFillColor(250, 248, 243);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    yPos = topMargin;
  }

  // Section heading
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.body, 'bold');
  doc.setTextColor(61, 40, 23);
  doc.text('Method', margin, yPos);
  yPos += 0.4;

  doc.setFontSize(FONTS.bodySize);
  result.methodChanges.forEach((change, index) => {
    if (yPos > pageHeight - 1.5) {
      doc.addPage();
      doc.setFillColor(250, 248, 243);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = topMargin;
    }

    // Draw step icon
    drawStepIcon(doc, margin + 0.15, yPos + 0.1, index + 1);

    // Step title
    doc.setFont(FONTS.body, 'bold');
    doc.setTextColor(61, 40, 23);
    const stepTitle = cleanTextForPDF(change.step.toUpperCase());
    doc.text(stepTitle, margin + 0.4, yPos + 0.12);
    yPos += 0.3;

    // Step content
    doc.setFont(FONTS.body, 'normal');
    let changeText = cleanTextForPDF(change.change);
    if (change.timing) {
      changeText += ` ${cleanTextForPDF(change.timing)}`;
    }
    
    const changeLines = doc.splitTextToSize(changeText, contentWidth - 0.4);
    changeLines.forEach((line: string) => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        doc.setFillColor(250, 248, 243);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = topMargin;
      }
      doc.text(line, margin + 0.4, yPos);
      yPos += 0.17;
    });

    yPos += 0.25;
  });

  yPos += 0.2;
  
  // ========== 4. PRO TIPS BOX (warnings/notes at bottom) ==========
  // Collect all warnings and notes
  const allNotes: Array<{ text: string; type: 'info' | 'warning' | 'caution' }> = [];
  
  result.warnings.forEach(warning => {
    const type = warning.type === 'info' ? 'info' : warning.type === 'warning' ? 'warning' : 'caution';
    allNotes.push({ text: cleanTextForPDF(warning.message), type });
  });
  
  // Add tangzhong note
  allNotes.push({
    text: 'Tangzhong: Cook 50g flour + 50g water to paste; subtract from recipe water.',
    type: 'info'
  });
  
  // Add sourdough flavor tip if converting to yeast
  if (result.direction === 'sourdough-to-yeast') {
    allNotes.push({
      text: 'Tip: Mimic sourdough flavor by adding 15g (1 tbsp) lemon juice or plain yogurt to liquid ingredients.',
      type: 'info'
    });
  }
  
  // Draw Pro Tips section
  if (allNotes.length > 0) {
    // Ensure enough space or add page
    const estimatedHeight = allNotes.length * 0.6;
    if (yPos + estimatedHeight > pageHeight - 1.5) {
      doc.addPage();
      doc.setFillColor(250, 248, 243);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = topMargin;
    }
    
    // Pro Tips heading
    doc.setFontSize(FONTS.headingSize);
    doc.setFont(FONTS.body, 'bold');
    doc.setTextColor(61, 40, 23);
    doc.text("Baker's Notes", margin, yPos);
    yPos += 0.35;
    
    // Draw each note as info box
    allNotes.forEach(note => {
      if (yPos > pageHeight - 1.2) {
        doc.addPage();
        doc.setFillColor(250, 248, 243);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = topMargin;
      }
      const boxHeight = drawInfoBox(doc, margin, yPos, contentWidth, note.text, note.type);
      yPos += boxHeight + 0.15;
    });
  }
  
  yPos += 0.2;
  
  // ========== 5. SUBSTITUTIONS ==========
  if (result.substitutions.length > 0) {
    if (yPos > pageHeight - 2) {
      doc.addPage();
      doc.setFillColor(250, 248, 243);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = topMargin;
    }

    // Section heading
    doc.setFontSize(FONTS.headingSize);
    doc.setFont(FONTS.body, 'bold');
    doc.setTextColor(61, 40, 23);
    doc.text('Substitutions', margin, yPos);
    yPos += 0.35;

    // Table format for substitutions
    doc.setFillColor(232, 220, 200);
    doc.rect(margin, yPos - 0.15, contentWidth, 0.25, 'F');
    doc.setFontSize(FONTS.smallSize);
    doc.setFont(FONTS.body, 'bold');
    doc.text('Original', margin + 0.1, yPos);
    doc.text('Substitute', margin + 2, yPos);
    doc.text('Ratio', margin + 4, yPos);
    yPos += 0.25;

    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.body, 'normal');
    result.substitutions.slice(0, 5).forEach((sub, idx) => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        doc.setFillColor(250, 248, 243);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        yPos = topMargin;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(255, 253, 248);
        doc.rect(margin, yPos - 0.15, contentWidth, 0.22, 'F');
      }

      doc.text(cleanTextForPDF(sub.original), margin + 0.1, yPos);
      doc.text(cleanTextForPDF(sub.substitute), margin + 2, yPos);
      doc.text(cleanTextForPDF(sub.ratio), margin + 4, yPos);
      yPos += 0.22;
    });
    
    yPos += 0.3;
  }
  
  // ========== 6. ELEGANT FOOTER ==========
  const footerY = pageHeight - 0.45;
  
  // Decorative line
  doc.setDrawColor(232, 220, 200);
  doc.setLineWidth(0.01);
  doc.line(margin, footerY - 0.2, pageWidth - margin, footerY - 0.2);
  
  // Footer text
  doc.setFontSize(FONTS.footerSize);
  doc.setFont(FONTS.body, 'italic');
  doc.setTextColor(139, 111, 71);
  doc.text(
    'Baked with ❤️ using Baking Great Bread at Home Sourdough ↔ Yeast Converter',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  
  // Generate filename - use cleaned name
  const cleanName = cleanRecipeName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const conversionType = result.direction === 'sourdough-to-yeast' ? 'SourdoughToYeast' : 'YeastToSourdough';
  const filename = `${cleanName}_BGB_${conversionType}.pdf`;
  
  // Mobile-friendly download strategy
  if (isMobileDevice()) {
    // Get PDF as blob
    const pdfBlob = doc.output('blob');
    
    // Strategy 1: Try native share API (best for mobile)
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([pdfBlob], filename, { type: 'application/pdf' })] })) {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      navigator.share({
        files: [file],
        title: cleanRecipeName,
        text: 'Recipe converted with Bread Buddy'
      }).catch((error) => {
        console.log('Share failed:', error);
        // Fallback to opening in new tab
        openPDFInNewTab(pdfBlob, filename);
      });
    } else {
      // Strategy 2: Open in new tab with download attribute
      openPDFInNewTab(pdfBlob, filename);
    }
  } else {
    // Desktop: Use standard download
    doc.save(filename);
  }
}

/**
 * Open PDF in new tab with download prompt (mobile fallback)
 */
function openPDFInNewTab(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
