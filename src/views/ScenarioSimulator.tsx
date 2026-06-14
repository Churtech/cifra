import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Wallet, DollarSign, Activity, AlertTriangle, 
  Info, BookOpen, ChevronDown, Scale, Zap, Shield, Award 
} from 'lucide-react';
import { 
  useAssetAnalysis, useAssets, useMarketMetrics, useBestCDT, useTRMMetrics, useCDTs 
} from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';

// --- Custom Debounce State Hook (ref-based, no stale-closure bug, Strict-Mode safe) ---
type CommitFn = (partial: { initial_amount?: number; monthly_contribution?: number; projection_years?: number }) => void;

function useDebounceState<T extends number>(
  initialValue: T,
  delay: number,
  onCommit?: CommitFn,
  commitKey?: 'initial_amount' | 'monthly_contribution' | 'projection_years'
): [T, (v: T) => void, T, (v: T) => void] {
  const [value, _setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef<T>(initialValue);

  const setValue = useCallback((v: T) => {
    latestValue.current = v;
    _setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedValue(latestValue.current);
      if (onCommit && commitKey) onCommit({ [commitKey]: latestValue.current } as any);
    }, delay);
  }, [delay, onCommit, commitKey]);

  // Bypass debounce — cancel any pending timer and set both values immediately (no effect, Strict-Mode safe)
  const setImmediately = useCallback((v: T) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    latestValue.current = v;
    _setValue(v);
    setDebouncedValue(v);
  }, []);

  return [value, setValue, debouncedValue, setImmediately];
}

// --- Deflation Utility (Fisher Equation) ---
// V_real,t = V_nominal,t / (1 + i)^(t/12)
export function deflateValue(nominalValue: number, monthIndex: number, inflationRate: number): number {
  const inflationFactor = Math.pow(1 + inflationRate / 100, monthIndex / 12);
  return nominalValue / inflationFactor;
}

// --- CDT Compounding Utility with 7% Withholding Tax ---
export interface CDTTrajectoryPoint {
  month: number;
  nominal_value: number;
  real_value: number;
}

export interface CDTCalculationDetails {
  trajectory: CDTTrajectoryPoint[];
  finalNominalValue: number;
  finalRealValue: number;
  totalInterestGross: number;
  totalTaxesDeducted: number;
  totalContributions: number;
  totalNetGain: number;
}

export function calculateCDTTrajectoryDetailed(
  pv: number,
  pmt: number,
  tasaEA: number,
  years: number,
  inflationRate: number,
  isReal: boolean
): CDTCalculationDetails {
  const months = years * 12;
  const rateEA = tasaEA / 100;
  const monthlyRate = Math.pow(1 + rateEA, 1 / 12) - 1;
  
  let balance = pv;
  let accumulatedInterestYear = 0;
  let totalInterestGross = 0;
  let totalTaxesDeducted = 0;
  
  const trajectory: CDTTrajectoryPoint[] = [{
    month: 0,
    nominal_value: pv,
    real_value: pv,
  }];
  
  for (let m = 1; m <= months; m++) {
    const interest = balance * monthlyRate;
    accumulatedInterestYear += interest;
    totalInterestGross += interest;
    balance += interest;
    balance += pmt;
    
    // Deduct 7% withholding tax exactly at the end of each 12-month cycle
    if (m % 12 === 0) {
      const tax = accumulatedInterestYear * 0.07;
      balance -= tax;
      totalTaxesDeducted += tax;
      accumulatedInterestYear = 0;
    }
    
    const realVal = deflateValue(balance, m, inflationRate);
    
    trajectory.push({
      month: m,
      nominal_value: balance,
      real_value: realVal,
    });
  }
  
  return {
    trajectory,
    finalNominalValue: balance,
    finalRealValue: trajectory[trajectory.length - 1].real_value,
    totalInterestGross,
    totalTaxesDeducted,
    totalContributions: pv + (pmt * months),
    totalNetGain: balance - (pv + (pmt * months))
  };
}

type ViewMode = 'compare' | 'variable' | 'cdt';

