import jsPDF from 'jspdf';
import { ConvertedRecipe, BakersPercentage } from '@/types/recipe';
import { calculateBakersPercentages } from './recipeConverter';

// Professional color palette
const COLORS = {
  warmBrown: '#3c2f23',
  dividerGray: '#d6c7b4',
  offWhite: '#fffdf8',
  lightBeige: '#f9f6f1',
  alternateRow: '#f8f5f0',
  textGray: '#888888'
};

// Typography settings
const FONTS = {
  serif: 'times', // Using Times for more traditional serif look
  sans: 'helvetica',
  titleSize: 22,
  subtitleSize: 12,
  headingSize: 14,
  bodySize: 12,
  notesSize: 11,
  smallSize: 10,
  footerSize: 9
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
    // Bullet points to dash
    .replace(/[•●]/g, '-')
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
    // Remove any remaining non-ASCII characters
    .replace(/[^\x00-\x7F]/g, '');
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
  const margin = 1; // 1 inch margins on sides
  const topMargin = 0.75;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPos = topMargin;
  
  // ========== 1. HEADER BANNER ==========
  // Top rule line
  doc.setDrawColor(214, 199, 180); // #d6c7b4
  doc.setLineWidth(0.01);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 0.3;
  
  // Recipe Title (Centered, Large Serif Bold)
  doc.setFontSize(FONTS.titleSize);
  doc.setFont(FONTS.serif, 'bold');
  doc.setTextColor(60, 47, 35); // #3c2f23
  const titleLines = doc.splitTextToSize(cleanRecipeName, contentWidth);
  doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += (titleLines.length * 0.3) + 0.15;
  
  // Subtitle line
  doc.setFontSize(FONTS.subtitleSize);
  doc.setFont(FONTS.sans, 'normal');
  doc.setTextColor(100, 100, 100);
  const conversionLabel = result.direction === 'sourdough-to-yeast'
    ? 'Sourdough to Yeast'
    : 'Yeast to Sourdough';
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const subtitle = `Converted from ${conversionLabel} | Hydration ${result.converted.hydration.toFixed(0)}% | ${currentDate}`;
  doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 0.2;

  // Source filename (if provided)
  if (cleanSourceFileName) {
    doc.setFontSize(FONTS.smallSize);
    doc.setFont(FONTS.sans, 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Source: ${cleanSourceFileName}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 0.3;
  } else {
    yPos += 0.2;
  }
  
  // ========== 2. INTRO / DESCRIPTION BLOCK ==========
  // Add description if provided - using serif font for better readability
  if (cleanDescription) {
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.serif, 'normal');
    doc.setTextColor(60, 47, 35); // Warm brown instead of gray for better readability
    const descLines = doc.splitTextToSize(cleanDescription, contentWidth);
    // Left-aligned for better readability of longer paragraphs
    descLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 0.18;
    });
    yPos += 0.25; // Extra space after description
  }
  
  // ========== 3. INGREDIENTS SECTION ==========
  const convertedPercentages = calculateBakersPercentages(result.converted);
  const ingredientGroups = groupIngredients(convertedPercentages, result.direction);

  // Section heading with divider
  doc.setDrawColor(214, 199, 180);
  doc.setLineWidth(0.02);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 0.2;
  
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.serif, 'bold');
  doc.setTextColor(60, 47, 35);
  doc.text('INGREDIENTS', margin, yPos);
  yPos += 0.35;

  // Render ingredients as bullet list
  ingredientGroups.forEach((group, groupIndex) => {
    // Check if we need a new page
    if (yPos > pageHeight - 2) {
      doc.addPage();
      yPos = topMargin;
    }

    // Group subheading (bold)
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.serif, 'bold');
    doc.setTextColor(60, 47, 35);
    doc.text(cleanTextForPDF(group.section), margin, yPos);
    yPos += 0.25;

    // Ingredients in this group
    doc.setFont(FONTS.serif, 'normal');
    doc.setTextColor(0, 0, 0);
    group.ingredients.forEach(item => {
      // Check if we need a new page
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }

      // Bullet point - using simple dash for UTF-8 safety
      doc.text('-', margin + 0.1, yPos);

      // Ingredient name and amount - clean the text
      const ingredientText = cleanTextForPDF(`${item.ingredient}: ${item.amount.toFixed(0)}g (${item.percentage.toFixed(0)}%)`);
      const ingredientLines = doc.splitTextToSize(ingredientText, contentWidth - 0.4);
      ingredientLines.forEach((line: string) => {
        doc.text(line, margin + 0.3, yPos);
        yPos += 0.18; // 1.5x line spacing
      });
    });

    yPos += 0.75 / 12 * FONTS.bodySize; // 0.75em space between groups
  });

  // Total Hydration (after ingredients)
  yPos += 0.1;
  doc.setFontSize(FONTS.bodySize);
  doc.setFont(FONTS.serif, 'bold');
  doc.setTextColor(60, 47, 35);
  doc.text(`Total Hydration: ${result.converted.hydration.toFixed(0)}%`, margin, yPos);
  yPos += 0.5;
  
  // ========== 4. METHOD SECTION ==========
  // Check if we need a new page
  if (yPos > pageHeight - 2) {
    doc.addPage();
    yPos = topMargin;
  }

  // Section heading with divider
  doc.setDrawColor(214, 199, 180);
  doc.setLineWidth(0.02);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 0.2;
  
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.serif, 'bold');
  doc.setTextColor(60, 47, 35);
  doc.text('METHOD', margin, yPos);
  yPos += 0.35;

  doc.setFontSize(FONTS.bodySize);
  result.methodChanges.forEach((change, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 1.5) {
      doc.addPage();
      yPos = topMargin;
    }

    // Step label (bold) - using serif for consistency
    doc.setFont(FONTS.serif, 'bold');
    doc.setTextColor(0, 0, 0);
    const stepLabel = cleanTextForPDF(change.step); // Already includes number from template
    doc.text(stepLabel, margin, yPos);
    yPos += 0.2;

    // Step content (serif for readability)
    doc.setFont(FONTS.serif, 'normal');
    const changeLines = doc.splitTextToSize(cleanTextForPDF(change.change), contentWidth);
    changeLines.forEach((line: string) => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }
      doc.text(line, margin, yPos);
      yPos += 0.18; // 1.5x line spacing
    });

    // Timing if available (italicized, as per spec)
    if (change.timing) {
      doc.setFont(FONTS.serif, 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(cleanTextForPDF(`Timing: ${change.timing}`), margin + 0.1, yPos);
      yPos += 0.18;
    }

    yPos += 0.75 / 12 * FONTS.bodySize; // 0.75em space between steps
  });

  yPos += 0.2;
  
  // ========== 5. TROUBLESHOOTING / TIPS ==========
  if (result.troubleshootingTips.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 2.5) {
      doc.addPage();
      yPos = topMargin;
    }
    
    // Draw background box
    const boxStartY = yPos - 0.1;
    const boxHeight = Math.min(2.5, pageHeight - yPos - 0.5);
    doc.setFillColor(249, 246, 241); // #f9f6f1
    doc.setDrawColor(214, 199, 180); // #d6c7b4
    doc.setLineWidth(0.01);
    doc.rect(margin, boxStartY, contentWidth, boxHeight, 'FD');
    
    yPos += 0.15;

    // Title
    doc.setFontSize(FONTS.headingSize);
    doc.setFont(FONTS.serif, 'bold');
    doc.setTextColor(60, 47, 35);
    doc.text("NOTES", margin + 0.15, yPos);
    yPos += 0.25;

    // Tips
    doc.setFontSize(FONTS.notesSize);
    doc.setFont(FONTS.serif, 'normal');
    doc.setTextColor(0, 0, 0);

    result.troubleshootingTips.slice(0, 4).forEach(tip => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }

      // Bullet point - using simple dash for UTF-8 safety
      doc.text('-', margin + 0.15, yPos);

      // Issue (bold)
      doc.setFont(FONTS.serif, 'bold');
      const issueLines = doc.splitTextToSize(cleanTextForPDF(tip.issue), contentWidth - 0.3);
      issueLines.forEach((line: string) => {
        doc.text(line, margin + 0.3, yPos);
        yPos += 0.18; // 1.5x line spacing
      });

      // Solution (regular)
      doc.setFont(FONTS.serif, 'normal');
      const solutionLines = doc.splitTextToSize(cleanTextForPDF(tip.solution), contentWidth - 0.3);
      solutionLines.forEach((line: string) => {
        if (yPos > pageHeight - 1) {
          doc.addPage();
          yPos = topMargin;
        }
        doc.text(line, margin + 0.3, yPos);
        yPos += 0.18; // 1.5x line spacing
      });

      yPos += 0.15;
    });
    
    yPos += 0.2;
  }
  
  // ========== 6. SUBSTITUTIONS / VARIATIONS ==========
  if (result.substitutions.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 2.5) {
      doc.addPage();
      yPos = topMargin;
    }
    
    // Draw background box
    const boxStartY = yPos - 0.1;
    const boxHeight = Math.min(2, pageHeight - yPos - 0.5);
    doc.setFillColor(249, 246, 241);
    doc.setDrawColor(214, 199, 180);
    doc.setLineWidth(0.01);
    doc.rect(margin, boxStartY, contentWidth, boxHeight, 'FD');
    
    yPos += 0.15;

    // Title
    doc.setFontSize(FONTS.headingSize);
    doc.setFont(FONTS.serif, 'bold');
    doc.setTextColor(60, 47, 35);
    doc.text('SUBSTITUTIONS', margin + 0.15, yPos);
    yPos += 0.25;

    doc.setFontSize(FONTS.notesSize);
    doc.setFont(FONTS.serif, 'normal');
    doc.setTextColor(0, 0, 0);

    result.substitutions.slice(0, 4).forEach(sub => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }

      // Bullet point - using simple dash for UTF-8 safety
      doc.text('-', margin + 0.15, yPos);

      // Original to Substitute (bold)
      doc.setFont(FONTS.serif, 'bold');
      doc.text(cleanTextForPDF(`${sub.original} to ${sub.substitute}`), margin + 0.3, yPos);
      yPos += 0.18;

      // Ratio and notes
      doc.setFont(FONTS.serif, 'normal');
      doc.text(cleanTextForPDF(`Ratio: ${sub.ratio}`), margin + 0.3, yPos);
      yPos += 0.15;

      const notesLines = doc.splitTextToSize(cleanTextForPDF(sub.notes), contentWidth - 0.45);
      notesLines.slice(0, 2).forEach((line: string) => {
        doc.text(line, margin + 0.3, yPos);
        yPos += 0.15;
      });

      yPos += 0.15;
    });
    
    yPos += 0.2;
  }
  
  // Add flavor tip for sourdough-to-yeast conversions
  if (result.direction === 'sourdough-to-yeast') {
    if (yPos > pageHeight - 1.5) {
      doc.addPage();
      yPos = topMargin;
    }
    
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.sans, 'bold');
    doc.setTextColor(60, 47, 35);
    doc.text('TIP FOR SOURDOUGH FLAVOR:', margin, yPos);
    yPos += 0.18; // 1.5x line spacing
    
    doc.setFont(FONTS.sans, 'normal');
    doc.setTextColor(0, 0, 0);
    const tipLines = doc.splitTextToSize(
      'To mimic sourdough tang, add 15g (1 tbsp) lemon juice or plain yogurt to the liquid ingredients.',
      contentWidth
    );
    tipLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 0.18; // 1.5x line spacing
    });
  }
  
  // ========== 7. FOOTER ==========
  const footerY = pageHeight - 0.5;
  
  // Top rule
  doc.setDrawColor(214, 199, 180);
  doc.setLineWidth(0.01);
  doc.line(margin, footerY - 0.15, pageWidth - margin, footerY - 0.15);
  
  // Footer text
  doc.setFontSize(FONTS.footerSize);
  doc.setFont(FONTS.sans, 'normal');
  doc.setTextColor(170, 170, 170); // Light grey
  doc.text(
    'Converted with Bread Buddy - BakingGreatBread.com',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Page number
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.text(
    `Page ${pageCount}`,
    pageWidth - margin,
    footerY,
    { align: 'right' }
  );
  
  // Generate filename - use cleaned name
  const cleanName = cleanRecipeName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  const conversionType = result.direction === 'sourdough-to-yeast' ? 'SourdoughToYeast' : 'YeastToSourdough';
  const filename = `${cleanName}_BreadBuddy_${conversionType}.pdf`;
  
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
