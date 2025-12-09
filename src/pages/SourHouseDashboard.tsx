import { useState } from 'react';
import { RefreshCw, DollarSign, Calendar, TrendingUp, Percent, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useCommissionTracker } from '@/hooks/useCommissionTracker';

export default function SourHouseDashboard() {
  const {
    orders,
    stats,
    monthlyCommissions,
    orderTrends,
    isLoading,
    error,
    lastUpdated,
    refresh,
  } = useCommissionTracker();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0f0f18]">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SourHouse Commission Tracker</h1>
              <p className="text-sm text-gray-400">HBK23 Affiliate Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-400">
                Last updated: {formatDate(lastUpdated)}
              </span>
            )}
            <Button
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <a
              href="https://thesourhouse.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 mt-4">
          <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-[#12121a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">All-Time Commission</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(stats.allTimeCommission)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.allTimeOrders} orders
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(stats.thisMonthCommission)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.thisMonthOrders} orders
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">This Week</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(stats.thisWeekCommission)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {stats.thisWeekOrders} orders
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Avg Order Value</p>
                  <p className="text-3xl font-bold text-white mt-1">
                    {formatCurrency(stats.avgOrderValue)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(stats.commissionRate * 100).toFixed(0)}% commission rate
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <Percent className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-[#12121a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Monthly Commission</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyCommissions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => value.split(' ')[0]}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f1f2e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [formatCurrency(value), 'Commission']}
                    />
                    <Bar dataKey="commission" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#12121a] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Order Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={orderTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => value.split(' ')[0]}
                    />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f1f2e',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                      labelStyle={{ color: '#fff' }}
                      formatter={(value: number) => [value, 'Orders']}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={{ fill: '#22d3ee', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card className="bg-[#12121a] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-transparent">
                    <TableHead className="text-gray-400">DATE</TableHead>
                    <TableHead className="text-gray-400">ORDER ID</TableHead>
                    <TableHead className="text-gray-400 text-right">ORDER VALUE</TableHead>
                    <TableHead className="text-gray-400 text-right">COMMISSION (15%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                        Loading orders...
                      </TableCell>
                    </TableRow>
                  ) : orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-400 py-8">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.slice(0, 50).map((order) => (
                      <TableRow key={order.id} className="border-gray-800 hover:bg-gray-800/50">
                        <TableCell className="text-gray-300">
                          {formatDate(order.date)}
                        </TableCell>
                        <TableCell>
                          <a
                            href="#"
                            className="text-cyan-400 hover:text-cyan-300 hover:underline"
                          >
                            {order.orderId}
                          </a>
                        </TableCell>
                        <TableCell className="text-right text-gray-300">
                          {formatCurrency(order.orderValue)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-400 font-medium">
                          {formatCurrency(order.commission)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {orders.length > 50 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Showing 50 of {orders.length} orders
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm mt-8 pb-4">
          <p>SourHouse Commission Tracker for Baking Great Bread at Home</p>
          <p>Affiliate Code: HBK23 - 15% Commission Rate</p>
        </footer>
      </main>
    </div>
  );
}
