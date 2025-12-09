export interface Order {
  id: string;
  date: Date;
  orderId: string;
  orderValue: number;
  commission: number;
}

export interface CommissionStats {
  allTimeCommission: number;
  allTimeOrders: number;
  thisMonthCommission: number;
  thisMonthOrders: number;
  thisWeekCommission: number;
  thisWeekOrders: number;
  avgOrderValue: number;
  commissionRate: number;
}

export interface MonthlyCommission {
  month: string;
  commission: number;
}

export interface OrderTrend {
  month: string;
  orders: number;
}

export interface EmailFetchResult {
  orders: Order[];
  stats: CommissionStats;
  monthlyCommissions: MonthlyCommission[];
  orderTrends: OrderTrend[];
  lastUpdated: Date;
  error?: string;
}

export interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
