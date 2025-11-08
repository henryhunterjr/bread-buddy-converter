import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ConvertedRecipe } from '@/types/recipe';
import { calculateBakersPercentages } from './recipeConverter';

export function generatePDF(result: ConvertedRecipe) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  const title = result.direction === 'sourdough-to-yeast' 
    ? 'Yeast Conversion Recipe'
    : 'Sourdough Conversion Recipe';
  doc.text(title, 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Converted using BakingGreatBread.blog Recipe Converter', 105, 28, { align: 'center' });
  
  let yPos = 40;
  
  // Converted Ingredients
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Converted Recipe', 14, yPos);
  yPos += 8;
  
  const convertedPercentages = calculateBakersPercentages(result.converted);
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
  
  // Hydration
  doc.setFontSize(12);
  doc.text(`Hydration: ${result.converted.hydration.toFixed(0)}%`, 14, yPos);
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
  yPos += reminderLines.length * 5;
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('For more bread tips and recipes, visit BakingGreatBread.blog', 105, pageHeight - 15, { align: 'center' });
  
  // Save
  doc.save('recipe-conversion.pdf');
}
