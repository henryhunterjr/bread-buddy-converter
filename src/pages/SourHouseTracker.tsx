import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import {
  Home, TrendingUp, TrendingDown, DollarSign, Package,
  ShoppingCart, Target, Lightbulb, AlertCircle, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
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

// Product Categories with Price Ranges
const productCategories: Record<string, { min: number; max: number; basePrice: number | null; color: string }> = {
  "Cooling Puck 3-Pack": { min: 17.00, max: 18.50, basePrice: 17.95, color: "#60a5fa" },
  "Single Starter Jar": { min: 24.00, max: 26.50, basePrice: 25.95, color: "#34d399" },
  "Jar Bundle (Pint + Quart)": { min: 43.00, max: 46.00, basePrice: 44.95, color: "#a78bfa" },
  "Glass Cloche": { min: 48.00, max: 51.00, basePrice: 49.95, color: "#f472b6" },
  "Clay Baker + Accessories": { min: 75.00, max: 90.00, basePrice: null, color: "#fb923c" },
  "Mystery Bundle": { min: 132.00, max: 137.00, basePrice: 134.96, color: "#fbbf24" },
  "Goldie Starter Warmer + Add-ons": { min: 148.00, max: 165.00, basePrice: 149.95, color: "#f87171" },
  "Baker's Bundle": { min: 185.00, max: 198.00, basePrice: 194.95, color: "#818cf8" },
  "DoughBed (Discounted)": { min: 235.00, max: 260.00, basePrice: 279.95, color: "#2dd4bf" },
  "DoughBed (Full Price)": { min: 275.00, max: 285.00, basePrice: 279.95, color: "#22d3ee" },
  "Premium Multi-Item": { min: 286.00, max: 400.00, basePrice: null, color: "#e879f9" }
};

// Order interface
interface Order {
  id: string;
  date: string;
  orderAmount: number;
  commission: number;
  detectedProduct: string;
  productColor: string;
}

// Product detection function
function detectProduct(orderAmount: number): { product: string; color: string } {
  for (const [productName, config] of Object.entries(productCategories)) {
    if (orderAmount >= config.min && orderAmount <= config.max) {
      return { product: productName, color: config.color };
    }
  }

  // Check for amounts below the lowest category
  if (orderAmount < 17.00) {
    return { product: "Unidentified Bundle", color: "#6b7280" };
  }

  // Check for amounts above the highest category
  if (orderAmount > 400.00) {
    return { product: "Premium Multi-Item", color: "#e879f9" };
  }

  // If no exact match, mark as Custom Bundle
  return { product: "Custom Bundle", color: "#9ca3af" };
}

// Sample order data based on the task description (116 orders, $2,708.05 commission)
const generateSampleOrders = (): Order[] => {
  const orders: Order[] = [];

  // Distribution to match realistic sales patterns
  const orderDistribution = [
    // Cooling Puck 3-Pack - high volume, low price
    ...Array(18).fill(null).map((_, i) => ({ amount: 17.95 + Math.random() * 0.5, date: getRandomDate(60) })),
    // Single Starter Jar - popular entry product
    ...Array(25).fill(null).map((_, i) => ({ amount: 25.95 + Math.random() * 0.5, date: getRandomDate(60) })),
    // Jar Bundle
    ...Array(12).fill(null).map((_, i) => ({ amount: 44.95 + Math.random(), date: getRandomDate(60) })),
    // Glass Cloche
    ...Array(10).fill(null).map((_, i) => ({ amount: 49.95 + Math.random(), date: getRandomDate(60) })),
    // Clay Baker + Accessories
    ...Array(8).fill(null).map((_, i) => ({ amount: 75 + Math.random() * 15, date: getRandomDate(60) })),
    // Mystery Bundle
    ...Array(6).fill(null).map((_, i) => ({ amount: 134.96 + Math.random() * 2, date: getRandomDate(60) })),
    // Goldie Starter Warmer
    ...Array(10).fill(null).map((_, i) => ({ amount: 149.95 + Math.random() * 15, date: getRandomDate(60) })),
    // Baker's Bundle
    ...Array(8).fill(null).map((_, i) => ({ amount: 194.95 + Math.random() * 3, date: getRandomDate(60) })),
    // DoughBed (Discounted)
    ...Array(7).fill(null).map((_, i) => ({ amount: 251.96 + Math.random() * 8, date: getRandomDate(60) })),
    // DoughBed (Full Price)
    ...Array(6).fill(null).map((_, i) => ({ amount: 279.95 + Math.random() * 5, date: getRandomDate(60) })),
    // Premium Multi-Item
    ...Array(4).fill(null).map((_, i) => ({ amount: 300 + Math.random() * 100, date: getRandomDate(60) })),
    // Custom/Unidentified bundles
    ...Array(2).fill(null).map((_, i) => ({ amount: 14.55 + Math.random() * 2, date: getRandomDate(60) })),
  ];

  orderDistribution.forEach((order, index) => {
    const detection = detectProduct(order.amount);
    const commission = order.amount * 0.10; // Assuming 10% commission rate

    orders.push({
      id: `ORD-${String(index + 1).padStart(4, '0')}`,
      date: order.date,
      orderAmount: parseFloat(order.amount.toFixed(2)),
      commission: parseFloat(commission.toFixed(2)),
      detectedProduct: detection.product,
      productColor: detection.color
    });
  });

  // Sort by date descending
  return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

function getRandomDate(daysBack: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
  return date.toISOString().split('T')[0];
}

// Product analytics interfaces
interface ProductStats {
  product: string;
  orderCount: number;
  totalRevenue: number;
  totalCommission: number;
  avgOrderValue: number;
  percentage: number;
  color: string;
}

interface TrendData {
  product: string;
  currentMonth: number;
  previousMonth: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export default function SourHouseTracker() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [unidentifiedOrders, setUnidentifiedOrders] = useState<Order[]>([]);

  useEffect(() => {
    const sampleOrders = generateSampleOrders();
    setOrders(sampleOrders);
    setUnidentifiedOrders(sampleOrders.filter(o =>
      o.detectedProduct === "Unidentified Bundle" || o.detectedProduct === "Custom Bundle"
    ));
  }, []);

  // Calculate product statistics
  const productStats = useMemo((): ProductStats[] => {
    const stats: Record<string, ProductStats> = {};

    orders.forEach(order => {
      if (!stats[order.detectedProduct]) {
        stats[order.detectedProduct] = {
          product: order.detectedProduct,
          orderCount: 0,
          totalRevenue: 0,
          totalCommission: 0,
          avgOrderValue: 0,
          percentage: 0,
          color: order.productColor
        };
      }
      stats[order.detectedProduct].orderCount++;
      stats[order.detectedProduct].totalRevenue += order.orderAmount;
      stats[order.detectedProduct].totalCommission += order.commission;
    });

    const totalOrders = orders.length;

    return Object.values(stats)
      .map(s => ({
        ...s,
        avgOrderValue: s.totalRevenue / s.orderCount,
        percentage: (s.orderCount / totalOrders) * 100
      }))
      .sort((a, b) => b.orderCount - a.orderCount);
  }, [orders]);

  // Revenue leaders (sorted by revenue)
  const revenueLeaders = useMemo(() => {
    return [...productStats].sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [productStats]);

  // Calculate trends (current month vs previous month)
  const trendData = useMemo((): TrendData[] => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthOrders: Record<string, number> = {};
    const previousMonthOrders: Record<string, number> = {};

    orders.forEach(order => {
      const orderDate = new Date(order.date);
      const orderMonth = orderDate.getMonth();
      const orderYear = orderDate.getFullYear();

      if (orderMonth === currentMonth && orderYear === currentYear) {
        currentMonthOrders[order.detectedProduct] = (currentMonthOrders[order.detectedProduct] || 0) + 1;
      } else if (
        (orderMonth === currentMonth - 1 && orderYear === currentYear) ||
        (currentMonth === 0 && orderMonth === 11 && orderYear === currentYear - 1)
      ) {
        previousMonthOrders[order.detectedProduct] = (previousMonthOrders[order.detectedProduct] || 0) + 1;
      }
    });

    const allProducts = new Set([...Object.keys(currentMonthOrders), ...Object.keys(previousMonthOrders)]);

    return Array.from(allProducts).map(product => {
      const current = currentMonthOrders[product] || 0;
      const previous = previousMonthOrders[product] || 0;
      const change = previous > 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);

      const productConfig = productCategories[product];

      return {
        product,
        currentMonth: current,
        previousMonth: previous,
        change,
        trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
        color: productConfig?.color || '#6b7280'
      };
    }).sort((a, b) => b.change - a.change);
  }, [orders]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.orderAmount, 0);
    const totalCommission = orders.reduce((sum, o) => sum + o.commission, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return { totalOrders, totalRevenue, totalCommission, avgOrderValue };
  }, [orders]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: { message: string; type: 'success' | 'info' | 'warning' }[] = [];

    if (revenueLeaders.length > 0) {
      const topRevenue = revenueLeaders[0];
      recs.push({
        message: `${topRevenue.product} is your top revenue generator ($${topRevenue.totalRevenue.toFixed(2)}) - consider featuring it prominently`,
        type: 'success'
      });
    }

    const highVolumeProducts = productStats.filter(p => p.orderCount > orders.length * 0.15);
    highVolumeProducts.forEach(p => {
      if (p.avgOrderValue < summaryStats.avgOrderValue) {
        recs.push({
          message: `${p.product} has high volume (${p.orderCount} orders) but lower value ($${p.avgOrderValue.toFixed(2)} avg) - good entry product for customer acquisition`,
          type: 'info'
        });
      }
    });

    const trendingUp = trendData.filter(t => t.trend === 'up' && t.currentMonth > 2);
    trendingUp.slice(0, 2).forEach(t => {
      recs.push({
        message: `${t.product} is trending up ${t.change.toFixed(0)}% this month (${t.previousMonth} → ${t.currentMonth} orders) - investigate what's driving this`,
        type: 'success'
      });
    });

    const trendingDown = trendData.filter(t => t.trend === 'down' && t.previousMonth > 2);
    trendingDown.slice(0, 1).forEach(t => {
      recs.push({
        message: `${t.product} is declining ${Math.abs(t.change).toFixed(0)}% (${t.previousMonth} → ${t.currentMonth} orders) - may need marketing attention`,
        type: 'warning'
      });
    });

    if (unidentifiedOrders.length > 0) {
      recs.push({
        message: `${unidentifiedOrders.length} orders couldn't be matched to known products - review for new product additions`,
        type: 'warning'
      });
    }

    return recs.slice(0, 5);
  }, [productStats, revenueLeaders, trendData, unidentifiedOrders, summaryStats, orders.length]);

  const CHART_COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308', '#14b8a6', '#f43f5e', '#6366f1', '#84cc16'];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Navigation onHome={() => navigate('/')} />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">SourHouse Commission Tracker</h1>
            <p className="text-gray-400 mt-1">Product Analytics & Performance Dashboard</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2 bg-gray-800 border-gray-700 hover:bg-gray-700"
          >
            <Home className="h-4 w-4" />
            Home
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-400">Total Orders</p>
                <p className="text-3xl font-bold text-orange-500">{summaryStats.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-orange-500" />
            </div>
            <p className="text-xs text-gray-500">All-time order count</p>
          </Card>

          <Card className="p-6 bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-3xl font-bold text-green-500">${summaryStats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500">Gross order value</p>
          </Card>

          <Card className="p-6 bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-400">All-Time Commission</p>
                <p className="text-3xl font-bold text-emerald-400">${summaryStats.totalCommission.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-xs text-gray-500">Your earnings (10%)</p>
          </Card>

          <Card className="p-6 bg-gray-800 border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm text-gray-400">Avg Order Value</p>
                <p className="text-3xl font-bold text-blue-400">${summaryStats.avgOrderValue.toFixed(2)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-400" />
            </div>
            <p className="text-xs text-gray-500">Per transaction</p>
          </Card>
        </div>

        {/* Focus Recommendations Panel */}
        <Card className="p-6 mb-8 bg-gradient-to-r from-gray-800 to-gray-900 border-orange-500/30">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-white">Focus Recommendations</h3>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            AI-generated insights based on your sales data
          </p>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border flex items-start gap-3 ${
                  rec.type === 'success' ? 'bg-green-900/20 border-green-500/30' :
                  rec.type === 'warning' ? 'bg-amber-900/20 border-amber-500/30' :
                  'bg-blue-900/20 border-blue-500/30'
                }`}
              >
                <Lightbulb className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  rec.type === 'success' ? 'text-green-400' :
                  rec.type === 'warning' ? 'text-amber-400' :
                  'text-blue-400'
                }`} />
                <p className="text-sm text-gray-200">{rec.message}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Product Performance Section */}
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Package className="h-6 w-6 text-orange-500" />
          Product Performance
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Best Sellers by Volume */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Best Sellers by Volume</h3>
            <p className="text-sm text-gray-400 mb-4">Products ranked by number of orders</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productStats.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis
                  dataKey="product"
                  type="category"
                  width={150}
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="orderCount" name="Orders" radius={[0, 4, 4, 0]}>
                  {productStats.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {productStats.slice(0, 5).map((stat, index) => (
                <div key={stat.product} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-500">#{index + 1}</span>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="text-gray-300 truncate max-w-[200px]">{stat.product}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">{stat.orderCount} orders</span>
                    <span className="text-gray-500">({stat.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Revenue Leaders */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Revenue Leaders</h3>
            <p className="text-sm text-gray-400 mb-4">Products ranked by total revenue generated</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueLeaders.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="totalRevenue"
                  label={({ product, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {revenueLeaders.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {revenueLeaders.slice(0, 3).map((stat, index) => (
                <div
                  key={stat.product}
                  className={`p-3 rounded-lg ${
                    index === 0 ? 'bg-yellow-900/20 border border-yellow-500/30' :
                    index === 1 ? 'bg-gray-700/50 border border-gray-600' :
                    'bg-orange-900/20 border border-orange-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-300' :
                        'text-orange-400'
                      }`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </span>
                      <span className="text-gray-200 font-medium">{stat.product}</span>
                    </div>
                    <span className="text-green-400 font-bold">${stat.totalRevenue.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Commission: ${stat.totalCommission.toFixed(2)} • {stat.orderCount} orders
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Average Order Value by Product */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Average Order Value by Product</h3>
            <p className="text-sm text-gray-400 mb-4">Identifies high-value vs high-volume products</p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[...productStats].sort((a, b) => b.avgOrderValue - a.avgOrderValue).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="product"
                  stroke="#9ca3af"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fontSize: 10 }}
                />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => `$${value}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Avg Order Value']}
                />
                <Bar dataKey="avgOrderValue" name="Avg Value" radius={[4, 4, 0, 0]}>
                  {[...productStats].sort((a, b) => b.avgOrderValue - a.avgOrderValue).slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
              <p className="text-sm text-blue-300">
                <span className="font-medium">Insight:</span> High-value products generate more commission per sale,
                while high-volume products drive customer acquisition. Balance both for optimal revenue.
              </p>
            </div>
          </Card>

          {/* Product Trend Analysis */}
          <Card className="p-6 bg-gray-800 border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-2">Product Trend Analysis</h3>
            <p className="text-sm text-gray-400 mb-4">Current month vs previous month comparison</p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {trendData.filter(t => t.currentMonth > 0 || t.previousMonth > 0).map((trend) => (
                <div
                  key={trend.product}
                  className="p-4 rounded-lg bg-gray-700/50 border border-gray-600"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: trend.color }}
                      />
                      <span className="text-gray-200 font-medium text-sm truncate max-w-[180px]">
                        {trend.product}
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                      trend.trend === 'up' ? 'bg-green-900/30 text-green-400' :
                      trend.trend === 'down' ? 'bg-red-900/30 text-red-400' :
                      'bg-gray-600/30 text-gray-400'
                    }`}>
                      {trend.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> :
                       trend.trend === 'down' ? <ArrowDownRight className="h-4 w-4" /> :
                       <Minus className="h-4 w-4" />}
                      {trend.change > 0 ? '+' : ''}{trend.change.toFixed(0)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>Previous: {trend.previousMonth} orders</span>
                    <span>→</span>
                    <span>Current: {trend.currentMonth} orders</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card className="p-6 mb-8 bg-gray-800 border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Orders</h3>
              <p className="text-sm text-gray-400">With automatic product detection</p>
            </div>
            <span className="text-sm text-gray-500">Showing {Math.min(20, orders.length)} of {orders.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Order ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Detected Product</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Order Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Commission</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 20).map((order) => (
                  <tr key={order.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-sm text-gray-300 font-mono">{order.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-400">
                      {new Date(order.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${order.productColor}20`,
                          color: order.productColor,
                          border: `1px solid ${order.productColor}40`
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: order.productColor }}
                        />
                        {order.detectedProduct}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-200 font-medium">
                      ${order.orderAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-green-400 font-medium">
                      ${order.commission.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Unidentified Orders Section */}
        {unidentifiedOrders.length > 0 && (
          <Card className="p-6 mb-8 bg-amber-900/20 border-amber-500/30">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">Unidentified Orders for Review</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              These orders don't match known product price ranges. Review to add new product categories.
            </p>
            <div className="space-y-2">
              {unidentifiedOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-400">{order.id}</span>
                    <span className="text-sm text-gray-300">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-amber-400 font-medium">${order.orderAmount.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                      {order.detectedProduct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Product Category Reference */}
        <Card className="p-6 bg-gray-800 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Product Category Price Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(productCategories).map(([product, config]) => (
              <div
                key={product}
                className="p-3 rounded-lg border"
                style={{
                  backgroundColor: `${config.color}10`,
                  borderColor: `${config.color}30`
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-sm font-medium text-gray-200">{product}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Range: ${config.min.toFixed(2)} - ${config.max.toFixed(2)}
                  {config.basePrice && <span className="ml-2">• Base: ${config.basePrice.toFixed(2)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-6 mt-8 bg-gray-800/50 border-gray-700">
          <p className="text-sm text-gray-400">
            <strong className="text-gray-300">Note:</strong> Product detection is based on order amount matching to known price ranges.
            Orders that fall outside defined ranges are marked for manual review. Commission is calculated at 10% of order value.
          </p>
        </Card>
      </div>
    </div>
  );
}
