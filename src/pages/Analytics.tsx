import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { Home, TrendingUp, Upload, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PasswordProtection } from '@/components/PasswordProtection';
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

export default function Analytics() {
  useAnalytics(); // Track page view
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalConversions: 0,
    totalUploads: 0,
    totalSessions: 0,
    activeSessions: 0,
    aiParsingSuccessRate: 0,
  });
  const [dailyConversions, setDailyConversions] = useState<DailyStats[]>([]);
  const [conversionBreakdown, setConversionBreakdown] = useState<ConversionBreakdown[]>([]);
  const [parsingMethodStats, setParsingMethodStats] = useState<ParsingMethodStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

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

        // Calculate daily conversions (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toISOString().split('T')[0];
        });

        const dailyData = last7Days.map(date => {
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
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
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
          <h1 className="text-3xl font-bold text-foreground mb-8">Analytics Dashboard</h1>
          
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

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Conversions Chart */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Daily Conversions (Last 7 Days)</h3>
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
          </div>

          {/* Recommendations for Additional Metrics */}
          <Card className="p-6 mb-8 bg-bread-wheat/10 border-bread-wheat/30">
            <h3 className="text-lg font-semibold mb-3 text-foreground">📊 Recommended Additional Metrics</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Consider tracking these valuable metrics to better understand user behavior:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">PDF Downloads</p>
                    <p className="text-xs text-muted-foreground">How many users save converted recipes as PDFs</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Recipes Saved</p>
                    <p className="text-xs text-muted-foreground">Track engagement with the "My Recipes" feature</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Average Session Duration</p>
                    <p className="text-xs text-muted-foreground">How long users spend using the converter</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Return Visitor Rate</p>
                    <p className="text-xs text-muted-foreground">Track user retention and repeat usage</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Error Rate</p>
                    <p className="text-xs text-muted-foreground">Failed conversions or parsing errors</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Popular Recipe Types</p>
                    <p className="text-xs text-muted-foreground">Which recipes are converted most (bagels, pizza, etc.)</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Average Recipe Complexity</p>
                    <p className="text-xs text-muted-foreground">Track ingredient count and recipe length patterns</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-bread-terracotta">•</span>
                  <div>
                    <p className="font-medium text-sm">Traffic Sources</p>
                    <p className="text-xs text-muted-foreground">Where users discover your converter (for marketing)</p>
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
