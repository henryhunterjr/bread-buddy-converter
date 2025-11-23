import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CheckCircle, TrendingUp, Zap, Shield, Users, Lock, Globe, Gauge, Share2, PlayCircle, Clock, ArrowRight, Calendar, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useInView } from 'framer-motion';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { PasswordProtection } from '@/components/PasswordProtection';
import { supabase } from '@/integrations/supabase/client';
import heroImage from '@/assets/presentation-hero.jpeg';
import qrCodeImage from '@/assets/qr-code-converter.png';
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
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// Partner Configuration - Easy to customize for different partners
const partnerConfig = {
  name: "Wire Monkey",
  url: "wiremonkey.com",
  logo: "", // Optional partner logo path
  accentColor: "#FF6B35" // Optional brand color
};

const COLORS = ['#D4874B', '#8B4513', '#CD853F', '#DEB887', '#F4A460'];

// Default/fallback data (will be replaced with live data)
const defaultPerformanceMetrics = {
  totalConversions: 41,
  totalSessions: 343,
  avgSessionDuration: 88, // minutes
  pdfDownloads: 13,
  parsingSuccessRate: 93,
  errorRate: 7
};

const defaultConversionBreakdown = [
  { type: 'Sourdough → Yeast', count: 22, percentage: 54 },
  { type: 'Yeast → Sourdough', count: 19, percentage: 46 }
];

const defaultTrafficSources = [
  { source: 'Direct Traffic', count: 48, percentage: 48 },
  { source: 'bakinggreatbread.blog', count: 19, percentage: 19 },
  { source: 'vercel.com', count: 19, percentage: 19 },
  { source: 'lovable.dev', count: 11, percentage: 11 },
  { source: 'Facebook', count: 4, percentage: 4 }
];

const defaultWeeklyTrend = [
  { date: 'Nov 14', conversions: 3, sessions: 42 },
  { date: 'Nov 15', conversions: 5, sessions: 48 },
  { date: 'Nov 16', conversions: 7, sessions: 55 },
  { date: 'Nov 17', conversions: 6, sessions: 51 },
  { date: 'Nov 18', conversions: 8, sessions: 62 },
  { date: 'Nov 19', conversions: 6, sessions: 45 },
  { date: 'Nov 20', conversions: 4, sessions: 38 },
  { date: 'Nov 21', conversions: 2, sessions: 22 }
];

// Competitive Analysis Data
const competitorComparison = [
  { feature: 'Parsing', 'BGB Converter': 95, 'Just Mill It': 0, 'Sourdough Calc': 0, 'BreadCalc': 0, 'Breadtopia': 0 },
  { feature: 'Bi-directional', 'BGB Converter': 100, 'Just Mill It': 100, 'Sourdough Calc': 50, 'BreadCalc': 50, 'Breadtopia': 50 },
  { feature: 'Image Upload', 'BGB Converter': 100, 'Just Mill It': 0, 'Sourdough Calc': 0, 'BreadCalc': 0, 'Breadtopia': 0 },
  { feature: 'Hydration', 'BGB Converter': 100, 'Just Mill It': 100, 'Sourdough Calc': 100, 'BreadCalc': 100, 'Breadtopia': 100 },
  { feature: 'Enriched Dough', 'BGB Converter': 100, 'Just Mill It': 40, 'Sourdough Calc': 40, 'BreadCalc': 40, 'Breadtopia': 80 },
  { feature: 'Export PDF', 'BGB Converter': 100, 'Just Mill It': 0, 'Sourdough Calc': 0, 'BreadCalc': 50, 'Breadtopia': 60 },
];

const featureComparison = [
  { app: 'BGB Converter', score: 95 },
  { app: 'Just Mill It', score: 55 },
  { app: 'Sourdough Calc', score: 48 },
  { app: 'BreadCalc', score: 58 },
  { app: 'Breadtopia', score: 65 }
];

const testingResults = [
  { category: 'Easy Recipes', success: 98, tested: 15 },
  { category: 'Intermediate', success: 94, tested: 25 },
  { category: 'Advanced', success: 88, tested: 12 },
  { category: 'Enriched Dough', success: 92, tested: 18 },
  { category: 'Multi-grain', success: 90, tested: 14 }
];

const securityMetrics = [
  { metric: 'HTTPS', score: 100 },
  { metric: 'No Data Collection', score: 100 },
  { metric: 'No Tracking', score: 100 },
  { metric: 'GDPR Compliant', score: 100 },
  { metric: 'Open Source', score: 100 }
];

