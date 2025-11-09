import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from './recipeConverter';

export function generatePDF(result: ConvertedRecipe, recipeName: string = 'Converted Recipe') {
  const doc = new jsPDF();
  
  // Header - Recipe Name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(recipeName, 105, 15, { align: 'center' });
  
  // Subtitle - Conversion type
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  const subtitle = result.direction === 'sourdough-to-yeast' 
    ? 'Yeast Conversion Recipe'
    : 'Sourdough Conversion Recipe';
  doc.text(subtitle, 105, 23, { align: 'center' });
  
  // Branding
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Recipe conversion by BakingGreatBread.com', 105, 30, { align: 'center' });
  
  let yPos = 38;
  
  // Converted Ingredients
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Converted Recipe', 14, yPos);
  yPos += 8;
  
  const convertedPercentages = calculateBakersPercentages(result.converted);
  
  // For yeast-to-sourdough, split into LEVAIN and DOUGH sections
  if (result.direction === 'yeast-to-sourdough' && convertedPercentages.length > 3) {
    // LEVAIN Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('LEVAIN (build night before):', 14, yPos);
    yPos += 6;
    
    const levainData = convertedPercentages.slice(0, 3).map(item => [
      item.ingredient,
      `${item.amount.toFixed(0)}g`,
      `${item.percentage.toFixed(0)}%`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Ingredient', 'Amount', 'Baker\'s %']],
      body: levainData,
      theme: 'grid',
      headStyles: { fillColor: [184, 134, 100] },
      margin: { left: 14 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 8;
    
    // DOUGH Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DOUGH:', 14, yPos);
    yPos += 6;
    
    const doughData = convertedPercentages.slice(3).map(item => [
      item.ingredient,
      `${item.amount.toFixed(0)}g`,
      `${item.percentage.toFixed(0)}%`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Ingredient', 'Amount', 'Baker\'s %']],
      body: doughData,
      theme: 'grid',
      headStyles: { fillColor: [184, 134, 100] },
      margin: { left: 14 }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  } else {
    // Single table for sourdough-to-yeast conversions
    const ingredientData = convertedPercentages.map(item => [
      item.ingredient,
      `${item.amount.toFixed(0)}g`,
      `${item.percentage.toFixed(0)}%`
    ]);
    
    autoTable(doc, {
      startY: yPos,
      head: [['Ingredient', 'Amount', 'Baker\'s %']],
      body: ingredientData,
      theme: 'grid',
      headStyles: { fillColor: [184, 134, 100] },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Hydration
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Hydration: ${result.converted.hydration.toFixed(0)}%`, 14, yPos);
  yPos += 10;
  
  // Add flavor tip for sourdough-to-yeast conversions
  if (result.direction === 'sourdough-to-yeast') {
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Tip for Sourdough Flavor:', 14, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const tipLines = doc.splitTextToSize(
      'To mimic sourdough tang, add 15g (1 tbsp) lemon juice or plain yogurt to the liquid ingredients.',
      180
    );
    doc.text(tipLines, 14, yPos);
    yPos += tipLines.length * 5;
  }
  
  yPos += 10;
  
  // Warnings
  if (result.warnings.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recipe Warnings', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    result.warnings.forEach(warning => {
      const prefix = warning.type === 'caution' ? '⚠️' : warning.type === 'warning' ? '⚡' : 'ℹ️';
      doc.setFont('helvetica', 'bold');
      const warningType = warning.type === 'caution' ? 'CAUTION' : warning.type === 'warning' ? 'NOTE' : 'INFO';
      doc.text(`${prefix} ${warningType}:`, 14, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(warning.message, 180);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 3;
    });
    
    yPos += 5;
  }
  
  // Method Updates
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Method Updates', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  result.methodChanges.forEach(change => {
    doc.setFont('helvetica', 'bold');
    doc.text(`✓ ${change.step}`, 14, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(change.change, 180);
    doc.text(lines, 14, yPos);
    yPos += lines.length * 6 + 4;
  });

  yPos += 5;
  
  // Troubleshooting Tips
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Troubleshooting Tips', 14, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  result.troubleshootingTips.forEach(tip => {
    doc.setFont('helvetica', 'bold');
    doc.text(tip.issue, 14, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(tip.solution, 180);
    doc.text(lines, 14, yPos);
    yPos += lines.length * 6 + 4;
  });
  
  yPos += 2;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  const reminderLines = doc.splitTextToSize('Remember: Watch the dough, not the clock. Fermentation times vary with temperature and flour type.', 180);
  doc.text(reminderLines, 14, yPos);
  yPos += reminderLines.length * 5 + 5;
  
  // Ingredient Substitutions
  if (result.substitutions.length > 0) {
    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingredient Substitutions', 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    result.substitutions.forEach(sub => {
      // Check if we need a new page for this substitution
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${sub.original} → ${sub.substitute}`, 14, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Ratio: ${sub.ratio}`, 14, yPos);
      yPos += 5;
      
      if (sub.hydrationAdjustment !== 0) {
        const adjustment = sub.hydrationAdjustment > 0 ? `+${sub.hydrationAdjustment}` : sub.hydrationAdjustment;
        doc.text(`Hydration: ${adjustment}%`, 14, yPos);
        yPos += 5;
      }
      
      doc.setFontSize(9);
      const notesLines = doc.splitTextToSize(sub.notes, 180);
      doc.text(notesLines, 14, yPos);
      yPos += notesLines.length * 4 + 4;
      
      doc.setFontSize(10);
    });
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('BakingGreatBread.com', 105, pageHeight - 15, { align: 'center' });
  
  // Save
  doc.save('recipe-conversion.pdf');
}