const ScenarioSimulator: React.FC = () => {
  // --- Core States ---
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');
  const [isReal, setIsReal] = useState<boolean>(false);
  const [ticker, setTicker] = useState<string>('SPY');
  
  // Atomic query params — only updated from event handlers and debounce timer callbacks.
  // Never updated from a useEffect (which React 18 Strict Mode double-invokes, causing stale writes).
  const [committedParams, setCommittedParams] = useState({
    currency: 'COP' as 'COP' | 'USD',
    initial_amount: 10000000,
    monthly_contribution: 500000,
    projection_years: 5,
  });

  // Stable ref so debounce callbacks always read current params without stale closure
  const committedParamsRef = useRef(committedParams);
  committedParamsRef.current = committedParams;

  // Commit helper — merges a partial update into committedParams
  const commitParams = useCallback((partial: Partial<typeof committedParams>) => {
    setCommittedParams(prev => ({ ...prev, ...partial }));
  }, []);

  // Input States with debounce — each calls commitParams when the debounce timer fires
  const [initialAmount, setInitialAmount, debouncedInitialAmount, setDebouncedInitialAmount] =
    useDebounceState<number>(10000000, 300, commitParams, 'initial_amount');
  const [monthlyContribution, setMonthlyContribution, debouncedMonthlyContribution, setDebouncedMonthlyContribution] =
    useDebounceState<number>(500000, 300, commitParams, 'monthly_contribution');
  const [projectionYears, setProjectionYears, debouncedProjectionYears, setDebouncedProjectionYears] =
    useDebounceState<number>(5, 300, commitParams, 'projection_years');

  const [overrideCDT, setOverrideCDT] = useState<string>('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<'best' | 'custom' | number>('best');
  const [isCDTDropdownOpen, setIsCDTDropdownOpen] = useState(false);

  // Dropdown States
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');

  // --- Fetching Data ---
  const { data: marketMetricsResponse } = useMarketMetrics();
  const { data: trmMetricsResponse } = useTRMMetrics(30);
  const { data: etfsResponse } = useAssets({ type: 'etf' });
  const { data: stocksResponse } = useAssets({ type: 'stock' });

  // Resolve TRM rate (market metrics contains trm_current)
  const trm = useMemo(() => {
    return trmMetricsResponse?.data?.current || marketMetricsResponse?.data?.trm_current || 4000;
  }, [trmMetricsResponse, marketMetricsResponse]);

  // Combined assets list
  const assets = useMemo(() => {
    const etfs = etfsResponse?.data || [];
    const stocks = stocksResponse?.data || [];
    return [...etfs, ...stocks];
  }, [etfsResponse, stocksResponse]);

  const selectedAsset = useMemo(() => {
    const found = assets.find(a => a.asset.ticker === ticker);
    if (found) return found.asset;
    // Standard default fallback
    return { ticker: 'SPY', name: 'S&P 500 ETF Trust', type: 'etf', currency: 'USD' };
  }, [assets, ticker]);

  const filteredAssets = useMemo(() => {
    return assets.map(a => a.asset).filter(a => 
      a.ticker.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.name.toLowerCase().includes(assetSearch.toLowerCase())
    );
  }, [assets, assetSearch]);

  // CDT Reference rate from database
  // Send investment parameter in COP always
  const cdtInvestmentCop = useMemo(() => {
    return currency === 'COP' ? debouncedInitialAmount : debouncedInitialAmount * trm;
  }, [currency, debouncedInitialAmount, trm]);

  const { data: cdtsResponse } = useCDTs({ days: 360 });

  const { data: bestCDTResponse, isFetching: fetchingCDT, isPending: loadingCDT } = useBestCDT({
    investment: cdtInvestmentCop,
    days: 360
  });

  const uniqueInstitutions = useMemo(() => {
    const list = cdtsResponse?.data || [];
    const map = new Map<number, { institution: any; cdt: any }>();
    
    list.forEach(item => {
      if (item.cdt && item.cdt.institution && item.cdt.plazo_dias === 360) {
        const instId = item.cdt.institution.id;
        const existing = map.get(instId);
        if (!existing || item.cdt.tasa_ea > existing.cdt.tasa_ea) {
          map.set(instId, {
            institution: item.cdt.institution,
            cdt: item.cdt
          });
        }
      }
    });
    
    return Array.from(map.values());
  }, [cdtsResponse]);

  const bestCDTRate = useMemo(() => {
    return bestCDTResponse?.data?.cdt?.tasa_ea || marketMetricsResponse?.data?.best_cdt_rate || 0;
  }, [bestCDTResponse, marketMetricsResponse]);

  const cdtRate = useMemo(() => {
    if (selectedInstitutionId === 'custom') {
      const parsed = parseFloat(overrideCDT);
      return isNaN(parsed) ? bestCDTRate : parsed;
    }
    if (selectedInstitutionId === 'best') {
      return bestCDTRate;
    }
    const found = uniqueInstitutions.find(item => item.institution.id === selectedInstitutionId);
    return found ? found.cdt.tasa_ea : bestCDTRate;
  }, [selectedInstitutionId, overrideCDT, bestCDTRate, uniqueInstitutions]);

  const selectedCDT = useMemo(() => {
    if (selectedInstitutionId === 'best') {
      return bestCDTResponse?.data?.cdt || null;
    }
    if (selectedInstitutionId === 'custom') {
      return null;
    }
    const found = uniqueInstitutions.find(item => item.institution.id === selectedInstitutionId);
    return found ? found.cdt : null;
  }, [selectedInstitutionId, bestCDTResponse, uniqueInstitutions]);

  const initialAmountCop = useMemo(() => {
    return currency === 'COP' ? initialAmount : initialAmount * trm;
  }, [currency, initialAmount, trm]);

  const hasMinInvestmentWarning = useMemo(() => {
    if (!selectedCDT || selectedCDT.monto_min === undefined) return false;
    return initialAmountCop < selectedCDT.monto_min;
  }, [selectedCDT, initialAmountCop]);

  const handleSelectInstitution = useCallback((id: 'best' | number) => {
    setSelectedInstitutionId(id);
    setOverrideCDT('');
    setIsCDTDropdownOpen(false);
  }, []);

  const handleOverrideCDTChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setOverrideCDT(value);
    if (value !== '') {
      setSelectedInstitutionId('custom');
    } else {
      setSelectedInstitutionId('best');
    }
  }, []);


  // Fetch variable income asset projections (Monte Carlo)
  const { data: analysisResponse, isPending: loadingAnalysis, isFetching: fetchingAnalysis, error: analysisError } = useAssetAnalysis(
    ticker,
    {
      ...committedParams,
      lookback_days: 504
    }
  );

  // True while either query is in-flight — used to freeze the winner banner
  const isComparisonLoading = fetchingCDT || fetchingAnalysis;

  // True on first load: neither query has returned data yet.
  // Show a skeleton so the banner never renders with assetFinalMedian=0.
  const isInitialLoad = loadingAnalysis || loadingCDT;

  const hasCdtError = bestCDTRate === 0 && selectedInstitutionId !== 'custom' && !loadingCDT;
  const hasAssetError = !!analysisError && viewMode !== 'cdt';
  const showGeneralError = (hasCdtError && viewMode !== 'variable') || hasAssetError;

  // Inflation rate by currency
  const inflationRate = useMemo(() => {
    return currency === 'COP' ? 5.68 : 2.0;
  }, [currency]);

  // --- Synchronized Conversions on Toggle ---
  const handleCurrencyChange = (newCurrency: 'COP' | 'USD') => {
    if (newCurrency === currency) return;

    if (newCurrency === 'USD') {
      // COP -> USD: convert using current TRM
      const newPV = Math.round(initialAmount / trm);
      const newPMT = Math.round(monthlyContribution / trm);
      // setImmediately cancels any pending debounce timer and sets both visual + debounced
      setDebouncedInitialAmount(newPV);      // uses setImmediately internally
      setDebouncedMonthlyContribution(newPMT);
      setInitialAmount(newPV);               // visual input
      setMonthlyContribution(newPMT);
      // Commit all new params atomically so a single consistent query fires
      setCurrency(newCurrency);
      setCommittedParams({
        currency: newCurrency,
        initial_amount: newPV,
        monthly_contribution: newPMT,
        projection_years: debouncedProjectionYears,
      });
    } else {
      // USD -> COP
      const newPV = Math.round(initialAmount * trm);
      const newPMT = Math.round(monthlyContribution * trm);
      setDebouncedInitialAmount(newPV);
      setDebouncedMonthlyContribution(newPMT);
      setInitialAmount(newPV);
      setMonthlyContribution(newPMT);
      setCurrency(newCurrency);
      setCommittedParams({
        currency: newCurrency,
        initial_amount: newPV,
        monthly_contribution: newPMT,
        projection_years: debouncedProjectionYears,
      });
    }
  };

  // --- Dynamic Configurations for Inputs ---
  const pvConfig = useMemo(() => {
    return currency === 'COP'
      ? { min: 0, max: 1000000000, step: 1000000, label: 'Capital Inicial (COP)' }
      : { min: 0, max: 250000, step: 250, label: 'Capital Inicial (USD)' };
  }, [currency]);

  const pmtConfig = useMemo(() => {
    return currency === 'COP'
      ? { min: 0, max: 50000000, step: 100000, label: 'Aporte Mensual (COP)' }
      : { min: 0, max: 12500, step: 25, label: 'Aporte Mensual (USD)' };
  }, [currency]);

  const yearsConfig = { min: 1, max: 10, step: 1 };

  // --- Dual Synchronized Handlers ---
  const handleInitialAmountText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    setInitialAmount(clean ? parseInt(clean, 10) : 0);
  };

  const handleMonthlyContributionText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    setMonthlyContribution(clean ? parseInt(clean, 10) : 0);
  };

  const handleYearsText = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '');
    let val = clean ? parseInt(clean, 10) : 1;
    if (val > 10) val = 10;
    if (val < 1) val = 1;
    setProjectionYears(val);
  };

  // --- Math Compounding & deflating computation ---
  const cdtDetails = useMemo(() => {
    return calculateCDTTrajectoryDetailed(
      debouncedInitialAmount,
      debouncedMonthlyContribution,
      cdtRate,
      debouncedProjectionYears,
      inflationRate,
      isReal
    );
  }, [debouncedInitialAmount, debouncedMonthlyContribution, cdtRate, debouncedProjectionYears, inflationRate, isReal]);

  // Extract Monte Carlo trajectories
  const scenarios = analysisResponse?.technical_analysis?.scenarios;

  const conservador = useMemo(() => {
    return scenarios?.find(s => s.name.toLowerCase().includes('conservador') || s.name.toLowerCase().includes('p10')) || scenarios?.[0];
  }, [scenarios]);

  const base = useMemo(() => {
    return scenarios?.find(s => s.name.toLowerCase().includes('base') || s.name.toLowerCase().includes('p50') || s.name.toLowerCase().includes('mediana')) || scenarios?.[1];
  }, [scenarios]);

  const optimista = useMemo(() => {
    return scenarios?.find(s => s.name.toLowerCase().includes('optimista') || s.name.toLowerCase().includes('p90')) || scenarios?.[2];
  }, [scenarios]);

  // Merge trajectories for Recharts
  const chartData = useMemo(() => {
    if (!base?.trajectory) return [];
    
    return base.trajectory.map((point, index) => {
      const month = point.month;
      const cdtPoint = cdtDetails.trajectory[index] || cdtDetails.trajectory[cdtDetails.trajectory.length - 1];
      
      const cVal = conservador?.trajectory[index]?.nominal_value ?? 0;
      const bVal = base?.trajectory[index]?.nominal_value ?? 0;
      const oVal = optimista?.trajectory[index]?.nominal_value ?? 0;
      
      const p10 = isReal ? deflateValue(cVal, month, inflationRate) : cVal;
      const p50 = isReal ? deflateValue(bVal, month, inflationRate) : bVal;
      const p90 = isReal ? deflateValue(oVal, month, inflationRate) : oVal;
      const cdt = isReal ? cdtPoint.real_value : cdtPoint.nominal_value;
      
      return {
        month,
        p10,
        p50,
        p90,
        p10_p90: [p10, p90] as [number, number],
        cdt
      };
    });
  }, [conservador, base, optimista, cdtDetails, isReal, inflationRate]);

  // Currency Formatter Helper
  const formatVal = (val: number) => {
    if (currency === 'USD') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    } else {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
  };

  // Custom Chart Y-Axis Formatter
  const formatYAxis = (val: number) => {
    if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
    return `$${val}`;
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-150 rounded-2xl shadow-xl text-left space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mes {label} (Año {(label / 12).toFixed(1)})</p>
          <div className="space-y-1">
            {viewMode !== 'cdt' && (
              <>
                <div className="flex justify-between items-center gap-6">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-400/25 border border-blue-400 block shrink-0" />
                    P90 (Optimista):
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-700">
                    {formatVal(data.p90)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-6 font-semibold">
                  <span className="text-xs text-slate-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-1 bg-blue-600 block shrink-0" />
                    P50 (Base):
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {formatVal(data.p50)}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-6">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-400/25 border border-blue-400 block shrink-0" />
                    P10 (Conservador):
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-700">
                    {formatVal(data.p10)}
                  </span>
                </div>
              </>
            )}
            {viewMode !== 'variable' && (
              <div className={cn(
                "flex justify-between items-center gap-6 font-semibold",
                viewMode === 'compare' && "pt-1.5 border-t border-slate-100"
              )}>
                <span className="text-xs text-slate-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-emerald-500 block shrink-0" />
                  CDT Compuesto:
                </span>
                <span className="text-xs font-bold font-mono text-emerald-600">
                  {formatVal(data.cdt)}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Determine the winner (Asset Median vs CDT final value)
  const assetFinalMedian = useMemo(() => {
    if (!base?.trajectory) return 0;
    const finalPoint = base.trajectory[base.trajectory.length - 1];
    const val = finalPoint?.nominal_value || 0;
    return isReal ? deflateValue(val, base.trajectory.length - 1, inflationRate) : val;
  }, [base, isReal, inflationRate]);

  const cdtFinalValue = useMemo(() => {
    return isReal ? cdtDetails.finalRealValue : cdtDetails.finalNominalValue;
  }, [cdtDetails, isReal]);

  const winner = useMemo(() => {
    return assetFinalMedian > cdtFinalValue ? 'asset' : 'cdt';
  }, [assetFinalMedian, cdtFinalValue]);

  const winningMargin = useMemo(() => {
    return Math.abs(assetFinalMedian - cdtFinalValue);
  }, [assetFinalMedian, cdtFinalValue]);

  const marginPct = useMemo(() => {
    const lower = Math.min(assetFinalMedian, cdtFinalValue);
    return lower > 0 ? (winningMargin / lower) * 100 : 0;
  }, [assetFinalMedian, cdtFinalValue, winningMargin]);

  // Keep a stable reference to the last settled comparison so the banner doesn't
  // flip mid-flight while either query is still in-flight.
  const lastSettledWinner = useRef<'asset' | 'cdt'>(winner);
  const lastSettledMargin = useRef<number>(winningMargin);
  const lastSettledMarginPct = useRef<number>(marginPct);

  if (!isComparisonLoading) {
    lastSettledWinner.current = winner;
    lastSettledMargin.current = winningMargin;
    lastSettledMarginPct.current = marginPct;
  }

  const displayWinner = lastSettledWinner.current;
  const displayMargin = lastSettledMargin.current;
  const displayMarginPct = lastSettledMarginPct.current;

  return (
    <div className="space-y-8 pb-20">
      {/* --- Header Section --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif text-primary tracking-tight">Simulador de Escenarios</h2>
          <p className="text-sm text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Compara trayectorias estocásticas de renta variable frente a la renta fija compounded.
            Deduce impuestos de CDT (Retención en la Fuente del 7%) y ajusta por inflación (Fisher).
          </p>
        </div>

        {/* --- Quick Toggles --- */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Nominal vs Real Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200/50 shadow-inner">
            <button
              onClick={() => setIsReal(false)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                !isReal ? "bg-white text-primary shadow-sm border border-slate-200/30" : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
              )}
            >
              Nominal
            </button>
            <button
              onClick={() => setIsReal(true)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                isReal ? "bg-white text-primary shadow-sm border border-slate-200/30" : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
              )}
            >
              Real (Fisher)
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200/50 shadow-inner">
            <button
              onClick={() => handleCurrencyChange('COP')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                currency === 'COP' ? "bg-white text-primary shadow-sm border border-slate-200/30" : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
              )}
            >
              COP
            </button>
            <button
              onClick={() => handleCurrencyChange('USD')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                currency === 'USD' ? "bg-white text-primary shadow-sm border border-slate-200/30" : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
              )}
            >
              USD
            </button>
          </div>
        </div>
      </div>

      {/* --- Two-Column Layout --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- Left Column: Controls (inputs/sliders) --- */}
        <div className="col-span-1 space-y-6">
          <div className="p-8 bg-white border border-slate-100 rounded-[32px] shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <Scale size={16} className="text-primary" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Configuración</h4>
            </div>

            {/* View Mode Segmented Control */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner w-full">
              <button
                type="button"
                onClick={() => setViewMode('compare')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center",
                  viewMode === 'compare'
                    ? "bg-white text-primary shadow-sm border border-slate-200/30"
                    : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
                )}
              >
                Comparar
              </button>
              <button
                type="button"
                onClick={() => setViewMode('variable')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center",
                  viewMode === 'variable'
                    ? "bg-white text-primary shadow-sm border border-slate-200/30"
                    : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
                )}
              >
                Solo Renta Variable
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cdt')}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all text-center",
                  viewMode === 'cdt'
                    ? "bg-white text-primary shadow-sm border border-slate-200/30"
                    : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
                )}
              >
                Solo CDT
              </button>
            </div>

            {/* Variable Asset Selection Dropdown */}
            {viewMode !== 'cdt' && (
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Activo Variable
                </label>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-left flex justify-between items-center text-sm font-bold text-primary hover:bg-slate-100/50 transition-all cursor-pointer"
                >
                  <div className="truncate pr-4">
                    <span className="font-mono font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-lg mr-2">
                      {selectedAsset.ticker}
                    </span>
                    <span className="text-slate-600 font-normal text-xs">{selectedAsset.name}</span>
                  </div>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform duration-200 shrink-0', isAssetDropdownOpen ? 'rotate-180' : 'rotate-0')} />
                </button>

                {/* Asset Dropdown List */}
                <AnimatePresence>
                  {isAssetDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsAssetDropdownOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 z-30 flex flex-col gap-3 max-h-80 overflow-hidden animate-none"
                      >
                        <input
                          type="text"
                          placeholder="Buscar activo..."
                          value={assetSearch}
                          onChange={e => setAssetSearch(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-primary/50 transition-all"
                        />
                        <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1 max-h-52">
                          {filteredAssets.map(asset => {
                            const isCurrent = asset.ticker === ticker;
                            return (
                              <div
                                key={asset.ticker}
                                onClick={() => {
                                  setTicker(asset.ticker);
                                  setIsAssetDropdownOpen(false);
                                  setAssetSearch('');
                                }}
                                className={cn(
                                  'px-3 py-2.5 rounded-xl cursor-pointer flex justify-between items-center transition-all',
                                  isCurrent ? 'bg-primary text-white font-bold' : 'hover:bg-slate-50 text-primary'
                                )}
                              >
                                <div className="truncate pr-2">
                                  <span className={cn('font-mono font-bold text-xs px-2 py-0.5 rounded-md mr-2', isCurrent ? 'bg-white/10' : 'bg-slate-100 text-slate-700')}>{asset.ticker}</span>
                                  <span className={cn('text-xs font-normal', isCurrent ? 'text-white/80' : 'text-slate-500')}>{asset.name}</span>
                                </div>
                                <span className={cn(
                                  'px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0',
                                  isCurrent ? 'bg-white/10 text-white' : (asset.type === 'etf' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700')
                                )}>
                                  {asset.type}
                                </span>
                              </div>
                            );
                          })}
                          {filteredAssets.length === 0 && (
                            <div className="p-4 text-xs text-center text-slate-400">No se encontraron activos</div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* PV input + slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {pvConfig.label}
                </label>
                <input
                  type="text"
                  value={initialAmount ? initialAmount.toLocaleString('es-CO') : '0'}
                  onChange={handleInitialAmountText}
                  className="w-32 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-right text-xs font-bold font-mono text-primary outline-none focus:border-primary/30"
                />
              </div>
              <input
                type="range"
                min={pvConfig.min}
                max={pvConfig.max}
                step={pvConfig.step}
                value={initialAmount}
                onChange={e => setInitialAmount(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono font-semibold px-1">
                <span>{formatVal(pvConfig.min)}</span>
                <span>{formatVal(pvConfig.max)}</span>
              </div>
            </div>

            {/* PMT input + slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {pmtConfig.label}
                </label>
                <input
                  type="text"
                  value={monthlyContribution ? monthlyContribution.toLocaleString('es-CO') : '0'}
                  onChange={handleMonthlyContributionText}
                  className="w-32 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-right text-xs font-bold font-mono text-primary outline-none focus:border-primary/30"
                />
              </div>
              <input
                type="range"
                min={pmtConfig.min}
                max={pmtConfig.max}
                step={pmtConfig.step}
                value={monthlyContribution}
                onChange={e => setMonthlyContribution(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono font-semibold px-1">
                <span>{formatVal(pmtConfig.min)}</span>
                <span>{formatVal(pmtConfig.max)}</span>
              </div>
            </div>

            {/* Years input + slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Años de Proyección
                </label>
                <input
                  type="text"
                  value={projectionYears}
                  onChange={handleYearsText}
                  className="w-14 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-right text-xs font-bold font-mono text-primary outline-none focus:border-primary/30"
                />
              </div>
              <input
                type="range"
                min={yearsConfig.min}
                max={yearsConfig.max}
                step={yearsConfig.step}
                value={projectionYears}
                onChange={e => setProjectionYears(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono font-semibold px-1">
                <span>{yearsConfig.min} Año</span>
                <span>{yearsConfig.max} Años</span>
              </div>
            </div>

            {/* CDT Settings Section */}
            {viewMode !== 'variable' && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1">
                  <Wallet size={12} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Renta Fija (CDT)</span>
                </div>

                {/* CDT Institution Selection Dropdown */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                    Institución CDT
                  </label>
                  
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsCDTDropdownOpen(!isCDTDropdownOpen)}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-left flex justify-between items-center text-sm font-bold text-primary hover:bg-slate-100/50 transition-all cursor-pointer"
                  >
                    <div className="truncate pr-4">
                      {selectedInstitutionId === 'best' && (
                        <>
                          <span className="font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg mr-2 text-xs">
                            Auto
                          </span>
                          <span className="text-slate-600 font-normal text-xs">
                            Mejor CDT ({bestCDTResponse?.data?.cdt?.institution?.name || 'Cargando...'})
                          </span>
                        </>
                      )}
                      {selectedInstitutionId === 'custom' && (
                        <>
                          <span className="font-mono font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg mr-2 text-xs">
                            Custom
                          </span>
                          <span className="text-slate-600 font-normal text-xs">Tasa Personalizada</span>
                        </>
                      )}
                      {typeof selectedInstitutionId === 'number' && selectedCDT && (
                        <>
                          <span className="font-mono font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-lg mr-2 text-xs">
                            {selectedCDT.tasa_ea.toFixed(2)}%
                          </span>
                          <span className="text-slate-600 font-normal text-xs">
                            {selectedCDT.institution?.name}
                          </span>
                        </>
                      )}
                    </div>
                    <ChevronDown size={16} className={cn('text-slate-400 transition-transform duration-200 shrink-0', isCDTDropdownOpen ? 'rotate-180' : 'rotate-0')} />
                  </button>

                  {/* CDT Dropdown List */}
                  <AnimatePresence>
                    {isCDTDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setIsCDTDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          transition={{ duration: 0.15, ease: 'easeOut' }}
                          className="absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl p-4 z-30 flex flex-col gap-2 max-h-80 overflow-hidden animate-none"
                        >
                          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-1 max-h-72">
                            {/* Option: Mejor CDT */}
                            <div
                              onClick={() => handleSelectInstitution('best')}
                              className={cn(
                                'px-3 py-2.5 rounded-xl cursor-pointer flex justify-between items-center transition-all',
                                selectedInstitutionId === 'best' ? 'bg-primary text-white font-bold' : 'hover:bg-slate-50 text-primary'
                              )}
                            >
                              <div className="truncate pr-2">
                                <span className={cn('font-mono font-bold text-xs px-2 py-0.5 rounded-md mr-2', selectedInstitutionId === 'best' ? 'bg-white/10' : 'bg-emerald-50 text-emerald-700')}>Auto</span>
                                <span className={cn('text-xs font-normal', selectedInstitutionId === 'best' ? 'text-white/80' : 'text-slate-500')}>Mejor CDT ({bestCDTRate.toFixed(2)}% E.A.)</span>
                              </div>
                            </div>

                            {/* Option: Custom (only show if it is the current selection) */}
                            {selectedInstitutionId === 'custom' && (
                              <div
                                className="px-3 py-2.5 rounded-xl flex justify-between items-center bg-primary text-white font-bold"
                              >
                                <div className="truncate pr-2">
                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md mr-2 bg-white/10">Custom</span>
                                  <span className="text-xs font-normal text-white/80">Tasa Personalizada ({cdtRate.toFixed(2)}% E.A.)</span>
                                </div>
                              </div>
                            )}

                            {/* Divider */}
                            <div className="h-px bg-slate-100 my-1" />

                            {/* List of specific banks */}
                            {uniqueInstitutions.map(item => {
                              const isCurrent = selectedInstitutionId === item.institution.id;
                              return (
                                <div
                                  key={item.institution.id}
                                  onClick={() => handleSelectInstitution(item.institution.id)}
                                  className={cn(
                                    'px-3 py-2.5 rounded-xl cursor-pointer flex justify-between items-center transition-all',
                                    isCurrent ? 'bg-primary text-white font-bold' : 'hover:bg-slate-50 text-primary'
                                  )}
                                >
                                  <div className="truncate pr-2 flex flex-col">
                                    <span className={cn('text-xs font-bold', isCurrent ? 'text-white' : 'text-slate-700')}>{item.institution.name}</span>
                                    <span className={cn('text-[9px] font-normal mt-0.5', isCurrent ? 'text-white/70' : 'text-slate-400')}>
                                      Monto Mín: {formatVal(item.cdt.monto_min)}
                                    </span>
                                  </div>
                                  <span className={cn(
                                    'px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shrink-0',
                                    isCurrent ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                                  )}>
                                    {item.cdt.tasa_ea.toFixed(2)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* CDT Rate override input */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Tasa CDT E.A. Override
                      </label>
                      <span className="text-[9px] text-slate-400 leading-normal block">
                        Ingresa una tasa personalizada manual
                      </span>
                    </div>
                    <div className="relative w-28">
                      <input
                        type="text"
                        placeholder={bestCDTRate.toFixed(2)}
                        value={overrideCDT}
                        onChange={handleOverrideCDTChange}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-right text-xs font-bold font-mono text-primary outline-none focus:border-primary/30"
                      />
                      <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">%</span>
                    </div>
                  </div>
                </div>

                {/* Warning Banner */}
                {hasMinInvestmentWarning && selectedCDT && (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        Monto menor al mínimo requerido
                      </p>
                      <p className="text-xs text-amber-700 leading-normal font-medium">
                        El capital inicial ({formatVal(initialAmount)}) es inferior al monto mínimo requerido por <strong>{selectedCDT.institution?.name}</strong> ({formatVal(selectedCDT.monto_min)}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* --- Right Column: Output / Projections fan --- */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          {showGeneralError ? (
            <div className="p-8 bg-rose-50/50 border border-rose-100 rounded-[32px] flex flex-col items-center justify-center text-center min-h-[400px] gap-4">
              <AlertTriangle className="text-rose-500 shrink-0" size={48} />
              <div>
                <h4 className="text-lg font-serif font-bold text-rose-800">Error de Sincronización de Datos</h4>
                <p className="text-xs text-rose-600 max-w-md leading-relaxed mt-2">
                  {hasAssetError && hasCdtError 
                    ? 'No se pudieron recuperar los datos históricos de renta variable ni las tasas de CDT de la API. Por favor, verifica tu conexión.'
                    : hasAssetError 
                      ? `No se pudieron cargar las proyecciones para ${ticker}. Asegúrate de que el backend esté corriendo y de que el activo tenga suficientes precios históricos.`
                      : 'No se pudieron obtener las tasas de CDT de la API. Podés ingresar una tasa personalizada manualmente en la barra lateral para continuar.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Winner Banner — skeleton on first load to avoid CDT flash while analysis is pending */}
              {viewMode === 'compare' && (
            isInitialLoad ? (
              <div className="p-6 rounded-[32px] border border-slate-100 bg-slate-50/50 shadow-sm animate-pulse flex flex-col md:flex-row justify-between items-start md:items-center gap-6 min-h-[96px]">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-2.5 w-28 bg-slate-200 rounded-full" />
                    <div className="h-5 w-64 bg-slate-200 rounded-full" />
                    <div className="h-2 w-80 bg-slate-150 rounded-full" />
                  </div>
                </div>
                <div className="space-y-1.5 shrink-0">
                  <div className="h-2 w-24 bg-slate-200 rounded-full" />
                  <div className="h-6 w-32 bg-slate-200 rounded-full" />
                </div>
              </div>
            ) : (
              <div className={cn(
                "p-6 rounded-[32px] border shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-500",
                isComparisonLoading ? "opacity-70" : "opacity-100",
                displayWinner === 'cdt' ? "bg-emerald-50/50 border-emerald-100" : "bg-blue-50/50 border-blue-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner shrink-0",
                    displayWinner === 'cdt' ? "bg-emerald-500 text-white border-emerald-600" : "bg-primary text-white border-slate-800"
                  )}>
                    {displayWinner === 'cdt' ? <Award size={24} /> : <Zap size={24} />}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Predicción de Modelo</span>
                    <h3 className="text-xl font-serif font-bold text-primary mt-0.5">
                      Estrategia Favorita: {displayWinner === 'cdt' ? 'Renta Fija (CDT)' : `${ticker} (Renta Variable)`}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      La trayectoria {displayWinner === 'cdt' ? 'del CDT compuesto' : `esperada (mediana P50) de ${ticker}`} supera a su contraparte por <strong className="text-slate-700">{formatVal(displayMargin)}</strong> (+{displayMarginPct.toFixed(2)}%).
                    </p>
                  </div>
                </div>

                <div className="text-left md:text-right shrink-0">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Diferencia Proyectada</span>
                  <p className={cn(
                    "text-xl font-mono font-bold",
                    displayWinner === 'cdt' ? "text-emerald-600" : "text-blue-600"
                  )}>
                    + {formatVal(displayMargin)}
                  </p>
                </div>
              </div>
            )
          )}

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isInitialLoad ? (
              <>
                {/* Renta Variable Card Skeleton */}
                {viewMode !== 'cdt' && (
                  <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[28px] shadow-sm animate-pulse min-h-[148px] flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2 w-24 bg-slate-200 rounded-full" />
                        <div className="h-1.5 w-16 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-4">
                      <div className="h-2 w-40 bg-slate-200 rounded-full" />
                      <div className="h-6 w-32 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                )}
                {/* CDT Card Skeleton */}
                {viewMode !== 'variable' && (
                  <div className="bg-slate-50/50 border border-slate-100 p-6 rounded-[28px] shadow-sm animate-pulse min-h-[148px] flex flex-col justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2 w-24 bg-slate-200 rounded-full" />
                        <div className="h-1.5 w-16 bg-slate-200 rounded-full" />
                      </div>
                    </div>
                    <div className="space-y-1.5 mt-4">
                      <div className="h-2 w-40 bg-slate-200 rounded-full" />
                      <div className="h-6 w-32 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Variable Asset Card */}
                {viewMode !== 'cdt' && (
                  <div className={cn(
                    "bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between",
                    viewMode === 'variable' ? "md:col-span-2 md:grid md:grid-cols-3 md:gap-6 md:items-center" : "space-y-4"
                  )}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                        <TrendingUp size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Renta Variable ({ticker})
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5 max-w-[200px] truncate" title={selectedAsset.name}>
                          {selectedAsset.name}
                        </span>
                      </div>
                    </div>

                    {/* Main Value */}
                    <div className={cn(
                      "space-y-1",
                      viewMode === 'variable' && "md:border-l md:border-r md:border-slate-100 md:px-6"
                    )}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Capital Final Estimado (Mediana P50)
                      </span>
                      <p className="text-3xl font-mono font-bold text-primary tracking-tighter">
                        {formatVal(assetFinalMedian)}
                      </p>
                    </div>

                    {/* Secondary Values */}
                    <div className={cn(
                      "grid grid-cols-2 gap-4 text-[10px] text-slate-500 uppercase font-bold",
                      viewMode === 'variable' 
                        ? "md:grid-cols-1 md:gap-3 md:pl-6" 
                        : "pt-4 border-t border-slate-55"
                    )}>
                      <div>
                        <span className="text-slate-400 block text-[8px] tracking-wider">Escenario Optimista (P90)</span>
                        <span className="text-blue-600 font-mono text-xs">
                          {formatVal(chartData[chartData.length - 1]?.p90 || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] tracking-wider">Escenario Conservador (P10)</span>
                        <span className="text-slate-600 font-mono text-xs">
                          {formatVal(chartData[chartData.length - 1]?.p10 || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CDT Compound Card */}
                {viewMode !== 'variable' && (
                  <div className={cn(
                    "bg-white border border-slate-100 p-6 rounded-[28px] shadow-sm relative overflow-hidden flex flex-col justify-between",
                    viewMode === 'cdt' ? "md:col-span-2 md:grid md:grid-cols-3 md:gap-6 md:items-center" : "space-y-4"
                  )}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                        <Wallet size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Renta Fija Compuesta (CDT)
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-0.5 max-w-[200px] truncate" title={selectedInstitutionId === 'best' ? 'Mejor CDT' : 'CDT'}>
                          {selectedInstitutionId === 'best' && `Mejor CDT disponible (${bestCDTResponse?.data?.cdt?.institution?.name || 'Automático'}): ${cdtRate.toFixed(2)}% E.A.`}
                          {selectedInstitutionId === 'custom' && `Tasa Personalizada: ${cdtRate.toFixed(2)}% E.A.`}
                          {typeof selectedInstitutionId === 'number' && `${selectedCDT?.institution?.name || 'Banco Seleccionado'}: ${cdtRate.toFixed(2)}% E.A.`}
                        </span>
                      </div>
                    </div>

                    {/* Main Value */}
                    <div className={cn(
                      "space-y-1",
                      viewMode === 'cdt' && "md:border-l md:border-r md:border-slate-100 md:px-6"
                    )}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                        Capital Final Acumulado
                      </span>
                      <p className="text-3xl font-mono font-bold text-primary tracking-tighter">
                        {formatVal(cdtFinalValue)}
                      </p>
                    </div>

                    {/* Secondary Values */}
                    <div className={cn(
                      "grid grid-cols-2 gap-4 text-[10px] text-slate-500 uppercase font-bold",
                      viewMode === 'cdt' 
                        ? "md:grid-cols-1 md:gap-3 md:pl-6" 
                        : "pt-4 border-t border-slate-55"
                    )}>
                      <div>
                        <span className="text-slate-400 block text-[8px] tracking-wider">Intereses Brutos</span>
                        <span className="text-slate-600 font-mono text-xs">
                          {formatVal(isReal ? deflateValue(cdtDetails.totalInterestGross, projectionYears * 12, inflationRate) : cdtDetails.totalInterestGross)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] tracking-wider" title="Retención en la Fuente del 7% sobre rendimientos anuales">Retención Deducida</span>
                        <span className="text-rose-500 font-mono text-xs">
                          {formatVal(isReal ? deflateValue(cdtDetails.totalTaxesDeducted, projectionYears * 12, inflationRate) : cdtDetails.totalTaxesDeducted)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Area Chart Projection Fan */}
          <div className="bg-white rounded-[32px] p-6 md:p-8 border border-slate-100 shadow-sm flex flex-col min-h-[480px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-primary to-emerald-400" />
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest">
                  Trayectorias de Capital a Futuro
                </h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1 font-semibold">
                  Abanico Probabilístico (MBG Monte Carlo) vs CDT compounded ({isReal ? 'Valores Reales' : 'Valores Nominales'})
                </p>
              </div>
              {loadingAnalysis && (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-slate-200 border-t-primary rounded-full"
                  />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Calculando Monte Carlo...</span>
                </div>
              )}
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              {analysisError ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-rose-50/50 rounded-2xl border border-rose-100 border-dashed">
                  <AlertTriangle className="text-rose-500 mb-3" size={32} />
                  <h5 className="text-sm font-bold text-rose-800">Error cargando proyecciones</h5>
                  <p className="text-xs text-rose-600 mt-1 max-w-sm">
                    {analysisError.message || 'El API no devolvió datos para este activo. Revisa que tenga precios históricos suficientes.'}
                  </p>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/60 rounded-2xl animate-pulse">
                  <Activity className="text-slate-300 mb-3" size={32} />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Preparando Gráfico...</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorP10P90" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94A3B8" 
                      tickLine={false}
                      tickFormatter={(m) => m === 0 ? 'T0' : `M${m}`}
                      style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}
                    />
                    <YAxis 
                      stroke="#94A3B8" 
                      tickLine={false}
                      tickFormatter={formatYAxis}
                      style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    />
                    
                    {/* Probabilistic Area (P10-P90) */}
                    {viewMode !== 'cdt' && (
                      <Area 
                        type="monotone" 
                        dataKey="p10_p90" 
                        stroke="none" 
                        fill="url(#colorP10P90)" 
                        name="Rango Probabilístico P10 - P90" 
                      />
                    )}

                    {/* Median Line (P50) */}
                    {viewMode !== 'cdt' && (
                      <Line 
                        type="monotone" 
                        dataKey="p50" 
                        stroke="#1E293B" 
                        strokeWidth={3} 
                        dot={false} 
                        name={`${ticker} Esperado (P50)`} 
                      />
                    )}

                    {/* CDT Line */}
                    {viewMode !== 'variable' && (
                      <Line 
                        type="monotone" 
                        dataKey="cdt" 
                        stroke="#10B981" 
                        strokeWidth={3} 
                        dot={false} 
                        name="CDT Compuesto Neto" 
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Caja de Cristal Educational details */}
          <AnimatePresence>
            {isReal && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 shadow-inner">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                    <BookOpen size={18} className="text-primary" />
                    <h4 className="text-xs font-bold text-primary uppercase tracking-widest">
                      Caja de Cristal Educativa: Compounding y Ecuación de Fisher
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Ecuación de Fisher (Deflación de Capital)
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Para calcular el valor real del capital (descontando el poder adquisitivo perdido por la inflación), aplicamos la ecuación exacta de Irving Fisher de forma compuesta mes a mes:
                        </p>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 mt-2 font-mono text-[11px] font-bold text-slate-700">
                          V_real(t) = V_nominal(t) / (1 + i)^(t / 12)
                        </div>
                        <span className="block text-[9px] text-slate-400 mt-1">
                          * Tasa de inflación de referencia anual ({currency}): <strong className="text-slate-600">{inflationRate}%</strong> (DANE COP / Fed USD).
                        </span>
                      </div>

                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Retención en la Fuente del CDT (Art. 395 E.T.)
                        </h5>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          La renta fija en Colombia devenga interés mensualmente, pero el impuesto de **Retención en la Fuente del 7%** sobre intereses brutos se causa y se descuenta al finalizar cada ciclo de 12 meses (anual). Solo el interés neto restante se capitaliza.
                        </p>
                        <div className="bg-white p-3 rounded-lg border border-slate-100 mt-2 font-mono text-[11px] font-bold text-slate-700">
                          Si Mes % 12 == 0: Saldo = Saldo - (Interés_Anual_Bruto * 0.07)
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Fórmulas Utilizadas en esta Simulación
                        </h5>
                        <div className="space-y-2.5">
                          <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-bold text-primary uppercase mb-1">Capitalización Mensual CDT</p>
                            <code className="text-[10px] font-mono block text-slate-600 font-bold overflow-x-auto">
                              Tasa_Mensual = (1 + Tasa_EA)^(1 / 12) - 1
                            </code>
                          </div>
                          <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                            <p className="text-[9px] font-bold text-primary uppercase mb-1">Ecuación de Fisher (Tasa Real)</p>
                            <code className="text-[10px] font-mono block text-slate-600 font-bold overflow-x-auto">
                              r_real = ((1 + r_nominal) / (1 + i)) - 1
                            </code>
                          </div>
                          {analysisResponse?.education?.formulas_usage && (
                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                              <p className="text-[9px] font-bold text-primary uppercase mb-1">Proyección Monte Carlo (MBG)</p>
                              <code className="text-[10px] font-mono block text-slate-600 font-bold overflow-x-auto whitespace-pre-wrap">
                                S_t = S_(t-1) * e^((μ - σ^2/2)Δt + σ*ε*√Δt)
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-[9px] text-slate-400 leading-relaxed italic bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      * Descargo de responsabilidad: Cifra es una plataforma estrictamente educativa. Esta simulación no constituye consejo, asesoría ni sugerencia formal de inversión.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScenarioSimulator;
