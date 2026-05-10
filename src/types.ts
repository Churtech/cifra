/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Institution {
  id: number;
  name: string;
  logo_url: string;
  type: string;
}

export interface CDTDetail {
  cdt: {
    id: number;
    institution_id: number;
    institution: Institution;
    tasa_ea: number;
    plazo_dias: number;
    monto_min: number;
    recorded_date: string;
  };
  nominal_return: number;
  net_return: number;
  real_return: number;
  interest_gross: number;
  withholding: number;
  interest_net: number;
  final_amount: number;
  net_rate_ea: number;
  risk: string;
  liquidity: string;
  guarantee: string;
  guarantee_limit?: number;
}

export interface Asset {
  id: number;
  ticker: string;
  name: string;
  type: 'etf' | 'stock';
  currency: string;
}

export interface AssetDetail {
  asset: Asset;
  price_usd: number;
  price_cop: number;
  change_1d: number;
  change_7d: number;
  change_30d: number;
  change_1y: number;
  volatility: number;
  risk: string;
  annual_return: number;
}

export interface ComparisonItem {
  rank: number;
  type: 'CDT' | 'ETF' | 'Stock';
  ticker?: string;
  institution?: string;
  product: string;
  rate_ea?: number;
  annual_return?: number;
  nominal_return: number;
  net_return: number;
  real_return: number;
  final_amount: number;
  gain: number;
  volatility?: number;
  risk: string;
  liquidity: string;
  guarantee?: string;
}

export interface MarketMetrics {
  cdt_average_90d: number;
  cdt_average_180d: number;
  cdt_average_360d: number;
  best_cdt_rate: number;
  best_etf_performer: string;
  best_stock_performer: string;
  trm_current: number;
  trm_change_7d: number;
  trm_change_30d: number;
  inflation_rate: number;
  timestamp: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
  volume: number;
  change_pct: number;
}

export interface PortfolioAllocation {
  ticker?: string;
  asset_id?: number;
  weight_percentage: number;
}

export interface Portfolio {
  id: number;
  name: string;
  description?: string;
  total_investment_cop: number;
  user_id: number;
  created_at: string;
  updated_at?: string;
  allocations?: PortfolioAllocation[];
  metrics?: PortfolioMetrics;
  correlations?: PortfolioCorrelations;
  recommendation?: PortfolioRecommendation;
}

export interface PortfolioMetrics {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  maximum_drawdown: number;
  diversification_score: number;
  calculated_at: string;
}

export interface PortfolioCorrelations {
  assets: string[];
  matrix: number[][];
  calculated_at: string;
}

export interface PortfolioRecommendation {
  classification: string;
  summary: string;
  risks: string[];
  actions: string[];
  confidence_level: number;
  generated_at: string;
}

export interface BacktestResult {
  portfolio_id: number;
  start_date: string;
  end_date: string;
  initial_investment: number;
  final_value: number;
  total_return: number;
  annualized_return: number;
  volatility: number;
  sharpe_ratio: number;
  win_rate: number;
  daily_values: {
    date: string;
    portfolio_value: number;
    cumulative_return: number;
  }[];
}

export interface TRMMetrics {
  current: number;
  change_7d: number;
  high_52w: number;
  low_52w: number;
}

export interface AssetVolatility {
  ticker: string;
  volatility: number;
  days: number;
}

export interface AssetPairCorrelation {
  ticker1: string;
  ticker2: string;
  correlation: number;
  days: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

export interface ApiError {
  error: string;
}
