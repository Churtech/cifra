import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import api from '../lib/api';
import { 
  ApiResponse, 
  CDTDetail, 
  AssetDetail, 
  ComparisonItem, 
  MarketMetrics, 
  HistoryPoint,
  Portfolio,
  PortfolioAllocation,
  PortfolioMetrics,
  PortfolioCorrelations,
  PortfolioRecommendation,
  BacktestResult,
  TRMMetrics,
  AssetVolatility,
  AssetPairCorrelation,
  AnalysisReport,
  RetrospectiveRequest,
  RetrospectiveResult,
  PortfolioComparison,
  AssetHighlightsResponse
} from '../types';

// --- CDTs ---
export const useCDTs = (params?: { investment?: number; days?: number }) => {
  return useQuery({
    queryKey: ['cdts', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CDTDetail[]>>('/cdts', { params });
      return data;
    },
  });
};

export const useBestCDT = (params?: { investment?: number; days?: number }) => {
  return useQuery({
    queryKey: ['cdts', 'best', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CDTDetail>>('/cdts/best', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
};

// --- Assets ---
export const useAssets = (params?: { type?: 'etf' | 'stock'; days?: number; investment?: number }) => {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: async () => {
      if (import.meta.env.DEV) console.log('Fetching assets with params:', params);
      const { data } = await api.get<ApiResponse<AssetDetail[]>>('/assets', { params });
      if (import.meta.env.DEV) console.log('Raw Assets Response:', data);
      
      if (data?.data && Array.isArray(data.data)) {
        // Limpieza preventiva: asegurar tipos numéricos
        data.data = data.data.map(item => ({
            ...item,
            price_cop: Number(item.price_cop || 0),
            change_1d: Number(item.change_1d || 0),
            annual_return: Number(item.annual_return || 0),
            volatility: Number(item.volatility || 0)
        }));
      } else {
        if (import.meta.env.DEV) console.warn('API returned non-array or empty data for assets:', data);
      }
      return data;
    },
  });
};

export const useAssetHighlights = (type: 'etf' | 'stock' = 'etf') => {
  return useQuery({
    queryKey: ['assets', 'highlights', type],
    queryFn: async () => {
      const { data } = await api.get<AssetHighlightsResponse>('/assets/highlights', { params: { type } });
      return data;
    },
  });
};

export const useAssetDetail = (ticker: string, params?: { days?: number; investment?: number }) => {
  return useQuery({
    queryKey: ['assets', ticker, params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AssetDetail>>(`/assets/${ticker}`, { params });
      return data;
    },
    enabled: !!ticker,
  });
};

export const useAssetHistory = (ticker: string, days?: number) => {
  return useQuery({
    queryKey: ['assets', ticker, 'history', days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<HistoryPoint[]>>(`/assets/${ticker}/history`, { params: { days } });
      return data;
    },
    enabled: !!ticker,
  });
};

// --- Portfolios ---
export const usePortfolios = (params?: { user_id: number; limit?: number; offset?: number }) => {
  return useQuery({
    queryKey: ['portfolios', params],
    queryFn: async () => {
      const { data } = await api.get<{ portfolios: any[]; total: number }>('/portfolios', { params });
      
      if (data && data.portfolios) {
        data.portfolios = data.portfolios.map(p => ({
          ...p,
          metrics: p.metrics || {
            expected_return: Number(p.expected_return || 0),
            volatility: Number(p.volatility || 0),
            sharpe_ratio: Number(p.sharpe_ratio || 0),
            diversification_score: Number(p.diversification_score || 0),
            maximum_drawdown: Number(p.maximum_drawdown || 0)
          }
        }));
      }
      return data as { portfolios: Portfolio[]; total: number };
    },
  });
};

export const usePortfolioDetail = (portfolioId: number) => {
  return useQuery({
    queryKey: ['portfolios', portfolioId],
    queryFn: async () => {
      const { data } = await api.get<Portfolio>(`/portfolios/${portfolioId}`);
      return data;
    },
    enabled: !!portfolioId,
  });
};

export const useCreatePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; total_investment_cop: number; user_id: number; allocations: PortfolioAllocation[] }) => {
      const { data } = await api.post<ApiResponse<{ portfolio_id: number }>>('/portfolios', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};

export const useUpdatePortfolio = (portfolioId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string; total_investment_cop: number; user_id: number; allocations: PortfolioAllocation[] }) => {
      const { data } = await api.put<{ message: string }>(`/portfolios/${portfolioId}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios', portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};

export const useDeletePortfolio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (portfolioId: number) => {
      const { data } = await api.delete<{ message: string }>(`/portfolios/${portfolioId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
};

export const usePortfolioMetrics = (portfolioId: number) => {
  return useQuery({
    queryKey: ['portfolios', portfolioId, 'metrics'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PortfolioMetrics>>(`/portfolios/${portfolioId}/metrics`);
      return data;
    },
    enabled: !!portfolioId,
  });
};

export const usePortfolioCorrelations = (portfolioId: number) => {
  return useQuery({
    queryKey: ['portfolios', portfolioId, 'correlations'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PortfolioCorrelations>>(`/portfolios/${portfolioId}/correlations`);
      return data;
    },
    enabled: !!portfolioId,
  });
};

export const usePortfolioRecommendations = (portfolioId: number) => {
  return useQuery({
    queryKey: ['portfolios', portfolioId, 'recommendations'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PortfolioRecommendation>>(`/portfolios/${portfolioId}/recommendations`);
      return data;
    },
    enabled: !!portfolioId,
  });
};

// --- Backtesting ---
export const useBacktest = () => {
  return useMutation({
    mutationFn: async ({ 
      portfolioId, 
      start_date, 
      end_date, 
      brokerage_fee_percentage, 
      brokerage_fee_min_cop 
    }: { 
      portfolioId: number; 
      start_date: string; 
      end_date: string; 
      brokerage_fee_percentage?: number; 
      brokerage_fee_min_cop?: number; 
    }) => {
      const { data } = await api.post<ApiResponse<BacktestResult>>(
        `/portfolios/${portfolioId}/backtest`, 
        { start_date, end_date, brokerage_fee_percentage, brokerage_fee_min_cop }
      );
      return data;
    },
  });
};

// --- Portfolio Analysis (Caja de Cristal & Human Analysis) ---
export const usePortfolioAnalysis = (portfolioId: number, params?: { currency?: string; lookback_days?: number }) => {
  return useQuery({
    queryKey: ['portfolios', portfolioId, 'analysis', params],
    queryFn: async () => {
      const { data } = await api.get<AnalysisReport>(`/portfolios/${portfolioId}/analysis`, { params });
      return data;
    },
    enabled: !!portfolioId,
  });
};

export const useAssetAnalysis = (
  ticker: string, 
  params?: { 
    currency?: string; 
    lookback_days?: number; 
    initial_amount?: number; 
    monthly_contribution?: number; 
    projection_years?: number;
  }
) => {
  return useQuery({
    queryKey: ['assets', ticker, 'analysis', params],
    queryFn: async () => {
      const { data } = await api.get<AnalysisReport>(`/assets/${ticker}/analysis`, { params });
      return data;
    },
    enabled: !!ticker,
    placeholderData: keepPreviousData,
  });
};

// --- Portfolio Comparison ---
export const useComparePortfolios = () => {
  return useMutation({
    mutationFn: async (portfolioIds: number[]) => {
      const { data } = await api.post<ApiResponse<PortfolioComparison>>('/portfolios/compare', { portfolio_ids: portfolioIds });
      return data;
    },
  });
};

// --- Retrospective Simulation COP/USD ---
export const useSimulateRetrospective = () => {
  return useMutation({
    mutationFn: async (payload: RetrospectiveRequest) => {
      const { data } = await api.post<ApiResponse<RetrospectiveResult>>('/simulate/retrospective', payload);
      return data;
    },
  });
};

// --- Market Metrics ---
export const useMarketMetrics = () => {
  return useQuery({
    queryKey: ['metrics'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/metrics');
      if (import.meta.env.DEV) console.log('Market Metrics API Response:', data);
      
      // Mapeo defensivo ultra-robusto
      if (data && data.data) {
        // Forzamos el mapeo de inflation_rate. Si viene 0 o null, intentamos fallbacks.
        data.data.inflation_rate = Number(
          data.data.inflation_rate !== undefined ? data.data.inflation_rate : 
          (data.data.inflation || data.data.ipc || 0)
        );
          
        if (import.meta.env.DEV) console.log('Final Mapped IPC:', data.data.inflation_rate);
      }
      
      return data as ApiResponse<MarketMetrics>;
    },
  });
};

export const useTRMMetrics = (days: number = 30) => {
  return useQuery({
    queryKey: ['metrics', 'trm', days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/trm/metrics', { params: { days } });
      if (import.meta.env.DEV) console.log('TRM Metrics Raw:', data);
      
      // Mapeo defensivo según la estructura observada
      const trm = {
          current: Number(data.data.current || data.data.trm_current || 0),
          change_7d: Number(data.data.change_7d || data.data.trm_change_7d || 0),
          high_52w: Number(data.data.high_52w || 0),
          low_52w: Number(data.data.low_52w || 0)
      };
      
      return { data: trm } as ApiResponse<TRMMetrics>;
    },
  });
};

export const useAssetVolatility = (ticker: string, days: number = 730) => {
  return useQuery({
    queryKey: ['metrics', 'volatility', ticker, days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AssetVolatility>>('/volatility', { params: { ticker, days } });
      return data;
    },
    enabled: !!ticker,
  });
};

export const useAssetCorrelation = (ticker1: string, ticker2: string, days: number = 730) => {
  return useQuery({
    queryKey: ['metrics', 'correlation', ticker1, ticker2, days],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<AssetPairCorrelation>>('/correlations', { params: { ticker1, ticker2, days } });
      return data;
    },
    enabled: !!ticker1 && !!ticker2,
  });
};

// --- Legacy / Global Comparison ---
export const useComparison = (params: { investment: number; days: number; criteria?: string }) => {
  return useQuery({
    queryKey: ['comparison', params],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ComparisonItem[]>>('/compare', { params });
      return data;
    },
    enabled: !!params.investment && !!params.days,
  });
};
