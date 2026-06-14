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
  best_cdt_entity?: string;
  best_etf_performer: string;
  best_stock_performer: string;
  trm_current: number;
  trm_change_7d: number;
  trm_change_30d: number;
  trm_high_52w?: number;
  trm_low_52w?: number;
  inflation_rate: number;
  timestamp: string;
}

export interface HistoryPoint {
  date: string;
  close: number;
  volume: number;
  change_pct: number;
  normalized_price?: number; // Base 100 desde el inicio de la serie
  price_cop?: number;       // Valor del activo en pesos colombianos para esa fecha
}

export interface RiskReturnPoint {
  ticker: string;
  name: string;
  volatility: number;
  expected_return: number;
}

export interface PortfolioAllocation {
  ticker?: string;
  asset_id?: number;
  cdt_id?: number;
  weight_percentage: number;
  asset?: Asset;
  cdt?: {
    id: number;
    institution_id: number;
    institution: Institution;
    tasa_ea: number;
    plazo_dias: number;
    monto_min: number;
    recorded_date: string;
  };
}

export interface Portfolio {
  id: number;
  name: string;
  description?: string;
  total_investment_cop: number;
  user_id: string;
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
  total_commissions_cop?: number;
  daily_values: {
    date: string;
    portfolio_value: number;
    cumulative_return: number;
    daily_return?: number;
    drawdown?: number;
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

// --- Education Details (Caja de Cristal) ---
export interface EducationDetails {
  formulas_usage: Record<string, string>;
  references: string[];
  assumptions_explanations: Record<string, string>;
  disclaimers: string[];
}

// --- Analysis Report Node ---
export interface ReportMetadata {
  id: string;
  type: 'asset' | 'portfolio' | 'comparison';
  currency: string;
  lookback_days: number;
  formula_version: string;
  calculated_at: string;
}

export interface ReportAssumptions {
  risk_free_rate: number;
  inflation_rate: number;
  trm: number;
}

export interface AllocationDetail {
  ticker: string;
  name: string;
  weight_percentage: number;
}

export interface AssetContributionDetail {
  ticker: string;
  name: string;
  return_contribution?: number;
  volatility_contribution?: number;
}

export interface CorrelationMatrixResponse {
  assets: string[];
  matrix: number[][];
}

export interface ScenarioTrajectoryPoint {
  month: number;
  nominal_value: number;
  real_value: number;
}

export interface Scenario {
  name: string; // "Conservador", "Base", "Optimista"
  return_rate: number;
  real_return: number;
  trajectory: ScenarioTrajectoryPoint[];
}

export interface TechnicalAnalysis {
  expected_return?: number;
  volatility?: number;
  sharpe_ratio?: number;
  maximum_drawdown?: number;
  drawdown_peak_date?: string;
  drawdown_trough_date?: string;
  diversification_score?: number;
  allocations?: AllocationDetail[];
  contributions?: AssetContributionDetail[];
  correlation_matrix?: CorrelationMatrixResponse;
  comparison_summary?: ComparisonSummaryDetail;
  scenarios?: Scenario[];
}

export interface ComparisonSummaryDetail {
  portfolios: Record<string, TechnicalAnalysis>;
  best_return_portfolio_id: string;
  best_sharpe_portfolio_id: string;
  best_diversification_portfolio_id: string;
}

export interface HumanAnalysis {
  summary: string;
  risk_explanation: string;
  return_explanation: string;
  sharpe_explanation: string;
  diversification_explanation?: string;
}

export interface ConcentrationAlert {
  is_triggered: boolean;
  tickers: string[];
  message: string;
}

export interface CorrelationAlert {
  is_triggered: boolean;
  pairs: string[];
  message: string;
}

export interface RiskAnalysis {
  classification: string;
  concentration_risk?: ConcentrationAlert;
  correlation_risk?: CorrelationAlert;
  missing_metrics?: string[];
  missing_correlations?: string[];
  alerts?: string[];
}

export interface DataQuality {
  score: number;
  warnings: string[];
}

export interface AnalysisReport {
  metadata: ReportMetadata;
  assumptions: ReportAssumptions;
  education: EducationDetails;
  technical_analysis: TechnicalAnalysis;
  human_analysis: HumanAnalysis;
  risk_analysis: RiskAnalysis;
  data_quality: DataQuality;
}

// --- Retrospective Simulation COP/USD ---
export interface TrajectoryDailyValue {
  date: string;
  value_cop: number;
}

export interface Trajectory {
  name: string;
  initial_cop: number;
  final_cop: number;
  total_return: number;
  daily_values: TrajectoryDailyValue[];
  metadata?: Record<string, any>;
}

export interface RetrospectiveRequest {
  initial_amount_cop: number;
  start_date: string;
  end_date: string;
  asset_ticker: string;
  cdt_plazo_dias?: number;
  investor_type?: 'natural' | 'juridica';
}

export interface RetrospectiveResult {
  request: {
    initial_amount_cop: number;
    start_date: string;
    end_date: string;
    asset_ticker: string;
    cdt_plazo_dias: number;
    investor_type: 'natural' | 'juridica';
  };
  cdt_trajectory: Trajectory;
  usd_trajectory: Trajectory;
  winner: string;
  difference_cop: number;
  difference_pct: number;
  education: EducationDetails;
  calculated_at: string;
}

// --- Portfolio Comparison ---
export interface PortfolioComparison {
  portfolios: Record<number, Portfolio>;
  best_return: string;
  best_sharpe: string;
  best_diversification: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: any;
}

export interface ApiError {
  error: string;
}

// --- Asset Highlights ---
export interface AssetWithMetrics extends AssetDetail {
  change_90d?: number;
  volatility_180d?: number;
  sharpe_ratio?: number;
  sharpe_90d?: number;
  volume?: number;
}

export interface AssetHighlight {
  type: 'GROWTH' | 'EFFICIENCY' | 'STABILITY';
  label: string;
  asset: AssetWithMetrics;
  metric_value: string;
  metric_name: string;
  analysis: string;
}

export interface AssetHighlightsResponse {
  growth: AssetHighlight[];
  efficiency: AssetHighlight[];
  stability: AssetHighlight[];
}

export interface AssetHistorySummary {
  asset: Asset;
  history: HistoryPoint[];
  history_status: string;
}

export interface DashboardSummaryResponse {
  portfolios: Portfolio[];
  market_metrics: MarketMetrics;
  asset_highlights: AssetHighlightsResponse;
  asset_histories: AssetHistorySummary[];
  history_status: string;
  history_warning?: string;
}