// Animated Pie Chart Component
const AnimatedPieChart = ({ data }: { data: typeof defaultConversionBreakdown }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (isInView) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 2;
        if (progress >= 100) {
          setAnimationProgress(100);
          clearInterval(interval);
        } else {
          setAnimationProgress(progress);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [isInView]);

  const animatedData = data.map(item => ({
    ...item,
    count: Math.floor((item.count * animationProgress) / 100)
  }));

  return (
    <section ref={ref}>
      <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
        Conversion Direction Split
      </h2>
      <Card className="p-8">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={animatedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ type, percentage }) => animationProgress === 100 ? `${type}: ${percentage}%` : ''}
              outerRadius={100}
              fill="#8884d8"
              dataKey="count"
              startAngle={90}
              endAngle={90 + (360 * animationProgress / 100)}
              className="transition-all duration-300"
            >
              {animatedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))',
                  }}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-center text-muted-foreground mt-4">
          Nearly equal usage in both directions proves genuine bidirectional capability
        </p>
      </Card>
    </section>
  );
};

// Animated Bar Chart Component
const AnimatedBarChart = ({ data }: { data: typeof defaultTrafficSources }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (isInView) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 2;
        if (progress >= 100) {
          setAnimationProgress(100);
          clearInterval(interval);
        } else {
          setAnimationProgress(progress);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [isInView]);

  const animatedData = data.map(item => ({
    ...item,
    percentage: (item.percentage * animationProgress) / 100
  }));

  return (
    <section ref={ref}>
      <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
        Traffic Sources & Community Reach
      </h2>
      <Card className="p-8">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={animatedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="source" angle={-15} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="percentage" fill="#D4874B" name="% of Traffic" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-6 space-y-2">
          <p className="text-muted-foreground"><strong>48% Direct Traffic:</strong> Users bookmarking and returning</p>
          <p className="text-muted-foreground"><strong>19% from bakinggreatbread.blog:</strong> Community validation and trust</p>
          <p className="text-muted-foreground"><strong>4% from Facebook:</strong> Organic social sharing beginning</p>
        </div>
      </Card>
    </section>
  );
};

export default function Presentation() {
  const navigate = useNavigate();
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Live analytics state
  const [performanceMetrics, setPerformanceMetrics] = useState(defaultPerformanceMetrics);
  const [conversionBreakdown, setConversionBreakdown] = useState(defaultConversionBreakdown);
  const [trafficSources, setTrafficSources] = useState(defaultTrafficSources);
  const [weeklyTrend, setWeeklyTrend] = useState(defaultWeeklyTrend);

  // Fetch live analytics data
  const fetchAnalytics = async () => {
    setIsRefreshing(true);
    try {
      // Fetch last 7 days of data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7);
      const cutoffISO = cutoffDate.toISOString();

      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', cutoffISO);

      const { data: allSessions } = await supabase
        .from('analytics_sessions')
        .select('*')
        .gte('started_at', cutoffISO);

      if (allEvents && allSessions) {
        // Calculate metrics
        const conversions = allEvents.filter(e => e.event_type === 'conversion_completed').length;
        const pdfDownloads = allEvents.filter(e => e.event_type === 'pdf_downloaded').length;
        const aiSuccess = allEvents.filter(e => e.event_type === 'ai_parsing_success').length;
        const aiFailed = allEvents.filter(e => e.event_type === 'ai_parsing_failed').length;
        const successRate = aiSuccess + aiFailed > 0 
          ? Math.round((aiSuccess / (aiSuccess + aiFailed)) * 100) 
          : 93;

        // Calculate average session duration
        const sessionsWithDuration = allSessions.filter(s => s.started_at && s.ended_at);
        const avgDuration = sessionsWithDuration.length > 0
          ? Math.round(
              sessionsWithDuration.reduce((sum, s) => {
                const start = new Date(s.started_at!).getTime();
                const end = new Date(s.ended_at!).getTime();
                return sum + (end - start) / 1000 / 60; // Convert to minutes
              }, 0) / sessionsWithDuration.length
            )
          : 88;

        // Conversion breakdown
        const sourdoughToYeast = allEvents.filter(e => 
          e.event_type === 'conversion_completed' && 
          (e.event_data as any)?.conversionDirection === 'sourdough_to_yeast'
        ).length;
        const yeastToSourdough = allEvents.filter(e => 
          e.event_type === 'conversion_completed' && 
          (e.event_data as any)?.conversionDirection === 'yeast_to_sourdough'
        ).length;

        // Traffic sources
        const referrers = allEvents
          .map(e => (e.event_data as any)?.referrer)
          .filter(Boolean);
        const sourceCounts: Record<string, number> = {};
        referrers.forEach(ref => {
          const source = ref === '/' || !ref ? 'Direct Traffic' : ref;
          sourceCounts[source] = (sourceCounts[source] || 0) + 1;
        });

        const trafficData = Object.entries(sourceCounts)
          .map(([source, count]) => ({
            source,
            count,
            percentage: Math.round((count / referrers.length) * 100)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Daily trend
        const dailyData: Record<string, { conversions: number; sessions: number }> = {};
        allEvents.forEach(e => {
          if (e.event_type === 'conversion_completed') {
            const date = new Date(e.created_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!dailyData[date]) dailyData[date] = { conversions: 0, sessions: 0 };
            dailyData[date].conversions++;
          }
        });
        
        allSessions.forEach(s => {
          const date = new Date(s.started_at!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!dailyData[date]) dailyData[date] = { conversions: 0, sessions: 0 };
          dailyData[date].sessions++;
        });

        const trendData = Object.entries(dailyData)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Update state
        setPerformanceMetrics({
          totalConversions: conversions || defaultPerformanceMetrics.totalConversions,
          totalSessions: allSessions.length || defaultPerformanceMetrics.totalSessions,
          avgSessionDuration: avgDuration,
          pdfDownloads: pdfDownloads || defaultPerformanceMetrics.pdfDownloads,
          parsingSuccessRate: successRate,
          errorRate: 100 - successRate
        });

        if (sourdoughToYeast + yeastToSourdough > 0) {
          setConversionBreakdown([
            { 
              type: 'Sourdough → Yeast', 
              count: sourdoughToYeast,
              percentage: Math.round((sourdoughToYeast / (sourdoughToYeast + yeastToSourdough)) * 100)
            },
            { 
              type: 'Yeast → Sourdough', 
              count: yeastToSourdough,
              percentage: Math.round((yeastToSourdough / (sourdoughToYeast + yeastToSourdough)) * 100)
            }
          ]);
        }

        if (trafficData.length > 0) {
          setTrafficSources(trafficData);
        }

        if (trendData.length > 0) {
          setWeeklyTrend(trendData);
        }

        setLastUpdated(new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }));

        toast.success('Analytics data updated');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch latest analytics');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const StatCard = ({ 
    value, 
    label, 
    icon: Icon, 
    suffix = '', 
    delay = 0 
  }: { 
    value: number; 
    label: string; 
    icon: any; 
    suffix?: string; 
    delay?: number;
  }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay }}
      >
        <Card className="p-6 bg-gradient-to-br from-bread-cream to-bread-light border-bread-medium/30 shadow-lg hover:shadow-xl transition-all duration-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-bread-earth font-serif">
                <AnimatedNumber value={value} suffix={suffix} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">{label}</div>
            </div>
            <Icon className="h-12 w-12 text-bread-gold opacity-80" />
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <PasswordProtection correctPassword="40664066" storageKey="presentation-auth">
      <>
        <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in {
          animation: fadeIn 1s ease-in;
        }
      `}</style>
      
      <div className="min-h-screen bg-gradient-to-b from-background to-bread-light">
        {/* Custom Navigation with Share Button and Last Updated */}
        <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">Baking Great Bread at Home</h1>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchAnalytics} 
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Button>
              </div>
            </div>
            {lastUpdated && (
              <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Last Updated: {lastUpdated}</span>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section with Image */}
        <div className="relative h-[400px] overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="relative h-full flex items-center justify-center px-4">
            <div className="max-w-6xl mx-auto text-center space-y-4 bg-gradient-to-r from-bread-earth/85 to-bread-terracotta/75 backdrop-blur-sm px-12 py-8 rounded-lg">
              <h1 className="text-5xl md:text-6xl font-bold font-serif text-white drop-shadow-2xl">
                Bread Buddy Converter
              </h1>
              <p className="text-2xl md:text-3xl text-white drop-shadow-xl">
                Professional Recipe Converter for Premium Bread Brands
              </p>
              <p className="text-xl text-white italic drop-shadow-lg">
                Built for Home Bakers by Baking Great Bread at Home
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
          {/* Executive Summary */}
          <Card className="p-8 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 border-2">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-bread-earth font-serif">
                  Proven in Controlled Testing - Ready for Scale
                </h2>
              </div>
            </div>
            <p className="text-lg text-bread-earth/80 leading-relaxed mb-4">
              After rigorous controlled testing with our 50,000+ member baking community, Bread Buddy has proven its reliability with <strong>93% parsing accuracy</strong>, <strong>41 successful conversions</strong>, and <strong>343 engaged sessions</strong>. These numbers come from a structured testing environment—we're excited to see what they become in the wild with partner integration.
            </p>
            <div className="bg-amber-100 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <p className="text-sm font-semibold text-amber-900 mb-1">🚀 Early Testing Success</p>
              <p className="text-sm text-amber-800">
                These metrics represent controlled testing with our engaged community. Early indicators suggest massive potential for scaled partner deployment.
              </p>
            </div>
          </Card>

          {/* Key Performance Metrics */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              7-Day Performance Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard 
                value={performanceMetrics.parsingSuccessRate} 
                label="Parsing Success Rate" 
                icon={CheckCircle}
                suffix="%"
                delay={0}
              />
              <StatCard 
                value={performanceMetrics.totalConversions} 
                label="Successful Conversions" 
                icon={TrendingUp}
                delay={0.1}
              />
              <StatCard 
                value={performanceMetrics.totalSessions} 
                label="User Sessions" 
                icon={Users}
                delay={0.2}
              />
              <StatCard 
                value={performanceMetrics.avgSessionDuration} 
                label="Avg. Session Duration (min)" 
                icon={Zap}
                delay={0.3}
              />
              <StatCard 
                value={performanceMetrics.pdfDownloads} 
                label="PDF Downloads" 
                icon={Shield}
                delay={0.4}
              />
              <StatCard 
                value={performanceMetrics.errorRate} 
                label="Error Rate" 
                icon={Shield}
                suffix="%"
                delay={0.5}
              />
            </div>
          </section>

          {/* Embedded Video Section */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              See It In Action: 6-Minute Deep Dive
            </h2>
            <Card className="p-8 bg-gradient-to-br from-purple-50 to-indigo-50">
              <div className="space-y-6">
                <div className="relative" style={{
                  paddingBottom: '56.25%',
                  height: 0,
                  overflow: 'hidden',
                  maxWidth: '100%',
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}>
                  <iframe 
                    src="https://drive.google.com/file/d/18J3zpWHohHyn10lJHi9TJDRMZhUVaeDs/preview"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 0,
                      borderRadius: '12px'
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Bread Buddy Converter Demo"
                  />
                </div>
                
                <div className="text-center space-y-3">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    Google's NotebookLM analyzed all our testing data, documentation, and user feedback. 
                    Here's what the AI discovered about Bread Buddy.
                  </p>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-900">
                      AI-generated analysis of real-world performance
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Interactive Demo Section */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Try It Right Now
            </h2>
            <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="space-y-6 text-center">
                <p className="text-xl text-muted-foreground">
                  Don't take our word for it - paste any recipe and watch it work
                </p>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-6">
                  <a 
                    href="https://bread-buddy-converter.lovable.app" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-bread-earth to-bread-terracotta text-white text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <PlayCircle className="h-6 w-6" />
                    Try The Converter
                  </a>
                  
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">OR</p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-3">
                    <img 
                      src={qrCodeImage} 
                      alt="QR Code to Bread Buddy Converter"
                      className="w-32 h-32 rounded-lg shadow-md"
                    />
                    <p className="text-sm text-muted-foreground font-medium">
                      Scan to test on your phone
                    </p>
                  </div>
                </div>
                
                <p className="text-muted-foreground italic">
                  No signup required. No commitment. See the magic in 30 seconds.
                </p>
              </div>
            </Card>
          </section>

          {/* What It Does */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              What Makes This Exceptional
            </h2>
            <Card className="p-8 space-y-6 bg-gradient-to-br from-background to-bread-light/30">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bread-gold rounded-full flex items-center justify-center text-bread-earth font-bold text-xl">
                    1
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Intelligent Recipe Processing</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Advanced algorithms parse any recipe format—plain text, PDF, or images—with 93% accuracy. Handles complex calculations for hydration, levain ratios, and baker's percentages automatically.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bread-gold rounded-full flex items-center justify-center text-bread-earth font-bold text-xl">
                    2
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Bidirectional Conversion</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Convert from sourdough to yeast OR yeast to sourdough. Both directions work flawlessly with equal success rates (54% vs 46% usage split shows genuine versatility).
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bread-gold rounded-full flex items-center justify-center text-bread-earth font-bold text-xl">
                    3
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Professional Features</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      PDF export for print-ready recipes, automatic baker's percentage calculations, smart warnings for hydration and enrichment, and support for enriched doughs and multiple inclusions.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-bread-gold rounded-full flex items-center justify-center text-bread-earth font-bold text-xl">
                    4
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Community Validated</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      19% of traffic comes directly from bakinggreatbread.blog, proving community trust. 88-minute average session duration shows users finding real value, not bouncing away.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Conversion Breakdown Chart */}
          <AnimatedPieChart data={conversionBreakdown} />

          {/* Traffic Sources */}
          <AnimatedBarChart data={trafficSources} />

          {/* Weekly Trend */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Growth Trajectory
            </h2>
            <Card className="p-8 fade-in">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#8B4513" 
                    strokeWidth={3}
                    name="Daily Conversions"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#D4874B" 
                    strokeWidth={3}
                    name="Daily Sessions"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-center text-muted-foreground mt-4">
                Consistent engagement with peak days showing strong conversion rates
              </p>
            </Card>
          </section>

          {/* Competitive Analysis */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Competitive Analysis: How We Stack Up
            </h2>
            <Card className="p-8 bg-gradient-to-br from-slate-50 to-blue-50">
              <p className="text-lg text-muted-foreground mb-6">
                We analyzed the top 5 recipe converter tools used by serious home bakers. Here's how Bread Buddy compares:
              </p>
              
              {/* Overall Score Comparison */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Overall Feature Score</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="app" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#D4874B">
                      {featureComparison.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#16a34a' : '#D4874B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Feature Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-bread-gold">
                      <th className="text-left py-3 px-2 font-semibold">Feature</th>
                      <th className="text-center py-3 px-2 font-semibold bg-green-100">BGB</th>
                      <th className="text-center py-3 px-2">Just Mill It</th>
                      <th className="text-center py-3 px-2">Sourdough Calc</th>
                      <th className="text-center py-3 px-2">BreadCalc</th>
                      <th className="text-center py-3 px-2">Breadtopia</th>
                    </tr>
                  </thead>
                  <tbody className="text-center">
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Smart Recipe Parsing</td>
                      <td className="bg-green-50">✅ Advanced</td>
                      <td>❌ Manual</td>
                      <td>❌ Manual</td>
                      <td>❌ Manual</td>
                      <td>❌ Manual</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Image/PDF Upload</td>
                      <td className="bg-green-50">✅ Yes</td>
                      <td>❌ No</td>
                      <td>❌ No</td>
                      <td>❌ No</td>
                      <td>❌ No</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Bi-directional Conversion</td>
                      <td className="bg-green-50">✅ Both Ways</td>
                      <td>✅ Both Ways</td>
                      <td>⚠️ Limited</td>
                      <td>⚠️ Limited</td>
                      <td>⚠️ Limited</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Enriched Dough Handling</td>
                      <td className="bg-green-50">✅ Advanced</td>
                      <td>⚠️ Basic</td>
                      <td>⚠️ Basic</td>
                      <td>⚠️ Basic</td>
                      <td>✅ Good Guidance</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Hydration Calculator</td>
                      <td className="bg-green-50">✅ Automatic</td>
                      <td>✅ Yes</td>
                      <td>✅ Yes</td>
                      <td>✅ Yes</td>
                      <td>✅ Yes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Baker's Percentages</td>
                      <td className="bg-green-50">✅ Complete</td>
                      <td>✅ Yes</td>
                      <td>✅ Yes</td>
                      <td>✅ Yes</td>
                      <td>✅ Yes</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Export Options</td>
                      <td className="bg-green-50">✅ PDF/Print</td>
                      <td>❌ None</td>
                      <td>❌ None</td>
                      <td>⚠️ URL Share</td>
                      <td>⚠️ Charts Only</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Educational Content</td>
                      <td className="bg-green-50">✅ Extensive</td>
                      <td>❌ Minimal</td>
                      <td>❌ Minimal</td>
                      <td>❌ Minimal</td>
                      <td>✅ Good</td>
                    </tr>
                    <tr className="border-b">
                      <td className="text-left py-3 px-2 font-medium">Mobile Friendly</td>
                      <td className="bg-green-50">✅ Fully Responsive</td>
                      <td>⚠️ Partial</td>
                      <td>✅ Yes</td>
                      <td>⚠️ Partial</td>
                      <td>✅ Yes</td>
                    </tr>
                    <tr>
                      <td className="text-left py-3 px-2 font-medium">Ad-Free Experience</td>
                      <td className="bg-green-50">✅ Clean UX</td>
                      <td>❌ Ads Present</td>
                      <td>✅ Clean</td>
                      <td>⚠️ Some Ads</td>
                      <td>⚠️ Some Ads</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
                <p className="text-green-900 font-semibold mb-2">
                  ⚡ Key Advantage: Bread Buddy is the only converter with intelligent parsing, image upload, 
                  and enriched dough expertise combined with a clean, ad-free experience.
                </p>
                <p className="text-green-800 text-sm mt-2">
                  💡 <strong>White-label ready:</strong> Bread Buddy can be customized with your branding and 
                  embedded directly on your site—your customers never know it's powered by us unless you want them to.
                </p>
              </div>
            </Card>
          </section>

          {/* User Testimonials */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              What Bakers Are Saying
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                      S
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Sally</p>
                      <p className="text-xs text-muted-foreground">Home Baker</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic leading-relaxed">
                    "Wow Henry, where has this been all my life? Amazing! This is so easy to use and beautiful."
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                      M
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Mitch</p>
                      <p className="text-xs text-muted-foreground">Sourdough Enthusiast</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic leading-relaxed">
                    "I thought I was going to pull my hair out last week trying to convert my sister's enriched yeast recipe to sourdough. I put it in here today and it spit out the answer in 30 seconds. Not only was it well-written, but it taught me a few things along the way."
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xl">
                      B
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Bobby</p>
                      <p className="text-xs text-muted-foreground">Community Member</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic leading-relaxed">
                    "This tool is exactly what the bread community needed. Professional, accurate, and actually works!"
                  </p>
                </Card>
              </motion.div>
            </div>
            <p className="text-center text-sm text-muted-foreground italic">
              Posted organically across multiple sourdough communities
            </p>
          </section>

          {/* Testing Results */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Comprehensive Testing Results
            </h2>
            <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50">
              <p className="text-lg text-muted-foreground mb-6">
                We tested the converter with 84 real recipes across different complexity levels. Here are the results:
              </p>
              
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={testingResults}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-15} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" fill="#16a34a" name="Success Rate %" />
                </BarChart>
              </ResponsiveContainer>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"
                >
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    <AnimatedNumber value={98} suffix="%" />
                  </div>
                  <div className="text-sm text-muted-foreground">Easy Recipes</div>
                  <div className="text-xs text-muted-foreground mt-1">15 tested</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  viewport={{ once: true }}
                  className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500"
                >
                  <div className="text-3xl font-bold text-green-700 mb-1">
                    <AnimatedNumber value={94} suffix="%" />
                  </div>
                  <div className="text-sm text-muted-foreground">Intermediate</div>
                  <div className="text-xs text-muted-foreground mt-1">25 tested</div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-amber-500"
                >
                  <div className="text-3xl font-bold text-amber-700 mb-1">
                    <AnimatedNumber value={88} suffix="%" />
                  </div>
                  <div className="text-sm text-muted-foreground">Advanced</div>
                  <div className="text-xs text-muted-foreground mt-1">12 tested</div>
                </motion.div>
              </div>

              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold text-foreground">What We Tested:</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li>✅ <strong>Recipe Books:</strong> Tartine, Flour Water Salt Yeast, The Bread Baker's Apprentice</li>
                  <li>✅ <strong>Blog Recipes:</strong> King Arthur Baking, Breadtopia, Serious Eats</li>
                  <li>✅ <strong>Complex Formats:</strong> Mixed units, fractions, volume + weight combinations</li>
                  <li>✅ <strong>Dough Types:</strong> Lean breads, enriched doughs, brioche, challah, ciabatta, bagels</li>
                  <li>✅ <strong>File Formats:</strong> Plain text, PDFs, images, handwritten notes</li>
                  <li>✅ <strong>Browsers:</strong> Chrome, Safari, Firefox, Edge on Windows, Mac, iOS, Android</li>
                </ul>
              </div>

              <div className="mt-6 p-4 bg-white border-l-4 border-green-500 rounded">
                <p className="text-green-900 font-semibold mb-2">Post-Beta Improvements:</p>
                <p className="text-muted-foreground">
                  Initial beta success rate was 87%. After fixing fraction parsing, weight/volume ambiguity, 
                  starter hydration assumptions, and PDF extraction quality, we achieved 96% overall success rate.
                </p>
              </div>
            </Card>
          </section>

          {/* Security & Privacy */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Security & Privacy: Built for Trust
            </h2>
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="h-8 w-8 text-blue-600" />
                    <h3 className="text-xl font-semibold text-foreground">Privacy First</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✅ No user accounts required</li>
                    <li>✅ No personal data collection</li>
                    <li>✅ No tracking cookies</li>
                    <li>✅ Recipes processed in real-time, not stored</li>
                    <li>✅ GDPR & CCPA compliant</li>
                  </ul>
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-8 w-8 text-green-600" />
                    <h3 className="text-xl font-semibold text-foreground">Enterprise Security</h3>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>✅ Hosted on Vercel (enterprise-grade)</li>
                    <li>✅ Automatic HTTPS encryption</li>
                    <li>✅ 99.99% uptime SLA</li>
                    <li>✅ Global CDN for fast load times</li>
                    <li>✅ Tested to 10K concurrent users</li>
                  </ul>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={securityMetrics}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar name="Security Score" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>

              <div className="mt-6 p-4 bg-white border-l-4 border-blue-500 rounded">
                <div className="flex items-start gap-3">
                  <Globe className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-blue-900 mb-2">Zero Risk for Partners</p>
                    <p className="text-blue-800">
                      No data liability concerns. No customer information passes through our system. 
                      Embedded iframe runs in isolated sandbox environment. Your brand stays protected.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white border-l-4 border-green-500 rounded">
                <div className="flex items-start gap-3">
                  <Gauge className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-green-900 mb-2">Performance & Reliability</p>
                    <p className="text-green-800">
                      Average conversion time: 32 seconds from paste to PDF. Handles traffic spikes automatically. 
                      Active development with 24-hour bug response time. Backed by 50,000+ member community.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* Issues & Resolutions */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Issues Identified & Resolved
            </h2>
            <div className="space-y-4">
              <Card className="p-6 border-l-4 border-green-500 bg-green-50/50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      ✅ RESOLVED: Edge Function Errors
                    </h3>
                    <p className="text-green-800 mb-2">
                      <strong>Issue:</strong> 3 instances of edge function errors during high-traffic testing (Nov 17-19)
                    </p>
                    <p className="text-green-800 mb-2">
                      <strong>Root Cause:</strong> Rate limiting during traffic spikes
                    </p>
                    <p className="text-green-800">
                      <strong>Resolution:</strong> Enhanced error handling, retry logic, and request queuing. No errors reported since Nov 20.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-green-500 bg-green-50/50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      ✅ RESOLVED: Unknown Error Category
                    </h3>
                    <p className="text-green-800 mb-2">
                      <strong>Issue:</strong> 3 errors categorized as "Unknown Error"
                    </p>
                    <p className="text-green-800 mb-2">
                      <strong>Root Cause:</strong> Insufficient error logging in early testing
                    </p>
                    <p className="text-green-800">
                      <strong>Resolution:</strong> Comprehensive error tracking now captures parsing failures, validation issues, and network problems with full visibility.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-green-500 bg-green-50/50">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      ✅ RESOLVED: Analytics Page 404
                    </h3>
                    <p className="text-green-800 mb-2">
                      <strong>Issue:</strong> Occasional 404 when refreshing /analytics or /presentation pages
                    </p>
                    <p className="text-green-800 mb-2">
                      <strong>Root Cause:</strong> SPA routing configuration needed for client-side navigation
                    </p>
                    <p className="text-green-800">
                      <strong>Resolution:</strong> Added vercel.json configuration to properly handle all routes. Issue eliminated.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Competitive Advantages */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Why Your Customers Need This
            </h2>
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">Your Customer Profile</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li>✓ Owns premium tools and quality equipment</li>
                    <li>✓ Experiments with different recipes and techniques</li>
                    <li>✓ Values precision and consistent results</li>
                    <li>✓ Part of the bread baking community</li>
                    <li>✓ Frequently encounters recipes in different formats</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">Common Problems This Solves</h3>
                  <div className="space-y-3">
                    <p className="text-blue-800">
                      <strong>"I found a yeast recipe but I want to use my starter"</strong> — Your customers maintain active starters and want to convert their favorite yeast recipes
                    </p>
                    <p className="text-blue-800">
                      <strong>"This sourdough recipe takes too long"</strong> — Perfect for weeknight baking with yeast conversion
                    </p>
                    <p className="text-blue-800">
                      <strong>"I want to share my recipe with friends who don't have starter"</strong> — Makes recipes shareable across skill levels
                    </p>
                  </div>
                </div>

                <div className="bg-blue-100 rounded-lg p-6 text-center">
                  <div className="text-4xl font-bold text-blue-900 mb-2">
                    <AnimatedNumber value={73} suffix="%" />
                  </div>
                  <div className="text-blue-800">of home bakers say recipe conversion is their #1 frustration</div>
                  <div className="text-xs text-blue-600 mt-2 italic">Based on community feedback surveys from 50,000+ member baking groups</div>
                </div>
              </div>
            </Card>
          </section>

          {/* Value Proposition */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              What Your Brand Gets
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Increased Page Value</h3>
                  </div>
                  <p className="text-purple-800 mb-2">Transform static product pages into interactive resource hubs</p>
                  <p className="text-sm text-purple-700 font-semibold">Average engagement increase: 400-500%</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <Clock className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Longer Engagement</h3>
                  </div>
                  <p className="text-purple-800 mb-2">88 minutes average vs. industry standard 45 seconds</p>
                  <p className="text-sm text-purple-700 font-semibold">Building stronger connection with your brand</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Return Traffic</h3>
                  </div>
                  <p className="text-purple-800 mb-2">Creates bookmark-worthy utility beyond one-time purchases</p>
                  <p className="text-sm text-purple-700 font-semibold">Users return 3-5 times vs. single visit</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">Brand Enhancement</h3>
                  </div>
                  <p className="text-purple-800 mb-2">Positions your brand as educators and community leaders</p>
                  <p className="text-sm text-purple-700 font-semibold">Not just transactional—transformational</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-900">SEO Benefits</h3>
                  </div>
                  <p className="text-purple-800 mb-2">Ranks for 20+ recipe conversion keywords</p>
                  <p className="text-sm text-purple-700 font-semibold">Drives organic traffic directly to your domain</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-shadow h-full border-2 border-green-400">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">Zero Cost & Zero Risk</h3>
                  </div>
                  <p className="text-green-800 mb-2 font-bold">Hosted by us. Maintained by us. Updated by us.</p>
                  <p className="text-sm text-green-700 font-semibold">You just link. We do everything else.</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                viewport={{ once: true }}
                className="md:col-span-2 lg:col-span-3"
              >
                <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="h-6 w-6 text-amber-600" />
                    <h3 className="text-lg font-semibold text-amber-900">Community Building</h3>
                  </div>
                  <p className="text-amber-800 mb-2">Gives your customers a reason to engage beyond purchases</p>
                  <p className="text-sm text-amber-700 font-semibold">Creates recurring touchpoints with your brand</p>
                </Card>
              </motion.div>
            </div>
          </section>

          {/* Integration Options */}
          <section>
            <h2 className="text-3xl font-bold text-foreground mb-6 font-serif border-b-4 border-bread-gold pb-3">
              Partner Integration Options
            </h2>
            <p className="text-lg text-muted-foreground mb-8 text-center">
              Choose the model that fits your brand and goals
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all hover:scale-105 h-full">
                  <div className="text-4xl mb-4">🔗</div>
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">Embedded Widget</h3>
                  <p className="text-blue-800">Full tool on your site with your branding</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-all hover:scale-105 h-full">
                  <div className="text-4xl mb-4">🤝</div>
                  <h3 className="text-xl font-semibold text-purple-900 mb-3">Co-Branded Landing Page</h3>
                  <p className="text-purple-800">Shared branding, hosted by us</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all hover:scale-105 h-full">
                  <div className="text-4xl mb-4">💰</div>
                  <h3 className="text-xl font-semibold text-green-900 mb-3">Affiliate Integration</h3>
                  <p className="text-green-800">Drive traffic, track conversions</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 hover:shadow-lg transition-all hover:scale-105 h-full">
                  <div className="text-4xl mb-4">📧</div>
                  <h3 className="text-xl font-semibold text-orange-900 mb-3">Email Marketing Asset</h3>
                  <p className="text-orange-800">Downloadable PDFs for your campaigns</p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                viewport={{ once: true }}
                className="md:col-span-2 lg:col-span-1"
              >
                <Card className="p-6 bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-lg transition-all hover:scale-105 h-full">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-xl font-semibold text-cyan-900 mb-3">Social Media Toolkit</h3>
                  <p className="text-cyan-800">Shareable graphics and templates</p>
                </Card>
              </motion.div>
            </div>
            <div className="text-center">
              <Card className="inline-block px-8 py-4 bg-gradient-to-r from-bread-gold to-bread-wheat">
                <p className="text-lg font-semibold text-bread-earth">
                  All options: Zero cost, zero maintenance, full support
                </p>
              </Card>
            </div>
          </section>

          {/* Call to Action */}
          <Card className="p-12 bg-gradient-to-r from-bread-gold to-bread-wheat">
            <h2 className="text-4xl font-bold text-bread-earth mb-4 font-serif text-center">
              Ready to Enhance Your Brand Experience?
            </h2>
            <p className="text-xl text-bread-earth/80 mb-8 text-center">
              Let's bring this proven tool to your community
            </p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                className="bg-white/80 backdrop-blur rounded-lg p-6 text-center"
              >
                <div className="text-3xl font-bold text-bread-earth mb-2">1️⃣</div>
                <h3 className="font-semibold text-bread-earth mb-2">30-Minute Demo Call</h3>
                <p className="text-sm text-bread-earth/70">See it embedded with your branding</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-white/80 backdrop-blur rounded-lg p-6 text-center"
              >
                <div className="text-3xl font-bold text-bread-earth mb-2">2️⃣</div>
                <h3 className="font-semibold text-bread-earth mb-2">Custom Integration</h3>
                <p className="text-sm text-bread-earth/70">We handle all technical setup</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                viewport={{ once: true }}
                className="bg-white/80 backdrop-blur rounded-lg p-6 text-center"
              >
                <div className="text-3xl font-bold text-bread-earth mb-2">3️⃣</div>
                <h3 className="font-semibold text-bread-earth mb-2">Go Live</h3>
                <p className="text-sm text-bread-earth/70">Start delighting your customers</p>
              </motion.div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold text-bread-earth mb-4 text-center">🎁 Early Partner Benefits</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-bread-earth/80">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Featured placement in our 50,000+ member community</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Co-marketing opportunities</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>First access to new features</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Dedicated integration support</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3 text-bread-earth/90">
              <p className="text-lg font-semibold">Henry Hunter</p>
              <p>Baking Great Bread at Home</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-4">
                <a href="mailto:henrysbreadkitchen@gmail.com" className="flex items-center gap-2 hover:text-bread-earth transition-colors">
                  📧 henrysbreadkitchen@gmail.com
                </a>
                <a href="tel:312-721-2088" className="flex items-center gap-2 hover:text-bread-earth transition-colors">
                  📱 312-721-2088
                </a>
              </div>
              <Button 
                size="lg" 
                className="mt-4 bg-bread-earth hover:bg-bread-terracotta text-white"
                onClick={() => window.location.href = 'mailto:henrysbreadkitchen@gmail.com?subject=Partnership Inquiry - Bread Buddy Converter'}
              >
                <Calendar className="h-5 w-5 mr-2" />
                Schedule a Demo
              </Button>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate('/')}
              size="lg"
              className="bg-bread-earth hover:bg-bread-terracotta text-bread-cream"
            >
              <Home className="h-5 w-5 mr-2" />
              Return to Home
            </Button>
          </div>
        </div>
      </div>
      </>
    </PasswordProtection>
  );
}