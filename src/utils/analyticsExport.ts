export interface ExportData {
  summary: any;
  additionalMetrics: any;
  dailyConversions: any[];
  conversionBreakdown: any[];
  parsingMethodStats: any[];
  failedRecipes: any[];
  errorStats: any[];
  funnelData: any[];
  trafficSources: any[];
}

export const exportToCSV = (data: ExportData, timePeriod: number) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `bgb-analytics-${timePeriod}days-${timestamp}.csv`;

  // Create CSV content
  let csv = 'BGB Recipe Converter Analytics Report\n';
  csv += `Generated: ${new Date().toLocaleString()}\n`;
  csv += `Time Period: Last ${timePeriod} days\n\n`;

  // Summary Section
  csv += 'SUMMARY METRICS\n';
  csv += 'Metric,Value\n';
  csv += `Total Conversions,${data.summary.totalConversions}\n`;
  csv += `File Uploads,${data.summary.totalUploads}\n`;
  csv += `Total Sessions,${data.summary.totalSessions}\n`;
  csv += `Active Sessions,${data.summary.activeSessions}\n`;
  csv += `AI Success Rate,${data.summary.aiParsingSuccessRate}%\n`;
  csv += `PDF Downloads,${data.additionalMetrics.pdfDownloads}\n`;
  csv += `Recipes Saved,${data.additionalMetrics.recipesSaved}\n`;
  csv += `Avg Session Duration,${data.additionalMetrics.avgSessionDuration}s\n`;
  csv += `Return Visitor Rate,${data.additionalMetrics.returnVisitorRate}%\n`;
  csv += `Error Rate,${data.additionalMetrics.errorRate}%\n\n`;

  // Daily Conversions
  csv += 'DAILY CONVERSIONS\n';
  csv += 'Date,Conversions\n';
  data.dailyConversions.forEach(day => {
    csv += `${day.date},${day.conversions}\n`;
  });
  csv += '\n';

  // Conversion Breakdown
  csv += 'CONVERSION BREAKDOWN\n';
  csv += 'Type,Count\n';
  data.conversionBreakdown.forEach(item => {
    csv += `${item.type},${item.count}\n`;
  });
  csv += '\n';

  // Error Statistics
  if (data.errorStats.length > 0) {
    csv += 'ERROR STATISTICS\n';
    csv += 'Category,Count,Percentage,Severity\n';
    data.errorStats.forEach(error => {
      csv += `${error.category},${error.count},${error.percentage}%,${error.severity}\n`;
    });
    csv += '\n';
  }

  // Funnel Data
  if (data.funnelData.length > 0) {
    csv += 'CONVERSION FUNNEL\n';
    csv += 'Stage,Count,Conversion Rate,Drop-off Rate\n';
    data.funnelData.forEach(stage => {
      csv += `${stage.stage},${stage.count},${stage.conversionRate}%,${stage.dropOffRate}%\n`;
    });
    csv += '\n';
  }

  // Traffic Sources
  csv += 'TRAFFIC SOURCES\n';
  csv += 'Source,Sessions,Percentage\n';
  data.trafficSources.forEach(source => {
    csv += `${source.source},${source.count},${source.percentage}%\n`;
  });
  csv += '\n';

  // Failed Recipes
  if (data.failedRecipes.length > 0) {
    csv += 'FAILED RECIPES (Last 10)\n';
    csv += 'Timestamp,Direction,Error,Recipe Preview\n';
    data.failedRecipes.forEach(recipe => {
      const preview = recipe.recipe_text ? recipe.recipe_text.substring(0, 100).replace(/,/g, ';') : 'N/A';
      csv += `${new Date(recipe.created_at).toLocaleString()},${recipe.conversion_direction || 'N/A'},${recipe.error_message.replace(/,/g, ';')},${preview}\n`;
    });
  }

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportToJSON = (data: ExportData, timePeriod: number) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `bgb-analytics-${timePeriod}days-${timestamp}.json`;

  const exportData = {
    metadata: {
      generated: new Date().toISOString(),
      timePeriod: `${timePeriod} days`,
      application: 'BGB Recipe Converter'
    },
    summary: data.summary,
    additionalMetrics: data.additionalMetrics,
    dailyConversions: data.dailyConversions,
    conversionBreakdown: data.conversionBreakdown,
    parsingMethodStats: data.parsingMethodStats,
    errorStats: data.errorStats,
    funnelData: data.funnelData,
    trafficSources: data.trafficSources,
    failedRecipes: data.failedRecipes.map(recipe => ({
      timestamp: recipe.created_at,
      direction: recipe.conversion_direction,
      error: recipe.error_message,
      recipePreview: recipe.recipe_text?.substring(0, 500)
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
