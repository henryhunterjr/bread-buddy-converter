import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Home, TrendingUp, Upload, CheckCircle, Users, Printer, Share2, AlertCircle, Download, Filter, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PasswordProtection } from '@/components/PasswordProtection';
import { toast } from '@/hooks/use-toast';
import { exportToCSV, exportToJSON, ExportData } from '@/utils/analyticsExport';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsSummary {
  totalConversions: number;
  totalUploads: number;
  totalSessions: number;
  activeSessions: number;
  aiParsingSuccessRate: number;
}

interface DailyStats {
  date: string;
  conversions: number;
}

interface ConversionBreakdown {
  type: string;
  count: number;
}

interface ParsingMethodStats {
  method: string;
  count: number;
}

const COLORS = ['#D4874B', '#8B4513', '#CD853F', '#DEB887', '#F4A460'];

interface AdditionalMetrics {
  pdfDownloads: number;
  recipesSaved: number;
  avgSessionDuration: number;
  returnVisitorRate: number;
  errorRate: number;
  popularRecipeTypes: { type: string; count: number }[];
  avgRecipeComplexity: number;
  trafficSources: { source: string; count: number }[];
}

interface FailedRecipe {
  error_message: string;
  recipe_text?: string;
  conversion_direction?: string;
  created_at: string;
}

interface DetailedError {
  id: string;
  error_type: string;
  error_severity: string;
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  context: any;
  edge_function_logs?: string;
  request_data?: any;
  response_data?: any;
  created_at: string;
}

interface ErrorStats {
  category: string;
  count: number;
  percentage: number;
  severity: string;
}

interface ErrorPattern {
  pattern_id: string;
  pattern_name: string;
  error_count: number;
  affected_users: number;
  common_characteristics: string[];
  example_errors: DetailedError[];
  suggested_fix: string;
  fix_priority: 'critical' | 'high' | 'medium' | 'low';
  impact_score: number;
}

interface ErrorGroup {
  group_name: string;
  error_type: string;
  count: number;
  errors: DetailedError[];
  commonContext: Record<string, any>;
}

interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

interface TrafficSourceData {
  source: string;
  count: number;
  percentage: number;
}

