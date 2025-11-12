import jsPDF from 'jspdf';
import { ConvertedRecipe, BakersPercentage } from '@/types/recipe';
import { calculateBakersPercentages } from './recipeConverter';

// Professional color palette for blog-style recipe card
const COLORS = {
  darkText: '#2c2c2c',
  sectionDivider: '#e6e6e6',
  lightShade: '#f9f9f9',
  mediumGray: '#666666',
  lightGray: '#999999'
};

// Typography settings - clean, modern sans-serif
const FONTS = {
  main: 'helvetica',
  titleSize: 24,
  subtitleSize: 12,
  headingSize: 16,
  subheadingSize: 14,
  bodySize: 12,
  timingSize: 11,
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
  // Recipe Title (Centered, Large Bold)
  doc.setFontSize(FONTS.titleSize);
  doc.setFont(FONTS.main, 'bold');
  doc.setTextColor(44, 44, 44); // #2c2c2c
  const titleLines = doc.splitTextToSize(cleanRecipeName, contentWidth);
  doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += (titleLines.length * 0.35) + 0.2;
  
  // Subtitle line
  doc.setFontSize(FONTS.subtitleSize);
  doc.setFont(FONTS.main, 'normal');
  doc.setTextColor(153, 153, 153); // #999999
  const conversionLabel = result.direction === 'sourdough-to-yeast'
    ? 'Sourdough to Yeast'
    : 'Yeast to Sourdough';
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const subtitle = `${conversionLabel} | Hydration ${result.converted.hydration.toFixed(0)}% | ${currentDate}`;
  doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 0.4;

  // Thick horizontal divider
  doc.setDrawColor(230, 230, 230); // #e6e6e6
  doc.setLineWidth(0.04); // Thick gray bar
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 0.4;
  
  // ========== 2. INTRO / DESCRIPTION BLOCK ==========
  if (cleanDescription) {
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.main, 'italic');
    doc.setTextColor(102, 102, 102); // #666666 - lighter for subtitle feel
    const descLines = doc.splitTextToSize(cleanDescription, contentWidth);
    descLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 0.2;
    });
    yPos += 0.4;
  }
  
  // ========== 3. INGREDIENTS SECTION ==========
  const convertedPercentages = calculateBakersPercentages(result.converted);
  const ingredientGroups = groupIngredients(convertedPercentages, result.direction);

  // Section heading
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.main, 'bold');
  doc.setTextColor(44, 44, 44);
  doc.text('Ingredients', margin, yPos);
  yPos += 0.3;

  // Render ingredients as bullet list with proper grouping
  ingredientGroups.forEach((group, groupIndex) => {
    // Check if we need a new page
    if (yPos > pageHeight - 2) {
      doc.addPage();
      yPos = topMargin;
    }

    // Group subheading (bold, larger)
    doc.setFontSize(FONTS.subheadingSize);
    doc.setFont(FONTS.main, 'bold');
    doc.setTextColor(44, 44, 44);
    doc.text(cleanTextForPDF(`For the ${group.section}`), margin, yPos);
    yPos += 0.32;

    // Ingredients in this group
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.main, 'normal');
    doc.setTextColor(44, 44, 44);
    group.ingredients.forEach(item => {
      // Check if we need a new page
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }

      // Simple bullet point (dash)
      doc.text('-', margin, yPos);

      // Ingredient: amount (percentage)
      const ingredientText = cleanTextForPDF(`${item.ingredient}: ${item.amount.toFixed(0)}g (${item.percentage.toFixed(0)}%)`);
      const ingredientLines = doc.splitTextToSize(ingredientText, contentWidth - 0.3);
      ingredientLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 0.2, yPos);
        if (idx < ingredientLines.length - 1) {
          yPos += 0.18;
        }
      });
      yPos += 0.2;
    });

    // Extra space between groups
    yPos += 0.2;
  });

  // Total Hydration
  yPos += 0.05;
  doc.setFontSize(FONTS.bodySize);
  doc.setFont(FONTS.main, 'bold');
  doc.setTextColor(44, 44, 44);
  doc.text(`Total Hydration: ${result.converted.hydration.toFixed(0)}%`, margin, yPos);
  yPos += 0.5;
  
  // Thick horizontal divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.04); // Thick gray bar
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 0.4;
  
  // ========== 4. METHOD SECTION ==========
  // Check if we need a new page
  if (yPos > pageHeight - 2) {
    doc.addPage();
    yPos = topMargin;
  }

  // Section heading
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.main, 'bold');
  doc.setTextColor(44, 44, 44);
  doc.text('Method', margin, yPos);
  yPos += 0.3;

  doc.setFontSize(FONTS.bodySize);
  result.methodChanges.forEach((change, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 1.5) {
      doc.addPage();
      yPos = topMargin;
    }

    // Step number and title on same line
    doc.setFont(FONTS.main, 'bold');
    doc.setTextColor(44, 44, 44);
    const stepTitle = cleanTextForPDF(`${index + 1}. ${change.step}`);
    doc.text(stepTitle, margin, yPos);
    yPos += 0.22;

    // Step content (regular weight, full width)
    doc.setFont(FONTS.main, 'normal');
    let changeText = cleanTextForPDF(change.change);
    
    // If timing exists, integrate it into the text naturally
    if (change.timing) {
      changeText += ` (${cleanTextForPDF(change.timing)})`;
    }
    
    const changeLines = doc.splitTextToSize(changeText, contentWidth);
    changeLines.forEach((line: string) => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }
      doc.text(line, margin, yPos);
      yPos += 0.18;
    });

    yPos += 0.25; // Space between steps
  });

  yPos += 0.2;
  
  // Thick horizontal divider
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.04); // Thick gray bar
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 0.4;
  
  // ========== 5. BAKER'S NOTES ==========
  if (result.troubleshootingTips.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 2) {
      doc.addPage();
      yPos = topMargin;
    }

    // Section heading
    doc.setFontSize(FONTS.headingSize);
    doc.setFont(FONTS.main, 'bold');
    doc.setTextColor(44, 44, 44);
    doc.text("Tips & Tricks", margin, yPos);
    yPos += 0.3;

    // Tips with bullet points (same style as ingredients)
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.main, 'normal');
    doc.setTextColor(44, 44, 44);

    result.troubleshootingTips.slice(0, 6).forEach(tip => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }

      // Simple dash bullet
      doc.text('-', margin, yPos);

      // Combine issue and solution in one line
      const tipText = cleanTextForPDF(`${tip.issue}: ${tip.solution}`);
      const tipLines = doc.splitTextToSize(tipText, contentWidth - 0.3);
      tipLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 0.2, yPos);
        if (idx < tipLines.length - 1) {
          yPos += 0.18;
        }
      });
      yPos += 0.2;
    });
    
    yPos += 0.3;
  }
  
  // ========== 6. SUBSTITUTIONS ==========
  if (result.substitutions.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 2) {
      doc.addPage();
      yPos = topMargin;
    }
    
    // Thick horizontal divider
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.04); // Thick gray bar
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 0.4;

    // Section heading
    doc.setFontSize(FONTS.headingSize);
    doc.setFont(FONTS.main, 'bold');
    doc.setTextColor(44, 44, 44);
    doc.text('Substitutions', margin, yPos);
    yPos += 0.3;

    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.main, 'normal');
    doc.setTextColor(44, 44, 44);

    result.substitutions.slice(0, 5).forEach(sub => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }

      // Simple dash bullet
      doc.text('-', margin, yPos);

      // Combine all info in one readable line
      const subText = cleanTextForPDF(`${sub.original} → ${sub.substitute} (Ratio: ${sub.ratio}): ${sub.notes}`);
      const subLines = doc.splitTextToSize(subText, contentWidth - 0.3);
      subLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 0.2, yPos);
        if (idx < subLines.length - 1) {
          yPos += 0.18;
        }
      });
      yPos += 0.2;
    });
    
    yPos += 0.3;
  }
  
  // Add flavor tip for sourdough-to-yeast conversions
  if (result.direction === 'sourdough-to-yeast') {
    if (yPos > pageHeight - 1.5) {
      doc.addPage();
      yPos = topMargin;
    }
    
    // Thick horizontal divider
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.04); // Thick gray bar
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 0.3;
    
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.main, 'bold');
    doc.setTextColor(44, 44, 44);
    doc.text('Tip for Sourdough Flavor:', margin, yPos);
    yPos += 0.22;
    
    doc.setFont(FONTS.main, 'normal');
    const tipLines = doc.splitTextToSize(
      'To mimic sourdough tang, add 15g (1 tbsp) lemon juice or plain yogurt to the liquid ingredients.',
      contentWidth
    );
    tipLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 0.2;
    });
  }
  
  // ========== 7. FOOTER ==========
  const footerY = pageHeight - 0.5;
  
  // Top rule
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.01);
  doc.line(margin, footerY - 0.15, pageWidth - margin, footerY - 0.15);
  
  // Footer text
  doc.setFontSize(FONTS.footerSize);
  doc.setFont(FONTS.main, 'normal');
  doc.setTextColor(153, 153, 153); // #999999
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
