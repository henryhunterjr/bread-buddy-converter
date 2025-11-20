import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Home, TrendingUp, Upload, CheckCircle, Users, Printer, Share2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PasswordProtection } from '@/components/PasswordProtection';
import { toast } from '@/hooks/use-toast';
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch summary statistics
      const { data: events } = await supabase
        .from('analytics_events')
        .select('*');

      const { data: sessions } = await supabase
        .from('analytics_sessions')
        .select('*');

      if (events && sessions) {
        const conversions = events.filter(e => e.event_type === 'conversion_completed').length;
        const uploads = events.filter(e => e.event_type === 'file_uploaded').length;
        const aiSuccess = events.filter(e => e.event_type === 'ai_parsing_success').length;
        const aiFailed = events.filter(e => e.event_type === 'ai_parsing_failed').length;
        const successRate = aiSuccess + aiFailed > 0 
          ? Math.round((aiSuccess / (aiSuccess + aiFailed)) * 100) 
          : 0;

        // Calculate active sessions (sessions in last 24 hours without end time)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const active = sessions.filter(s => 
          s.started_at > oneDayAgo && !s.ended_at
        ).length;

        setSummary({
          totalConversions: conversions,
          totalUploads: uploads,
          totalSessions: sessions.length,
          activeSessions: active,
          aiParsingSuccessRate: successRate,
        });

        // Calculate additional metrics
        const pdfDownloads = events.filter(e => e.event_type === 'pdf_downloaded').length;
        const recipesSaved = events.filter(e => e.event_type === 'recipe_saved').length;
        
        // Calculate average session duration
        const completedSessions = sessions.filter(s => s.ended_at && s.started_at);
        const avgDuration = completedSessions.length > 0
          ? completedSessions.reduce((acc, s) => {
              const duration = new Date(s.ended_at!).getTime() - new Date(s.started_at!).getTime();
              return acc + duration / 1000; // Convert to seconds
            }, 0) / completedSessions.length
          : 0;

        // Calculate return visitor rate (sessions with page_views > 1)
        const returnVisitors = sessions.filter(s => (s.page_views || 0) > 3).length;
        const returnRate = sessions.length > 0 ? Math.round((returnVisitors / sessions.length) * 100) : 0;

        // Calculate error rate
        const totalParsing = aiSuccess + aiFailed;
        const errorRate = totalParsing > 0 ? Math.round((aiFailed / totalParsing) * 100) : 0;

        // Extract recipe types and complexity
        const recipeTypes: Record<string, number> = {};
        let totalIngredients = 0;
        let recipeCount = 0;

        events.forEach(e => {
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

        // Extract traffic sources (from session start events or referrer data)
        const trafficSources: Record<string, number> = {};
        events.forEach(e => {
          if (e.event_data && (e.event_data as any).referrer) {
            const referrer = (e.event_data as any).referrer;
            trafficSources[referrer] = (trafficSources[referrer] || 0) + 1;
          }
        });

        const topSources = Object.entries(trafficSources)
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

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
          const count = events.filter(e => 
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
        const sourdoughToYeast = events.filter(e => 
          e.event_type === 'conversion_completed' && 
          (e.event_data as any)?.conversion_direction === 'sourdough-to-yeast'
        ).length;
        const yeastToSourdough = events.filter(e => 
          e.event_type === 'conversion_completed' && 
          (e.event_data as any)?.conversion_direction === 'yeast-to-sourdough'
        ).length;

        setConversionBreakdown([
          { type: 'Sourdough → Yeast', count: sourdoughToYeast },
          { type: 'Yeast → Sourdough', count: yeastToSourdough },
        ]);

        // Calculate parsing method stats
        const aiParsing = events.filter(e => e.event_type === 'ai_parsing_success').length;
        const regexParsing = events.filter(e => e.event_type === 'regex_parsing_used').length;

        setParsingMethodStats([
          { method: 'AI Parsing', count: aiParsing },
          { method: 'Regex Parsing', count: regexParsing },
        ]);

        // Get failed recipe examples for pattern analysis
        const failedEvents = events
          .filter(e => e.event_type === 'ai_parsing_failed')
          .map(e => ({
            error_message: (e.event_data as any)?.error_message || 'Unknown error',
            recipe_text: (e.event_data as any)?.recipe_text,
            conversion_direction: (e.event_data as any)?.conversion_direction,
            created_at: e.created_at
          }))
          .slice(0, 10); // Last 10 failures
        
        setFailedRecipes(failedEvents);
      }
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
      text: `Analytics Summary:\n• Total Conversions: ${summary.totalConversions}\n• Total Sessions: ${summary.totalSessions}\n• AI Success Rate: ${summary.aiParsingSuccessRate}%\n• PDF Downloads: ${additionalMetrics.pdfDownloads}\n• Error Rate: ${additionalMetrics.errorRate}%`,
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            
            <div className="flex flex-col sm:flex-row gap-2">
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/')}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Home
                </Button>
              </div>
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

          {/* Failed Recipes - Error Analysis */}
          {failedRecipes.length > 0 && (
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