export default function Analytics() {
  useAnalytics(); // Track page view
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState<7 | 30 | 60 | 90>(7);
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalConversions: 0,
    totalUploads: 0,
    totalSessions: 0,
    activeSessions: 0,
    aiParsingSuccessRate: 0,
  });
  const [additionalMetrics, setAdditionalMetrics] = useState<AdditionalMetrics>({
    pdfDownloads: 0,
    recipesSaved: 0,
    avgSessionDuration: 0,
    returnVisitorRate: 0,
    errorRate: 0,
    popularRecipeTypes: [],
    avgRecipeComplexity: 0,
    trafficSources: [],
  });
  const [dailyConversions, setDailyConversions] = useState<DailyStats[]>([]);
  const [conversionBreakdown, setConversionBreakdown] = useState<ConversionBreakdown[]>([]);
  const [parsingMethodStats, setParsingMethodStats] = useState<ParsingMethodStats[]>([]);
  const [failedRecipes, setFailedRecipes] = useState<FailedRecipe[]>([]);
  const [detailedErrors, setDetailedErrors] = useState<DetailedError[]>([]);
  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const [errorGroups, setErrorGroups] = useState<ErrorGroup[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [trafficSourceData, setTrafficSourceData] = useState<TrafficSourceData[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod, selectedSource]);

  // Pattern detection and analysis function
  const analyzeErrorPatterns = (errors: DetailedError[]): { patterns: ErrorPattern[], groups: ErrorGroup[] } => {
    // Group errors by type
    const errorsByType: Record<string, DetailedError[]> = {};
    errors.forEach(error => {
      if (!errorsByType[error.error_type]) {
        errorsByType[error.error_type] = [];
      }
      errorsByType[error.error_type].push(error);
    });

    // Create error groups
    const groups: ErrorGroup[] = Object.entries(errorsByType).map(([type, typeErrors]) => {
      const commonContext: Record<string, any> = {};
      
      // Find common characteristics
      const contexts = typeErrors.map(e => e.context || {}).filter(c => Object.keys(c).length > 0);
      if (contexts.length > 0) {
        // Check conversion_direction
        const directions = contexts.map(c => c.conversion_direction).filter(Boolean) as string[];
        if (directions.length > 0) {
          const directionCounts = directions.reduce((acc, d) => ({ ...acc, [d]: (acc[d] || 0) + 1 }), {} as Record<string, number>);
          const entries = Object.entries(directionCounts).sort((a, b) => (b[1] as number) - (a[1] as number));
          if (entries.length > 0) {
            const mostCommon = entries[0];
            const count = mostCommon[1] as number;
            if (count > directions.length * 0.5) {
              commonContext.conversion_direction = mostCommon[0];
            }
          }
        }

        // Check file uploads
        const fileUploads = contexts.filter(c => c.file_uploaded).length;
        if (fileUploads > contexts.length * 0.5) {
          commonContext.mostly_file_uploads = true;
        }
      }

      return {
        group_name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        error_type: type,
        count: typeErrors.length,
        errors: typeErrors,
        commonContext
      };
    }).sort((a, b) => b.count - a.count);

    // Detect patterns and generate recommendations
    const patterns: ErrorPattern[] = [];

    // Pattern 1: Missing Flour
    const missingFlourErrors = errors.filter(e => e.error_type === 'missing_flour');
    if (missingFlourErrors.length > 0) {
      const characteristics: string[] = [];
      const shortRecipes = missingFlourErrors.filter(e => e.context?.recipe_length < 200).length;
      const fileUploads = missingFlourErrors.filter(e => e.context?.file_uploaded).length;
      
      if (shortRecipes > missingFlourErrors.length * 0.5) {
        characteristics.push('Most failures from very short recipe text (<200 chars)');
      }
      if (fileUploads > missingFlourErrors.length * 0.3) {
        characteristics.push(`${fileUploads} out of ${missingFlourErrors.length} were file uploads - OCR may be incomplete`);
      }

      patterns.push({
        pattern_id: 'missing_flour',
        pattern_name: 'Missing Flour Detection',
        error_count: missingFlourErrors.length,
        affected_users: new Set(missingFlourErrors.map(e => e.context?.session_id)).size,
        common_characteristics: characteristics.length > 0 ? characteristics : ['No clear pattern detected'],
        example_errors: missingFlourErrors.slice(0, 3),
        suggested_fix: 'Add fallback flour detection (look for "bread flour", "AP flour", "all purpose", "wheat"). For file uploads, improve OCR preprocessing or prompt users to verify ingredient extraction.',
        fix_priority: missingFlourErrors.length > 5 ? 'high' : 'medium',
        impact_score: missingFlourErrors.length * (shortRecipes > 0 ? 2 : 1)
      });
    }

    // Pattern 2: AI Gateway Errors (Rate Limit / Usage Limit)
    const aiGatewayErrors = errors.filter(e => e.error_type === 'rate_limit' || e.error_type === 'usage_limit' || e.error_type === 'ai_gateway_error');
    if (aiGatewayErrors.length > 0) {
      const rateLimits = aiGatewayErrors.filter(e => e.error_type === 'rate_limit').length;
      const usageLimits = aiGatewayErrors.filter(e => e.error_type === 'usage_limit').length;
      
      patterns.push({
        pattern_id: 'ai_gateway',
        pattern_name: 'AI Gateway Availability',
        error_count: aiGatewayErrors.length,
        affected_users: new Set(aiGatewayErrors.map(e => e.context?.session_id)).size,
        common_characteristics: [
          rateLimits > 0 ? `${rateLimits} rate limit errors (429)` : null,
          usageLimits > 0 ? `${usageLimits} usage limit errors (402)` : null,
          'Temporary service limitations'
        ].filter(Boolean) as string[],
        example_errors: aiGatewayErrors.slice(0, 2),
        suggested_fix: rateLimits > 0 
          ? 'Implement automatic retry with exponential backoff (2s, 4s, 8s delays). Add queue system for high-traffic periods.'
          : 'Check Lovable workspace credits. Consider implementing fallback to regex-only parsing when AI is unavailable.',
        fix_priority: aiGatewayErrors.length > 10 ? 'critical' : 'high',
        impact_score: aiGatewayErrors.length * 3
      });
    }

    // Pattern 3: AI Vision Errors
    const visionErrors = errors.filter(e => e.error_type === 'ai_vision_error');
    if (visionErrors.length > 0) {
      const lowConfidence = visionErrors.filter(e => e.context?.ocr_confidence && e.context.ocr_confidence < 60).length;
      const handwritten = visionErrors.filter(e => e.context?.file_name && /handwritten|scan/i.test(e.context.file_name)).length;
      
      patterns.push({
        pattern_id: 'ai_vision',
        pattern_name: 'AI Vision Processing',
        error_count: visionErrors.length,
        affected_users: new Set(visionErrors.map(e => e.context?.session_id)).size,
        common_characteristics: [
          lowConfidence > 0 ? `${lowConfidence} had low OCR confidence (<60%)` : null,
          handwritten > 0 ? `${handwritten} appear to be handwritten` : null,
          'Image quality or format issues'
        ].filter(Boolean) as string[],
        example_errors: visionErrors.slice(0, 2),
        suggested_fix: 'Improve image preprocessing (contrast enhancement, deskewing). Add user guidance for best image capture (good lighting, flat surface). Consider supporting manual text correction after OCR.',
        fix_priority: visionErrors.length > 3 ? 'high' : 'medium',
        impact_score: visionErrors.length * 2
      });
    }

    // Pattern 4: JSON Parse Errors
    const jsonErrors = errors.filter(e => e.error_type === 'json_parse_error');
    if (jsonErrors.length > 0) {
      patterns.push({
        pattern_id: 'json_parse',
        pattern_name: 'AI Response Formatting',
        error_count: jsonErrors.length,
        affected_users: new Set(jsonErrors.map(e => e.context?.session_id)).size,
        common_characteristics: [
          'AI returned malformed JSON',
          'Response cleaning may have failed',
          'Model may be including explanatory text'
        ],
        example_errors: jsonErrors.slice(0, 2),
        suggested_fix: 'Strengthen JSON extraction (look for first { to last }). Add system prompt instruction: "Return ONLY valid JSON with no markdown, no explanation, no text before or after the JSON object." Consider retrying with stricter temperature=0.1.',
        fix_priority: jsonErrors.length > 5 ? 'high' : 'medium',
        impact_score: jsonErrors.length * 2.5
      });
    }

    // Pattern 5: Unknown/Uncategorized Errors
    const unknownErrors = errors.filter(e => e.error_type === 'unknown_error' || e.error_type === 'unknown_parsing_error');
    if (unknownErrors.length > 2) {
      patterns.push({
        pattern_id: 'unknown',
        pattern_name: 'Uncategorized Errors',
        error_count: unknownErrors.length,
        affected_users: new Set(unknownErrors.map(e => e.context?.session_id)).size,
        common_characteristics: [
          'Errors not fitting known categories',
          'May indicate new edge cases',
          'Requires manual review'
        ],
        example_errors: unknownErrors.slice(0, 3),
        suggested_fix: 'Review error messages and stack traces to identify new error categories. Update edge function error handling to categorize these specific failures. Add logging for unexpected error paths.',
        fix_priority: unknownErrors.length > 5 ? 'high' : 'low',
        impact_score: unknownErrors.length
      });
    }

    // Sort patterns by impact score
    patterns.sort((a, b) => b.impact_score - a.impact_score);

    return { patterns, groups };
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch events and sessions
      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('*');

      const { data: allSessions } = await supabase
        .from('analytics_sessions')
        .select('*');

      if (!allEvents || !allSessions) return;

      // Filter by time period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - timePeriod);
      const cutoffISO = cutoffDate.toISOString();

      const events = allEvents.filter(e => e.created_at >= cutoffISO);
      const sessions = allSessions.filter(s => s.started_at && s.started_at >= cutoffISO);

      // Filter by source if not 'all'
      let filteredEvents = events;
      let filteredSessions = sessions;
      
      if (selectedSource !== 'all') {
        const sessionIds = new Set(
          events
            .filter(e => (e.event_data as any)?.referrer === selectedSource)
            .map(e => e.session_id)
        );
        filteredEvents = events.filter(e => sessionIds.has(e.session_id));
        filteredSessions = sessions.filter(s => sessionIds.has(s.id));
      }

      // Calculate summary statistics
      const conversions = filteredEvents.filter(e => e.event_type === 'conversion_completed').length;
      const uploads = filteredEvents.filter(e => e.event_type === 'file_uploaded').length;
      const aiSuccess = filteredEvents.filter(e => e.event_type === 'ai_parsing_success').length;
      const aiFailed = filteredEvents.filter(e => e.event_type === 'ai_parsing_failed').length;
      const successRate = aiSuccess + aiFailed > 0 
        ? Math.round((aiSuccess / (aiSuccess + aiFailed)) * 100) 
        : 0;

      // Calculate active sessions (sessions in last 24 hours without end time)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const active = filteredSessions.filter(s => 
        s.started_at > oneDayAgo && !s.ended_at
      ).length;

      setSummary({
        totalConversions: conversions,
        totalUploads: uploads,
        totalSessions: filteredSessions.length,
        activeSessions: active,
        aiParsingSuccessRate: successRate,
      });

      // Calculate additional metrics
      const pdfDownloads = filteredEvents.filter(e => e.event_type === 'pdf_downloaded').length;
      const recipesSaved = filteredEvents.filter(e => e.event_type === 'recipe_saved').length;
      
      // Calculate average session duration
      const completedSessions = filteredSessions.filter(s => s.ended_at && s.started_at);
      const avgDuration = completedSessions.length > 0
        ? completedSessions.reduce((acc, s) => {
            const duration = new Date(s.ended_at!).getTime() - new Date(s.started_at!).getTime();
            return acc + duration / 1000; // Convert to seconds
          }, 0) / completedSessions.length
        : 0;

      // Calculate return visitor rate (sessions with page_views > 1)
      const returnVisitors = filteredSessions.filter(s => (s.page_views || 0) > 3).length;
      const returnRate = filteredSessions.length > 0 ? Math.round((returnVisitors / filteredSessions.length) * 100) : 0;

      // Calculate error rate
      const totalParsing = aiSuccess + aiFailed;
      const errorRate = totalParsing > 0 ? Math.round((aiFailed / totalParsing) * 100) : 0;

      // Extract recipe types and complexity
      const recipeTypes: Record<string, number> = {};
      let totalIngredients = 0;
      let recipeCount = 0;

      filteredEvents.forEach(e => {
        if (e.event_type === 'conversion_completed' && e.event_data) {
          const data = e.event_data as any;
          if (data.recipe_type) {
            recipeTypes[data.recipe_type] = (recipeTypes[data.recipe_type] || 0) + 1;
          }
          if (data.ingredient_count) {
            totalIngredients += data.ingredient_count;
            recipeCount++;
          }
        }
      });

      const popularTypes = Object.entries(recipeTypes)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const avgComplexity = recipeCount > 0 ? Math.round(totalIngredients / recipeCount) : 0;

      // Extract traffic sources (from funnel_landing events)
      const trafficSources: Record<string, number> = {};
      events.forEach(e => {
        if (e.event_type === 'funnel_landing' && e.event_data && (e.event_data as any).referrer) {
          const referrer = (e.event_data as any).referrer;
          trafficSources[referrer] = (trafficSources[referrer] || 0) + 1;
        }
      });

      const topSources = Object.entries(trafficSources)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);

      const totalSources = topSources.reduce((sum, s) => sum + s.count, 0);
      const sourcesWithPercentage = topSources.map(s => ({
        ...s,
        percentage: totalSources > 0 ? Math.round((s.count / totalSources) * 100) : 0
      }));

      setTrafficSourceData(sourcesWithPercentage);

      setAdditionalMetrics({
        pdfDownloads,
        recipesSaved,
        avgSessionDuration: Math.round(avgDuration),
        returnVisitorRate: returnRate,
        errorRate,
        popularRecipeTypes: popularTypes,
        avgRecipeComplexity: avgComplexity,
        trafficSources: topSources,
      });

      // Calculate daily conversions based on selected time period
      const daysArray = Array.from({ length: timePeriod }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (timePeriod - 1 - i));
        return date.toISOString().split('T')[0];
      });

      const dailyData = daysArray.map(date => {
        const count = filteredEvents.filter(e => 
          e.event_type === 'conversion_completed' && 
          e.created_at.startsWith(date)
        ).length;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          conversions: count
        };
      });
      setDailyConversions(dailyData);

      // Calculate conversion breakdown
      const sourdoughToYeast = filteredEvents.filter(e => 
        e.event_type === 'conversion_completed' && 
        (e.event_data as any)?.conversion_direction === 'sourdough-to-yeast'
      ).length;
      const yeastToSourdough = filteredEvents.filter(e => 
        e.event_type === 'conversion_completed' && 
        (e.event_data as any)?.conversion_direction === 'yeast-to-sourdough'
      ).length;

      setConversionBreakdown([
        { type: 'Sourdough → Yeast', count: sourdoughToYeast },
        { type: 'Yeast → Sourdough', count: yeastToSourdough },
      ]);

      // Calculate parsing method stats
      const aiParsing = filteredEvents.filter(e => e.event_type === 'ai_parsing_success').length;
      const regexParsing = filteredEvents.filter(e => e.event_type === 'regex_parsing_used').length;

      setParsingMethodStats([
        { method: 'AI Parsing', count: aiParsing },
        { method: 'Regex Parsing', count: regexParsing },
      ]);

      // Get failed recipe examples for pattern analysis (old method - fallback)
      const failedEvents = filteredEvents
        .filter(e => e.event_type === 'ai_parsing_failed')
        .map(e => ({
          error_message: (e.event_data as any)?.error_message || 'Unknown error',
          recipe_text: (e.event_data as any)?.recipe_text,
          conversion_direction: (e.event_data as any)?.conversion_direction,
          created_at: e.created_at
        }))
        .slice(0, 10);
      
      setFailedRecipes(failedEvents);

      // Fetch detailed error information from the new table
      const { data: detailedErrorData } = await supabase
        .from('analytics_error_details')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Get more for pattern analysis

      if (detailedErrorData) {
        // Filter by time period
        const filteredDetailedErrors = detailedErrorData.filter(
          e => e.created_at >= cutoffISO
        );
        setDetailedErrors(filteredDetailedErrors);

        // Analyze patterns
        const { patterns, groups } = analyzeErrorPatterns(filteredDetailedErrors);
        setErrorPatterns(patterns);
        setErrorGroups(groups);
      }

      // Calculate error statistics by category
      const errorCategories: Record<string, { count: number; severity: string }> = {};
      filteredEvents.forEach(e => {
        if (e.event_type === 'error_occurred' || e.event_type === 'ai_parsing_failed') {
          const category = (e.event_data as any)?.error_category || 'unknown_error';
          const severity = (e.event_data as any)?.error_severity || 'medium';
          if (!errorCategories[category]) {
            errorCategories[category] = { count: 0, severity };
          }
          errorCategories[category].count++;
        }
      });

      const totalErrors = Object.values(errorCategories).reduce((sum, cat) => sum + cat.count, 0);
      const errorStatsData = Object.entries(errorCategories)
        .map(([category, data]) => ({
          category: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count: data.count,
          percentage: totalErrors > 0 ? Math.round((data.count / totalErrors) * 100) : 0,
          severity: data.severity
        }))
        .sort((a, b) => b.count - a.count);
      
      setErrorStats(errorStatsData);

      // Calculate funnel data
      const funnelLanding = events.filter(e => e.event_type === 'funnel_landing').length;
      const funnelInputStarted = events.filter(e => e.event_type === 'funnel_input_started').length;
      const funnelParsingStarted = events.filter(e => e.event_type === 'funnel_parsing_started').length;
      const funnelConversionViewed = events.filter(e => e.event_type === 'funnel_conversion_viewed').length;
      const funnelDownload = events.filter(e => e.event_type === 'funnel_download').length;
      const funnelSave = events.filter(e => e.event_type === 'funnel_save').length;

      const funnelStages = [
        { stage: 'Landing', count: funnelLanding || filteredSessions.length },
        { stage: 'Input Started', count: funnelInputStarted },
        { stage: 'Parsing', count: funnelParsingStarted },
        { stage: 'Conversion Viewed', count: funnelConversionViewed || conversions },
        { stage: 'Downloaded/Saved', count: funnelDownload + funnelSave || pdfDownloads + recipesSaved },
      ];

      const funnelWithRates = funnelStages.map((stage, index) => {
        const prevCount = index > 0 ? funnelStages[index - 1].count : stage.count;
        const conversionRate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 0;
        const dropOffRate = prevCount > 0 ? 100 - conversionRate : 0;
        
        return {
          stage: stage.stage,
          count: stage.count,
          conversionRate,
          dropOffRate
        };
      });

      setFunnelData(funnelWithRates);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: 'BGB Recipe Converter Analytics',
      text: `Analytics Summary (Last ${timePeriod} days${selectedSource !== 'all' ? ` - ${selectedSource}` : ''}):\n• Total Conversions: ${summary.totalConversions}\n• Total Sessions: ${summary.totalSessions}\n• AI Success Rate: ${summary.aiParsingSuccessRate}%\n• PDF Downloads: ${additionalMetrics.pdfDownloads}\n• Error Rate: ${additionalMetrics.errorRate}%`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({ description: 'Shared successfully!' });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareData.text);
        }
      }
    } else {
      copyToClipboard(shareData.text);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: 'Analytics summary copied to clipboard!' });
  };

  const handleExportCSV = () => {
    const exportData: ExportData = {
      summary,
      additionalMetrics,
      dailyConversions,
      conversionBreakdown,
      parsingMethodStats,
      failedRecipes,
      errorStats,
      funnelData,
      trafficSources: trafficSourceData
    };
    exportToCSV(exportData, timePeriod);
    toast({ description: 'Analytics exported as CSV!' });
  };

  const handleExportJSON = () => {
    const exportData: ExportData = {
      summary,
      additionalMetrics,
      dailyConversions,
      conversionBreakdown,
      parsingMethodStats,
      failedRecipes,
      errorStats,
      funnelData,
      trafficSources: trafficSourceData
    };
    exportToJSON(exportData, timePeriod);
    toast({ description: 'Analytics exported as JSON!' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bread-terracotta mx-auto" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <PasswordProtection correctPassword="40664066">
      <div className="min-h-screen bg-gradient-to-b from-background to-bread-light">
        <Navigation 
          onHome={() => navigate('/')}
        />

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {/* Time Period Toggle */}
                <div className="flex gap-2">
                  {([7, 30, 60, 90] as const).map((days) => (
                    <Button
                      key={days}
                      variant={timePeriod === days ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimePeriod(days)}
                      className="min-w-[60px]"
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportJSON}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                    className="gap-2"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="gap-2"
                  >
                    <Home className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Source Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by source:</span>
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {trafficSourceData.map(source => (
                    <SelectItem key={source.source} value={source.source}>
                      {source.source} ({source.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSource !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSource('all')}
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Conversions</p>
                  <p className="text-3xl font-bold text-bread-terracotta">{summary.totalConversions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-bread-terracotta" />
              </div>
              <p className="text-xs text-muted-foreground">
                Number of completed recipe conversions (sourdough↔yeast)
              </p>
            </Card>
            
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">File Uploads</p>
                  <p className="text-3xl font-bold text-bread-chocolate">{summary.totalUploads}</p>
                </div>
                <Upload className="h-8 w-8 text-bread-chocolate" />
              </div>
              <p className="text-xs text-muted-foreground">
                Recipe images/PDFs uploaded for AI parsing
              </p>
            </Card>
            
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-3xl font-bold text-bread-gold">{summary.totalSessions}</p>
                </div>
                <Users className="h-8 w-8 text-bread-gold" />
              </div>
              <p className="text-xs text-muted-foreground">
                Unique visitor sessions (all-time)
              </p>
            </Card>
            
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Active Sessions</p>
                  <p className="text-3xl font-bold text-bread-wheat">{summary.activeSessions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-bread-wheat" />
              </div>
              <p className="text-xs text-muted-foreground">
                Users active in the last 24 hours
              </p>
            </Card>
            
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">AI Success Rate</p>
                  <p className="text-3xl font-bold text-green-600">{summary.aiParsingSuccessRate}%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully parsed recipes using AI
              </p>
            </Card>
          </div>

          {/* Error Dashboard */}
          {errorStats.length > 0 && (
            <Card className="p-6 mb-8 bg-red-50/50 dark:bg-red-950/10 border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-foreground">Error Dashboard</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Categorized error tracking showing frequency, impact, and severity levels
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={errorStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {errorStats.map((error, index) => (
                    <div key={index} className="bg-card p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{error.category}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          error.severity === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          error.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {error.severity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{error.count} occurrences</span>
                        <span>•</span>
                        <span>{error.percentage}% of errors</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {errorStats.some(e => e.severity === 'high') && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/30 rounded border border-red-300 dark:border-red-900">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ⚠️ <strong>High-severity errors detected!</strong> Consider investigating these issues immediately to improve user experience.
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* Conversion Funnel */}
          {funnelData.length > 0 && (
            <Card className="p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-bread-terracotta" />
                <h3 className="text-lg font-semibold text-foreground">Conversion Funnel Analysis</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Track user journey through the conversion process and identify drop-off points
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" angle={-15} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#D4874B" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {funnelData.map((stage, index) => (
                    <div key={index} className="bg-card p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{stage.stage}</span>
                        <span className="text-2xl font-bold text-bread-terracotta">{stage.count}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Conversion:</span>
                          <span className="font-medium text-green-600">{stage.conversionRate}%</span>
                        </div>
                        {stage.dropOffRate > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Drop-off:</span>
                            <span className="font-medium text-red-600">{stage.dropOffRate}%</span>
                          </div>
                        )}
                      </div>
                      {stage.dropOffRate > 30 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                          ⚠️ High drop-off rate - consider investigating this stage
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}


          {/* Additional Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">PDF Downloads</p>
                  <p className="text-2xl font-bold text-bread-terracotta">{additionalMetrics.pdfDownloads}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Users who downloaded converted recipes as PDFs
              </p>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Recipes Saved</p>
                  <p className="text-2xl font-bold text-bread-chocolate">{additionalMetrics.recipesSaved}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Users who saved recipes to "My Recipes"
              </p>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Avg Session</p>
                  <p className="text-2xl font-bold text-bread-gold">
                    {Math.floor(additionalMetrics.avgSessionDuration / 60)}m {additionalMetrics.avgSessionDuration % 60}s
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Average time users spend in the app
              </p>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Return Visitors</p>
                  <p className="text-2xl font-bold text-bread-wheat">{additionalMetrics.returnVisitorRate}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Users who visited multiple pages (3+)
              </p>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Error Rate</p>
                  <p className="text-2xl font-bold text-red-600">{additionalMetrics.errorRate}%</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Failed AI parsing attempts vs total attempts
              </p>
            </Card>

            <Card className="p-6 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Avg Complexity</p>
                  <p className="text-2xl font-bold text-bread-terracotta">{additionalMetrics.avgRecipeComplexity}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Average number of ingredients per recipe
              </p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Conversions Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Daily Conversions (Last {timePeriod} Days)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Track conversion trends to see peak usage days and overall growth patterns
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyConversions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="conversions" stroke="#D4874B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Conversion Breakdown Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Conversion Breakdown</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Which direction users prefer: converting sourdough recipes to yeast, or vice versa
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={conversionBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#D4874B" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Parsing Method Stats Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Parsing Methods Used</h3>
              <p className="text-sm text-muted-foreground mb-4">
                How users input recipes: AI-powered image/PDF parsing vs. manual regex pattern matching
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={parsingMethodStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ method, count }) => `${method}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {parsingMethodStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Popular Recipe Types */}
            {additionalMetrics.popularRecipeTypes.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Popular Recipe Types</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Most commonly converted recipe categories
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={additionalMetrics.popularRecipeTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#CD853F" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Traffic Sources */}
            {additionalMetrics.trafficSources.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-2 text-foreground">Traffic Sources</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Where users discover the converter
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={additionalMetrics.trafficSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ source, count }) => `${source}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {additionalMetrics.trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </div>

          {/* Error Pattern Analysis */}
          {errorPatterns.length > 0 && (
            <Card className="p-6 mb-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-900/30">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-foreground">Automated Error Pattern Detection</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                AI-powered analysis identifying common error patterns, their impact, and actionable fixes ranked by priority
              </p>
              
              <div className="space-y-4">
                {errorPatterns.map((pattern) => (
                  <div 
                    key={pattern.pattern_id} 
                    className="bg-white dark:bg-gray-900 p-5 rounded-lg border-2 shadow-sm"
                    style={{
                      borderColor: 
                        pattern.fix_priority === 'critical' ? '#dc2626' :
                        pattern.fix_priority === 'high' ? '#f97316' :
                        pattern.fix_priority === 'medium' ? '#eab308' :
                        '#3b82f6'
                    }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-base font-bold text-foreground">{pattern.pattern_name}</h4>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            pattern.fix_priority === 'critical' ? 'bg-red-600 text-white' :
                            pattern.fix_priority === 'high' ? 'bg-orange-500 text-white' :
                            pattern.fix_priority === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            {pattern.fix_priority.toUpperCase()} PRIORITY
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            Impact Score: {pattern.impact_score}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground mb-3">
                          <span>🔢 <strong>{pattern.error_count}</strong> occurrences</span>
                          <span>👥 <strong>{pattern.affected_users}</strong> users affected</span>
                        </div>
                      </div>
                    </div>

                    {/* Common Characteristics */}
                    <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900/30">
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">🔍 Pattern Characteristics:</p>
                      <ul className="space-y-1">
                        {pattern.common_characteristics.map((char, idx) => (
                          <li key={idx} className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                            <span className="mt-0.5">•</span>
                            <span>{char}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Suggested Fix */}
                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900/30">
                      <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">💡 Suggested Fix:</p>
                      <p className="text-xs text-green-700 dark:text-green-300">{pattern.suggested_fix}</p>
                    </div>

                    {/* Example Errors */}
                    <details className="mt-3">
                      <summary className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                        View {pattern.example_errors.length} Example Error{pattern.example_errors.length > 1 ? 's' : ''}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {pattern.example_errors.map((error, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded border text-xs">
                            <div className="font-medium text-red-600 dark:text-red-400">{error.error_message}</div>
                            <div className="text-gray-600 dark:text-gray-400 mt-1">
                              {new Date(error.created_at).toLocaleString()}
                              {error.context?.conversion_direction && ` • ${error.context.conversion_direction}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-lg border border-purple-300 dark:border-purple-800">
                <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  🎯 How to Use This Analysis
                </p>
                <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                  <li>• <strong>Critical/High priority:</strong> Fix these immediately - they affect many users</li>
                  <li>• <strong>Impact score:</strong> Higher = more users affected × severity</li>
                  <li>• <strong>Suggested fixes:</strong> Specific, actionable changes you can implement now</li>
                  <li>• <strong>Characteristics:</strong> Help identify root cause patterns</li>
                </ul>
              </div>
            </Card>
          )}

          {/* Error Grouping by Type */}
          {errorGroups.length > 0 && (
            <Card className="p-6 mb-8 bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/30">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-foreground">Error Groups by Type ({errorGroups.length} groups)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Errors clustered by type with common characteristics to help identify system-wide issues
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {errorGroups.map((group) => (
                  <div key={group.error_type} className="bg-white dark:bg-gray-900 p-4 rounded-lg border shadow-sm">
                    <h4 className="font-semibold text-foreground mb-2">{group.group_name}</h4>
                    <div className="text-2xl font-bold text-orange-600 mb-2">{group.count}</div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {((group.count / detailedErrors.length) * 100).toFixed(1)}% of all errors
                    </div>
                    
                    {Object.keys(group.commonContext).length > 0 && (
                      <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded border border-orange-200 dark:border-orange-900/30">
                        <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">Common traits:</p>
                        {group.commonContext.conversion_direction && (
                          <div className="text-xs text-orange-700 dark:text-orange-300">
                            → {group.commonContext.conversion_direction}
                          </div>
                        )}
                        {group.commonContext.mostly_file_uploads && (
                          <div className="text-xs text-orange-700 dark:text-orange-300">
                            → Mostly file uploads
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {detailedErrors.length > 0 && (
            <Card className="p-6 mb-8 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-foreground">Detailed Error Analysis ({detailedErrors.length})</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Comprehensive error details with context, request/response data, and edge function logs for actionable debugging
              </p>
              <div className="space-y-4">
                {detailedErrors.map((error) => (
                  <div key={error.id} className="bg-card p-4 rounded-lg border border-red-200 dark:border-red-900/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            error.error_severity === 'critical' ? 'bg-red-600 text-white' :
                            error.error_severity === 'high' ? 'bg-orange-500 text-white' :
                            error.error_severity === 'medium' ? 'bg-yellow-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            {error.error_severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 rounded">
                            {error.error_type.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {error.error_code && (
                            <span className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 rounded">
                              {error.error_code}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-300 mt-2">{error.error_message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(error.created_at).toLocaleDateString()} at {new Date(error.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {/* Context Information */}
                    {error.context && Object.keys(error.context).length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-900/30">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-2">📋 Context:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {error.context.conversion_direction && (
                            <div><span className="font-medium">Direction:</span> {error.context.conversion_direction}</div>
                          )}
                          {error.context.recipe_length && (
                            <div><span className="font-medium">Recipe Length:</span> {error.context.recipe_length} chars</div>
                          )}
                          {error.context.has_starter !== undefined && (
                            <div><span className="font-medium">Has Starter:</span> {error.context.has_starter ? 'Yes' : 'No'}</div>
                          )}
                          {error.context.file_uploaded && (
                            <div><span className="font-medium">File Uploaded:</span> Yes</div>
                          )}
                          {error.context.file_name && (
                            <div><span className="font-medium">File:</span> {error.context.file_name}</div>
                          )}
                          {error.context.ocr_confidence && (
                            <div><span className="font-medium">OCR Confidence:</span> {error.context.ocr_confidence}%</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Partial Results (What DID work) */}
                    {error.response_data && Object.keys(error.response_data).length > 0 && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-900/30">
                        <p className="text-xs font-semibold text-green-800 dark:text-green-200 mb-2">✓ Partial Results (What was detected):</p>
                        <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-32">
                          {JSON.stringify(error.response_data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Edge Function Logs */}
                    {error.edge_function_logs && (
                      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-900/30">
                        <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-2">🔍 Edge Function Logs:</p>
                        <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                          {error.edge_function_logs}
                        </pre>
                      </div>
                    )}

                    {/* Request Data */}
                    {error.request_data && Object.keys(error.request_data).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">📤 Request Data:</p>
                        <div className="space-y-2 text-xs">
                          {error.request_data.recipeText && (
                            <div>
                              <span className="font-medium">Recipe Text (first 300 chars):</span>
                              <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-x-auto mt-1">
                                {error.request_data.recipeText.substring(0, 300)}...
                              </pre>
                            </div>
                          )}
                          {error.request_data.starterHydration && (
                            <div><span className="font-medium">Starter Hydration:</span> {error.request_data.starterHydration}%</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stack Trace (for developers) */}
                    {error.stack_trace && (
                      <details className="mt-3">
                        <summary className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100">
                          View Stack Trace
                        </summary>
                        <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto mt-2 border">
                          {error.stack_trace}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-900/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  💡 <strong>How to use this data:</strong> Look for patterns in error types, check partial results to see what the AI DID detect, 
                  review edge function logs for technical failures, and examine request data to understand recipe format issues. 
                  Group similar errors by error_type to prioritize fixes.
                </p>
              </div>
            </Card>
          )}

          {/* Legacy Failed Recipes (fallback if new table is empty) */}
          {detailedErrors.length === 0 && failedRecipes.length > 0 && (
            <Card className="p-6 mb-8 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="text-lg font-semibold text-foreground">Failed Recipe Examples ({failedRecipes.length})</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze these failed parsing attempts to identify patterns and improve AI accuracy
              </p>
              <div className="space-y-4">
                {failedRecipes.map((failure, index) => (
                  <div key={index} className="bg-card p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-600">{failure.error_message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(failure.created_at).toLocaleDateString()} at {new Date(failure.created_at).toLocaleTimeString()}
                          {failure.conversion_direction && ` • ${failure.conversion_direction}`}
                        </p>
                      </div>
                    </div>
                    {failure.recipe_text && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Recipe Text (first 500 chars):</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                          {failure.recipe_text}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-900/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  💡 <strong>Tip:</strong> Look for common patterns in failed recipes (formatting issues, missing units, unusual ingredients) to improve parsing rules.
                </p>
              </div>
            </Card>
          )}

          {/* Implementation Notes */}
          <Card className="p-6 mb-8 bg-bread-wheat/10 border-bread-wheat/30">
            <h3 className="text-lg font-semibold mb-3 text-foreground">📊 Metrics Now Tracking</h3>
            <p className="text-sm text-muted-foreground mb-4">
              All recommended metrics are now being collected and displayed:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">PDF Downloads</p>
                    <p className="text-xs text-muted-foreground">Tracked when users download converted recipes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Recipes Saved</p>
                    <p className="text-xs text-muted-foreground">Tracked via "My Recipes" feature</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Average Session Duration</p>
                    <p className="text-xs text-muted-foreground">Calculated from session start/end times</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Return Visitor Rate</p>
                    <p className="text-xs text-muted-foreground">Based on page view count per session</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Error Rate</p>
                    <p className="text-xs text-muted-foreground">AI parsing failures vs successes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Popular Recipe Types</p>
                    <p className="text-xs text-muted-foreground">Chart showing most converted recipe categories</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Average Recipe Complexity</p>
                    <p className="text-xs text-muted-foreground">Based on ingredient count</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <div>
                    <p className="font-medium text-sm">Traffic Sources</p>
                    <p className="text-xs text-muted-foreground">Chart showing where users find the converter</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>


          {/* Info Card */}
          <Card className="p-6 bg-bread-gold/10 border-bread-gold/30">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This dashboard tracks anonymous usage data to help you understand how users interact with your app. 
              All data is session-based with no personal information collected.
            </p>
          </Card>
        </div>
      </div>
    </PasswordProtection>
  );
}
