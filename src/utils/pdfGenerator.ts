import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  serif: 'helvetica', // jsPDF doesn't support custom fonts easily, using helvetica as fallback
  sans: 'helvetica',
  titleSize: 24,
  subtitleSize: 12,
  headingSize: 14,
  bodySize: 11,
  smallSize: 10,
  footerSize: 9
};

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

export function generatePDF(result: ConvertedRecipe, recipeName: string = 'Converted Recipe') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'in',
    format: 'letter'
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
  const titleLines = doc.splitTextToSize(recipeName, contentWidth);
  doc.text(titleLines, pageWidth / 2, yPos, { align: 'center' });
  yPos += (titleLines.length * 0.3) + 0.15;
  
  // Subtitle line
  doc.setFontSize(FONTS.subtitleSize);
  doc.setFont(FONTS.sans, 'italic');
  doc.setTextColor(100, 100, 100);
  const conversionLabel = result.direction === 'sourdough-to-yeast' 
    ? 'Sourdough → Yeast' 
    : 'Yeast → Sourdough';
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
  const subtitle = `Converted from ${conversionLabel}  •  Hydration ${result.converted.hydration.toFixed(0)}%  •  ${currentDate}`;
  doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
  yPos += 0.4;
  
  // ========== 2. INTRO / DESCRIPTION BLOCK ==========
  // Optional - could be added if we have description field in future
  // For now, skip to ingredients
  
  // ========== 3. INGREDIENTS TABLE ==========
  const convertedPercentages = calculateBakersPercentages(result.converted);
  const ingredientGroups = groupIngredients(convertedPercentages, result.direction);
  
  // Build table data with section headers
  const tableData: any[] = [];
  ingredientGroups.forEach((group, groupIndex) => {
    // Add section header row
    tableData.push([
      { content: group.section, colSpan: 3, styles: { 
        fillColor: [248, 245, 240],
        fontStyle: 'bold',
        fontSize: FONTS.bodySize,
        textColor: [60, 47, 35]
      }}
    ]);
    
    // Add ingredients in this section
    group.ingredients.forEach(item => {
      tableData.push([
        item.ingredient,
        `${item.amount.toFixed(0)}g`,
        `${item.percentage.toFixed(0)}%`
      ]);
    });
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Ingredient', 'Amount', "Baker's %"]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 253, 248],
      textColor: [60, 47, 35],
      fontStyle: 'bold',
      fontSize: FONTS.subtitleSize,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: FONTS.bodySize,
      textColor: [0, 0, 0]
    },
    alternateRowStyles: {
      fillColor: [248, 245, 240]
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.5 },
      1: { cellWidth: contentWidth * 0.25, halign: 'right' },
      2: { cellWidth: contentWidth * 0.25, halign: 'right' }
    },
    margin: { left: margin, right: margin }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 0.3;
  
  // Total Hydration (after table)
  doc.setFontSize(FONTS.bodySize);
  doc.setFont(FONTS.sans, 'bold');
  doc.setTextColor(60, 47, 35);
  doc.text(`Total Hydration: ${result.converted.hydration.toFixed(0)}%`, margin, yPos);
  yPos += 0.4;
  
  // ========== 4. METHOD SECTION ==========
  // Check if we need a new page
  if (yPos > pageHeight - 2) {
    doc.addPage();
    yPos = topMargin;
  }
  
  doc.setFontSize(FONTS.headingSize);
  doc.setFont(FONTS.serif, 'bold');
  doc.setTextColor(60, 47, 35);
  doc.text('METHOD', margin, yPos);
  yPos += 0.25;
  
  doc.setFontSize(FONTS.bodySize);
  result.methodChanges.forEach((change, index) => {
    // Check if we need a new page
    if (yPos > pageHeight - 1.5) {
      doc.addPage();
      yPos = topMargin;
    }
    
    // Step label (bold)
    doc.setFont(FONTS.sans, 'bold');
    doc.setTextColor(0, 0, 0);
    const stepLabel = `${index + 1}. ${change.step}`;
    doc.text(stepLabel, margin, yPos);
    yPos += 0.2;
    
    // Step content (regular)
    doc.setFont(FONTS.sans, 'normal');
    const changeLines = doc.splitTextToSize(change.change, contentWidth);
    changeLines.forEach((line: string) => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }
      doc.text(line, margin, yPos);
      yPos += 0.18;
    });
    
    // Timing if available
    if (change.timing) {
      doc.setFont(FONTS.sans, 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`⏱ ${change.timing}`, margin + 0.1, yPos);
      yPos += 0.18;
    }
    
    yPos += 0.15; // Space between steps
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
    doc.setFontSize(FONTS.subtitleSize);
    doc.setFont(FONTS.serif, 'bold');
    doc.setTextColor(60, 47, 35);
    doc.text("BAKER'S NOTES", margin + 0.15, yPos);
    yPos += 0.25;
    
    // Tips
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.sans, 'normal');
    doc.setTextColor(0, 0, 0);
    
    result.troubleshootingTips.slice(0, 4).forEach(tip => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }
      
      // Bullet with checkmark
      doc.text('✓', margin + 0.15, yPos);
      
      // Issue (bold)
      doc.setFont(FONTS.sans, 'bold');
      doc.text(tip.issue, margin + 0.3, yPos);
      yPos += 0.18;
      
      // Solution (regular)
      doc.setFont(FONTS.sans, 'normal');
      const solutionLines = doc.splitTextToSize(tip.solution, contentWidth - 0.3);
      solutionLines.forEach((line: string) => {
        if (yPos > pageHeight - 1) {
          doc.addPage();
          yPos = topMargin;
        }
        doc.text(line, margin + 0.3, yPos);
        yPos += 0.18;
      });
      
      yPos += 0.1;
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
    doc.setFontSize(FONTS.subtitleSize);
    doc.setFont(FONTS.serif, 'bold');
    doc.setTextColor(60, 47, 35);
    doc.text('SUBSTITUTIONS', margin + 0.15, yPos);
    yPos += 0.25;
    
    doc.setFontSize(FONTS.bodySize);
    doc.setFont(FONTS.sans, 'normal');
    doc.setTextColor(0, 0, 0);
    
    result.substitutions.slice(0, 4).forEach(sub => {
      if (yPos > pageHeight - 1) {
        doc.addPage();
        yPos = topMargin;
      }
      
      // Original → Substitute (bold)
      doc.setFont(FONTS.sans, 'bold');
      doc.text(`• ${sub.original} → ${sub.substitute}`, margin + 0.15, yPos);
      yPos += 0.18;
      
      // Ratio and notes
      doc.setFont(FONTS.sans, 'normal');
      doc.text(`  Ratio: ${sub.ratio}`, margin + 0.3, yPos);
      yPos += 0.15;
      
      const notesLines = doc.splitTextToSize(sub.notes, contentWidth - 0.45);
      notesLines.slice(0, 2).forEach((line: string) => {
        doc.text(line, margin + 0.3, yPos);
        yPos += 0.15;
      });
      
      yPos += 0.1;
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
    doc.text('Tip for Sourdough Flavor:', margin, yPos);
    yPos += 0.18;
    
    doc.setFont(FONTS.sans, 'normal');
    doc.setTextColor(0, 0, 0);
    const tipLines = doc.splitTextToSize(
      'To mimic sourdough tang, add 15g (1 tbsp) lemon juice or plain yogurt to the liquid ingredients.',
      contentWidth
    );
    tipLines.forEach((line: string) => {
      doc.text(line, margin, yPos);
      yPos += 0.18;
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
  doc.setTextColor(136, 136, 136);
  doc.text(
    'Recipe conversion powered by Bread Buddy Converter • BakingGreatBread.com',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  
  // Generate filename
  const cleanName = recipeName.replace(/[^a-zA-Z0-9]/g, '');
  const conversionType = result.direction === 'sourdough-to-yeast' ? 'SourdoughToYeast' : 'YeastToSourdough';
  const filename = `${cleanName}_BreadBuddy_${conversionType}.pdf`;
  
  // Save with UTF-8 encoding
  doc.save(filename);
}
