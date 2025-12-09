import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Order, CommissionStats, MonthlyCommission, OrderTrend } from '@/types/commission';

const COMMISSION_RATE = 0.15; // 15% commission rate
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 8000]; // Exponential backoff

interface UseCommissionTrackerResult {
  orders: Order[];
  stats: CommissionStats;
  monthlyCommissions: MonthlyCommission[];
  orderTrends: OrderTrend[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

// Parse SourHouse order notification emails
function parseOrderFromEmail(emailBody: string, emailDate: Date): Order | null {
  try {
    // Pattern for SourHouse order emails
    // Looking for order ID and order total
    const orderIdMatch = emailBody.match(/order\s*(?:#|number|id)?:?\s*([A-Z0-9-]+)/i) ||
                         emailBody.match(/SH(\d+)/i) ||
                         emailBody.match(/#(\d{6,})/);

    const totalMatch = emailBody.match(/(?:order\s+)?total:?\s*\$?([\d,]+\.?\d*)/i) ||
                       emailBody.match(/\$(\d+\.?\d*)\s*(?:USD|total)/i) ||
                       emailBody.match(/amount:?\s*\$?([\d,]+\.?\d*)/i);

    if (!orderIdMatch || !totalMatch) {
      return null;
    }

    const orderId = orderIdMatch[1] || orderIdMatch[0];
    const orderValue = parseFloat(totalMatch[1].replace(',', ''));

    if (isNaN(orderValue) || orderValue <= 0) {
      return null;
    }

    return {
      id: `${orderId}-${emailDate.getTime()}`,
      date: emailDate,
      orderId: orderId.startsWith('SH') ? orderId : `SH${orderId}`,
      orderValue,
      commission: orderValue * COMMISSION_RATE,
    };
  } catch {
    return null;
  }
}

function calculateStats(orders: Order[]): CommissionStats {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const thisMonthOrders = orders.filter(o => new Date(o.date) >= startOfMonth);
  const thisWeekOrders = orders.filter(o => new Date(o.date) >= startOfWeek);

  const allTimeCommission = orders.reduce((sum, o) => sum + o.commission, 0);
  const thisMonthCommission = thisMonthOrders.reduce((sum, o) => sum + o.commission, 0);
  const thisWeekCommission = thisWeekOrders.reduce((sum, o) => sum + o.commission, 0);
  const avgOrderValue = orders.length > 0
    ? orders.reduce((sum, o) => sum + o.orderValue, 0) / orders.length
    : 0;

  return {
    allTimeCommission,
    allTimeOrders: orders.length,
    thisMonthCommission,
    thisMonthOrders: thisMonthOrders.length,
    thisWeekCommission,
    thisWeekOrders: thisWeekOrders.length,
    avgOrderValue,
    commissionRate: COMMISSION_RATE,
  };
}

function calculateMonthlyCommissions(orders: Order[]): MonthlyCommission[] {
  const monthlyMap = new Map<string, number>();

  orders.forEach(order => {
    const date = new Date(order.date);
    const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + order.commission);
  });

  // Get last 8 months
  const result: MonthlyCommission[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
    result.push({
      month: monthKey,
      commission: monthlyMap.get(monthKey) || 0,
    });
  }

  return result;
}

function calculateOrderTrends(orders: Order[]): OrderTrend[] {
  const monthlyMap = new Map<string, number>();

  orders.forEach(order => {
    const date = new Date(order.date);
    const monthKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
  });

  // Get last 10 months
  const result: OrderTrend[] = [];
  const now = new Date();
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
    result.push({
      month: monthKey,
      orders: monthlyMap.get(monthKey) || 0,
    });
  }

  return result;
}

export function useCommissionTracker(): UseCommissionTrackerResult {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    allTimeCommission: 0,
    allTimeOrders: 0,
    thisMonthCommission: 0,
    thisMonthOrders: 0,
    thisWeekCommission: 0,
    thisWeekOrders: 0,
    avgOrderValue: 0,
    commissionRate: COMMISSION_RATE,
  });
  const [monthlyCommissions, setMonthlyCommissions] = useState<MonthlyCommission[]>([]);
  const [orderTrends, setOrderTrends] = useState<OrderTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const retryCountRef = useRef(0);

  const fetchEmailsWithRetry = useCallback(async (retryCount = 0): Promise<void> => {
    try {
      // Call the Supabase edge function to fetch emails
      const { data, error: fetchError } = await supabase.functions.invoke('fetch-commission-emails', {
        body: {
          affiliateCode: 'HBK23',
          searchQuery: 'from:sourhouse subject:order OR subject:commission'
        }
      });

      // Handle edge function invocation errors
      if (fetchError) {
        const errorMsg = fetchError.message || '';

        // Check for specific error types that shouldn't be retried
        if (errorMsg.includes('authentication expired') || errorMsg.includes('re-authenticate')) {
          throw new Error('Gmail authentication expired. Please re-authenticate with Google.');
        }
        if (errorMsg.includes('credentials not configured')) {
          throw new Error('Gmail API credentials not configured. Please set up GMAIL_REFRESH_TOKEN, GMAIL_CLIENT_ID, and GMAIL_CLIENT_SECRET in Supabase secrets.');
        }

        // For network/transient errors, retry with backoff
        if (retryCount < MAX_RETRIES) {
          console.log(`[Commission Tracker] Retry ${retryCount + 1}/${MAX_RETRIES} after ${RETRY_DELAYS[retryCount]}ms`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
          return fetchEmailsWithRetry(retryCount + 1);
        }

        throw new Error(errorMsg || 'Failed to fetch emails');
      }

      // Handle error response from edge function
      if (data && !data.success && data.error) {
        const errorMsg = data.error;

        // Check for auth errors that shouldn't be retried
        if (errorMsg.includes('authentication expired') || errorMsg.includes('re-authenticate')) {
          throw new Error('Gmail authentication expired. Please re-authenticate with Google.');
        }
        if (errorMsg.includes('credentials not configured')) {
          throw new Error('Gmail API credentials not configured. Please contact the administrator.');
        }
        if (errorMsg.includes('rate limit')) {
          throw new Error('Gmail API rate limit reached. Please try again in a few minutes.');
        }

        // For other errors, retry with backoff
        if (retryCount < MAX_RETRIES) {
          console.log(`[Commission Tracker] Retry ${retryCount + 1}/${MAX_RETRIES} after ${RETRY_DELAYS[retryCount]}ms`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
          return fetchEmailsWithRetry(retryCount + 1);
        }

        throw new Error(errorMsg);
      }

      if (!data || !data.emails) {
        throw new Error('No email data received from server');
      }

      // Parse emails into orders
      const parsedOrders: Order[] = [];
      for (const email of data.emails) {
        const order = parseOrderFromEmail(email.body, new Date(email.date));
        if (order) {
          parsedOrders.push(order);
        }
      }

      // Sort by date descending
      parsedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Calculate all derived data
      const calculatedStats = calculateStats(parsedOrders);
      const calculatedMonthly = calculateMonthlyCommissions(parsedOrders);
      const calculatedTrends = calculateOrderTrends(parsedOrders);

      setOrders(parsedOrders);
      setStats(calculatedStats);
      setMonthlyCommissions(calculatedMonthly);
      setOrderTrends(calculatedTrends);
      setLastUpdated(new Date());
      setError(null);
      retryCountRef.current = 0;
    } catch (err) {
      throw err;
    }
  }, []);

  const fetchEmails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await fetchEmailsWithRetry(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch emails';
      console.error('Commission tracker error:', errorMessage);
      setError(errorMessage);

      // Try to load cached data from localStorage
      const cached = localStorage.getItem('commission_tracker_cache');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setOrders(cachedData.orders.map((o: Order) => ({ ...o, date: new Date(o.date) })));
          setStats(cachedData.stats);
          setMonthlyCommissions(cachedData.monthlyCommissions);
          setOrderTrends(cachedData.orderTrends);
          setLastUpdated(new Date(cachedData.lastUpdated));
        } catch {
          // Cache parse failed, use empty state
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchEmailsWithRetry]);

  // Cache successful fetches
  useEffect(() => {
    if (orders.length > 0 && !error) {
      localStorage.setItem('commission_tracker_cache', JSON.stringify({
        orders,
        stats,
        monthlyCommissions,
        orderTrends,
        lastUpdated,
      }));
    }
  }, [orders, stats, monthlyCommissions, orderTrends, lastUpdated, error]);

  // Initial fetch
  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return {
    orders,
    stats,
    monthlyCommissions,
    orderTrends,
    isLoading,
    error,
    lastUpdated,
    refresh: fetchEmails,
  };
}
