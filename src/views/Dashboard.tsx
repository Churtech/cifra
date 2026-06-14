import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  ArrowUpRight, 
  Award, 
  Shield, 
  Zap, 
  BookOpen, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { useDashboardSummary, useAssets, useAssetDetail } from '../hooks/useFinance';
import { formatCurrency, isValidNumber, cn } from '../lib/utils';
import { AssetDetail, HistoryPoint } from '../types';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface DashboardProps {
  onViewChange?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { data: summaryResponse, isLoading: loadingSummary } = useDashboardSummary();
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets({ type: 'etf' });
  const { data: spyDetailResponse, isLoading: loadingSpy } = useAssetDetail('SPY');

  const spyDetail = spyDetailResponse?.data;
  const assets = assetsResponse?.data || [];

  const [activeHighlightTab, setActiveHighlightTab] = useState<'etf' | 'stock'>('etf');
  const [expandedGrowthIdx, setExpandedGrowthIdx] = useState<number | null>(0);
  const [expandedEfficiencyIdx, setExpandedEfficiencyIdx] = useState<number | null>(0);
  const [expandedStabilityIdx, setExpandedStabilityIdx] = useState<number | null>(0);

  const loadingCDT = loadingSummary;
  const loadingMetrics = loadingSummary;
  const loadingHighlights = loadingSummary;
  const loadingHistory = loadingSummary;

  const metrics = summaryResponse?.market_metrics;
  const highlights = summaryResponse?.asset_highlights;
  const assetHistories = summaryResponse?.asset_histories || [];

  const etfHighlights = useMemo(() => {
    if (!highlights) return null;
    return {
      growth: highlights.growth.filter(h => h.asset?.asset?.type === 'etf'),
      efficiency: highlights.efficiency.filter(h => h.asset?.asset?.type === 'etf'),
      stability: highlights.stability.filter(h => h.asset?.asset?.type === 'etf'),
    };
  }, [highlights]);

  const stockHighlights = useMemo(() => {
    if (!highlights) return null;
    return {
      growth: highlights.growth.filter(h => h.asset?.asset?.type === 'stock'),
      efficiency: highlights.efficiency.filter(h => h.asset?.asset?.type === 'stock'),
      stability: highlights.stability.filter(h => h.asset?.asset?.type === 'stock'),
    };
  }, [highlights]);

  const currentHighlights = activeHighlightTab === 'etf' ? etfHighlights : stockHighlights;

  // Best CDT metrics extracted from consolidated MarketMetrics
  const bestCDTValue = metrics?.best_cdt_rate;
  const bestCDTEntity = metrics?.best_cdt_entity;
  const trmMetrics = undefined; // TRM metrics already present in metrics via trm_current/trm_change_7d

  // Obtener histórico real del mejor ETF para la trayectoria
  const topAssetTicker = assets.length > 0 ? assets[0]?.asset?.ticker : '';
  const history = useMemo(() => {
    if (!topAssetTicker) return [];
    const found = assetHistories.find(h => h.asset?.ticker === topAssetTicker);
    if (found) {
      if (found.history.length > 30) {
        return found.history.slice(-30);
      }
      return found.history;
    }
    // Fallback: find any etf history with 30 points
    const fallback = assetHistories.find(h => h.asset?.type === 'etf');
    return fallback ? fallback.history : [];
  }, [topAssetTicker, assetHistories]);

  // Tickers for each category to lookup in consolidated histories
  const eg0t = etfHighlights?.growth?.[0]?.asset?.asset?.ticker || '';
  const eg1t = etfHighlights?.growth?.[1]?.asset?.asset?.ticker || '';
  const eg2t = etfHighlights?.growth?.[2]?.asset?.asset?.ticker || '';
  const ee0t = etfHighlights?.efficiency?.[0]?.asset?.asset?.ticker || '';
  const ee1t = etfHighlights?.efficiency?.[1]?.asset?.asset?.ticker || '';
  const ee2t = etfHighlights?.efficiency?.[2]?.asset?.asset?.ticker || '';
  const es0t = etfHighlights?.stability?.[0]?.asset?.asset?.ticker || '';
  const es1t = etfHighlights?.stability?.[1]?.asset?.asset?.ticker || '';
  const es2t = etfHighlights?.stability?.[2]?.asset?.asset?.ticker || '';

  const sg0t = stockHighlights?.growth?.[0]?.asset?.asset?.ticker || '';
  const sg1t = stockHighlights?.growth?.[1]?.asset?.asset?.ticker || '';
  const sg2t = stockHighlights?.growth?.[2]?.asset?.asset?.ticker || '';
  const se0t = stockHighlights?.efficiency?.[0]?.asset?.asset?.ticker || '';
  const se1t = stockHighlights?.efficiency?.[1]?.asset?.asset?.ticker || '';
  const se2t = stockHighlights?.efficiency?.[2]?.asset?.asset?.ticker || '';
  const ss0t = stockHighlights?.stability?.[0]?.asset?.asset?.ticker || '';
  const ss1t = stockHighlights?.stability?.[1]?.asset?.asset?.ticker || '';
  const ss2t = stockHighlights?.stability?.[2]?.asset?.asset?.ticker || '';

  const getHistoryForTicker = (ticker: string) => {
    if (!ticker) return [];
    const found = assetHistories.find(h => h.asset?.ticker === ticker);
    return found ? found.history : [];
  };

  const activeGrowthHistories = useMemo(() => {
    return activeHighlightTab === 'etf'
      ? [getHistoryForTicker(eg0t), getHistoryForTicker(eg1t), getHistoryForTicker(eg2t)]
      : [getHistoryForTicker(sg0t), getHistoryForTicker(sg1t), getHistoryForTicker(sg2t)];
  }, [activeHighlightTab, eg0t, eg1t, eg2t, sg0t, sg1t, sg2t, assetHistories]);

  const activeEfficiencyHistories = useMemo(() => {
    return activeHighlightTab === 'etf'
      ? [getHistoryForTicker(ee0t), getHistoryForTicker(ee1t), getHistoryForTicker(ee2t)]
      : [getHistoryForTicker(se0t), getHistoryForTicker(se1t), getHistoryForTicker(se2t)];
  }, [activeHighlightTab, ee0t, ee1t, ee2t, se0t, se1t, se2t, assetHistories]);

  const activeStabilityHistories = useMemo(() => {
    return activeHighlightTab === 'etf'
      ? [getHistoryForTicker(es0t), getHistoryForTicker(es1t), getHistoryForTicker(es2t)]
      : [getHistoryForTicker(ss0t), getHistoryForTicker(ss1t), getHistoryForTicker(ss2t)];
  }, [activeHighlightTab, es0t, es1t, es2t, ss0t, ss1t, ss2t, assetHistories]);

  // Construye la opción ECharts para la mini-gráfica de 3 líneas dentro de cada card
  const buildCardChartOption = (
    histories: HistoryPoint[][],
    tickers: string[],
    colors: string[],
    activeIndex: number | null = null
  ) => {
    const allDates = Array.from(new Set(
      histories.flatMap(h => h.map(p => p.date))
    )).sort();

    if (allDates.length === 0) return null;

    const labels = allDates.map(d =>
      new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    );

    const buildSeries = (hist: HistoryPoint[], ticker: string, color: string, index: number) => {
      if (hist.length === 0) return null;
      const isActive = activeIndex === null || activeIndex === index;
      const lineOpacity = isActive ? 1 : 0.12;
      const areaOpacity = isActive ? 1 : 0.04;
      const lineWidth = isActive && activeIndex !== null ? 3 : 2.5;

      const firstClose = hist[0].close || 1;
      const priceMap = new Map<string, number>();
      hist.forEach(p => {
        const v = p.normalized_price !== undefined
          ? p.normalized_price
          : (p.close / firstClose) * 100;
        priceMap.set(p.date, v);
      });
      let last = 100;
      const data = allDates.map(d => {
        if (priceMap.has(d)) last = priceMap.get(d)!;
        return Number(last.toFixed(2));
      });
      return {
        name: ticker,
        type: 'line',
        smooth: true,
        symbol: 'none',
        data,
        lineStyle: { width: lineWidth, color, opacity: lineOpacity },
        itemStyle: { color, opacity: lineOpacity },
        areaStyle: {
          opacity: areaOpacity,
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '55' },
              { offset: 1, color: color + '00' }
            ]
          }
        }
      };
    };

    const series = histories
      .map((h, i) => buildSeries(h, tickers[i] || `#${i + 1}`, colors[i], i))
      .filter(Boolean);

    if (series.length === 0) return null;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.97)',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        padding: [6, 10],
        textStyle: { fontSize: 10, color: '#111827', fontFamily: 'Inter' },
        formatter: (params: any) => {
          let r = `<div style="font-size:9px;font-weight:800;color:#94a3b8;margin-bottom:4px;text-transform:uppercase">${params[0].name}</div>`;
          params.forEach((p: any) => {
            r += `<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:2px"><span style="font-size:10px;color:#64748b">${p.marker}${p.seriesName}</span><strong style="font-size:10px;color:#1e293b">${p.value.toFixed(2)}</strong></div>`;
          });
          return r;
        }
      },
      grid: { left: 4, right: 4, top: 6, bottom: 4, containLabel: false },
      xAxis: { type: 'category', show: false, data: labels, boundaryGap: false },
      yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
      series
    };
  };

  const currentTRM = trmMetrics?.current || metrics?.trm_current;
  const trmChange = trmMetrics?.change_7d || metrics?.trm_change_7d;
  const inflation = metrics?.inflation_rate;

  const trmHigh = metrics?.trm_high_52w;
  const trmLow = metrics?.trm_low_52w;

  // Cálculo de trayectorias normalizadas (Base 100 vs Base 100)
  const chartData = useMemo(() => {
    const hasHistory = history.length > 0;
    const hasCDT = isValidNumber(bestCDTValue);
    
    // Si no hay datos, devolvemos series vacías
    if (!hasHistory && !hasCDT) return { cdt: [], etf: [], dates: [] };

    // Usar las fechas del historial como eje X
    const dates = hasHistory 
      ? history.map(p => new Date(p.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }))
      : ['Hace 30D', 'Hace 15D', 'Hoy'];

    // Trayectoria ETF (Datos reales del backend Base 100)
    // Convertimos a retorno porcentual acumulado para que inicie en 0%
    const etfTrajectory = history.map(p => {
      const val = p.normalized_price || 100;
      return Number((val - 100).toFixed(2));
    });

    // Proyección CDT (Simulada día a día para que coincida con los puntos del ETF)
    let cdtTrajectory: number[] = [];
    if (hasCDT) {
      const rate = bestCDTValue! / 100;
      const dailyRate = Math.pow(1 + rate, 1 / 365) - 1;
      
      cdtTrajectory = dates.map((_, index) => {
        // Asumimos que los puntos son diarios
        return Number(((Math.pow(1 + dailyRate, index) - 1) * 100).toFixed(2));
      });
    }

    return { cdt: cdtTrajectory, etf: etfTrajectory, dates };
  }, [bestCDTValue, history]);

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 11, fontFamily: 'Inter' },
      padding: [8, 12],
      formatter: (params: any) => {
        let res = `<div style="font-weight:800;margin-bottom:6px;font-size:10px;color:#94a3b8;text-transform:uppercase">${params[0].name}</div>`;
        params.forEach((item: any) => {
          res += `<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:2px">
            <span style="font-size:11px;color:#64748b">${item.marker} ${item.seriesName}</span>
            <span style="font-weight:bold;font-size:11px;color:#1e293b">${item.value >= 0 ? '+' : ''}${item.value.toFixed(2)}%</span>
          </div>`;
        });
        return res;
      }
    },
    legend: {
      data: ['Rendimiento CDT', 'Retorno ETF'],
      bottom: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 10, color: '#64748b', fontWeight: 'bold' }
    },
    grid: { left: '2%', right: '4%', bottom: '15%', top: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.dates,
      axisLabel: { 
        fontSize: 9, 
        color: '#94a3b8', 
        fontWeight: 'bold',
        interval: Math.floor(chartData.dates.length / 5) // Mostrar menos etiquetas para evitar overlap
      },
      axisLine: { lineStyle: { color: '#F1F5F9' } },
      axisTick: { show: false }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { 
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: 'bold',
        formatter: '{value}%'
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } }
    },
    series: [
      {
        name: 'Rendimiento CDT',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: chartData.cdt,
        lineStyle: { width: 3, color: '#10B981' },
        itemStyle: { color: '#10B981' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.12)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: false },
          lineStyle: { type: 'solid', color: '#E5E7EB', width: 1, opacity: 0.5 },
          data: [{ xAxis: 0 }]
        }
      },
      {
        name: 'Retorno ETF',
        type: 'line',
        smooth: true,
        symbol: 'none',
        data: chartData.etf,
        lineStyle: { width: 3, color: '#1E293B' },
        itemStyle: { color: '#1E293B' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(30, 41, 59, 0.06)' }, { offset: 1, color: 'rgba(30, 41, 59, 0)' }]
          }
        }
      }
    ]
  };

  const renderHighlightColumn = (
    title: string,
    description: string,
    items: any[] | undefined,
    expandedIdx: number | null,
    setExpandedIdx: (idx: number | null) => void,
    categoryColor: 'emerald' | 'amber' | 'blue',
    categoryIcon: React.ReactNode,
    cardHistories: HistoryPoint[][],
    cardColors: string[]
  ) => {
    // Extraer tickers para la gráfica; activeIndex para el efecto de foco
    const chartTickers = (items || []).slice(0, 3).map((item: any) => item.asset?.asset?.ticker || '');
    const chartOption = buildCardChartOption(cardHistories, chartTickers, cardColors, expandedIdx);

    return (
      <div className={cn(
        "bg-white border rounded-[24px] overflow-hidden",
        categoryColor === 'emerald' && "border-emerald-100",
        categoryColor === 'amber' && "border-amber-100",
        categoryColor === 'blue' && "border-blue-100"
      )}>
        {/* Chart hero — ocupa todo el ancho de la card sin padding lateral */}
        <div className="relative w-full h-[160px]">
          {chartOption ? (
            <ErrorBoundary fallbackMessage="Failed to load chart data. No default data is shown.">
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            </ErrorBoundary>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-slate-50/60 animate-pulse">
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest">Cargando trayectorias...</p>
            </div>
          )}
          {/* Badge de categoría superpuesto arriba-izquierda */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={cn(
              "w-6 h-6 rounded-lg flex items-center justify-center",
              categoryColor === 'emerald' && "bg-emerald-500/90 text-white",
              categoryColor === 'amber' && "bg-amber-500/90 text-white",
              categoryColor === 'blue' && "bg-blue-500/90 text-white"
            )}>
              {categoryIcon}
            </span>
            <span className="text-[8px] font-bold text-white/90 uppercase tracking-widest drop-shadow">{description}</span>
          </div>
        </div>

        {/* Contenido de la card: título + items */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary leading-tight">{title}</h3>
            <p className={cn(
              "text-[8px] font-bold uppercase tracking-widest",
              categoryColor === 'emerald' && 'text-emerald-400',
              categoryColor === 'amber' && 'text-amber-400',
              categoryColor === 'blue' && 'text-blue-400'
            )}>Base 100 · 90D</p>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {loadingHighlights ? (
              [0,1,2].map(i => (
                <div key={i} className="h-14 bg-white border border-slate-100 animate-pulse rounded-2xl" />
              ))
            ) : items && items.length > 0 ? (
              items.slice(0, 3).map((item, idx) => {
                const isExpanded = expandedIdx === idx;
                const asset = item.asset?.asset;
                const metricName = item.metric_name;
                const metricValue = item.metric_value;
                const analysis = item.analysis;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "bg-white border rounded-2xl overflow-hidden transition-all duration-200",
                      isExpanded ? "border-slate-200 shadow-sm" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="w-full text-left p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Dot del color correspondiente a la línea en la gráfica */}
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: cardColors[idx] }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-primary truncate">{asset?.ticker}</span>
                            <span className="text-[8px] font-bold text-slate-400 px-1 bg-slate-50 rounded uppercase shrink-0">{asset?.type === 'etf' ? 'ETF' : 'Acción'}</span>
                          </div>
                          <p className="text-[9px] text-slate-400 truncate max-w-[110px] font-medium leading-none mt-0.5">{asset?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg",
                          categoryColor === 'emerald' && "bg-emerald-50 text-emerald-700",
                          categoryColor === 'amber' && "bg-amber-50 text-amber-700",
                          categoryColor === 'blue' && "bg-blue-50 text-blue-700"
                        )}>
                          {metricValue}
                        </span>
                        {isExpanded ? <ChevronUp size={12} className="text-slate-400" /> : <ChevronDown size={12} className="text-slate-400" />}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-50 bg-slate-50/30 text-[10px] text-slate-500 leading-relaxed font-medium p-3"
                        >
                          <div className="flex items-start gap-2">
                            <BookOpen size={11} className="text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-600 block mb-0.5">{metricName}</span>
                              {analysis}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
                No hay datos disponibles
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight leading-tight'>Panorama del Mercado</h2>
          <div className='flex items-center gap-2 mt-1'>
            <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest text-shadow-sm'>Sincronización Activa</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          label='TRM Actual'
          value={loadingMetrics ? '...' : formatCurrency(currentTRM, 2)}
          change={isValidNumber(trmChange) ? Number(trmChange.toFixed(2)) : undefined}
          subtitle={metrics?.timestamp ? `Vigente: ${new Date(metrics.timestamp).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}` : undefined}
          tooltip="La TRM mostrada fue certificada con las operaciones de hoy y rige legalmente para el día siguiente (T+1)."
          icon={DollarSign}
          color='primary'
        />
        <StatCard
          label='Mejor Tasa CDT'
          value={loadingCDT ? '...' : (isValidNumber(bestCDTValue) ? bestCDTValue.toFixed(2) : '0.00')}
          suffix='% E.A.'
          subtitle={bestCDTEntity || 'CDT Colombia'}
          tooltip="La tasa de interés anualizada más alta actualmente reportada en el simulador de CDTs."
          icon={Award}
          color='emerald'
          onClick={() => onViewChange?.('cdts')}
        />
        <StatCard
          label='S&P 500 (SPY)'
          value={loadingSpy ? '...' : (isValidNumber(spyDetail?.price_usd) ? spyDetail.price_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00')}
          suffix=' USD'
          change={isValidNumber(spyDetail?.change_7d) ? Number(spyDetail.change_7d.toFixed(2)) : undefined}
          subtitle="Índice Accionario USA"
          tooltip="Precio de cierre de SPY (SPDR S&P 500 ETF Trust), el benchmark del mercado bursátil global."
          icon={TrendingUp}
          color='amber'
          onClick={() => onViewChange?.('assets')}
        />
        <StatCard
          label='Inflación IPC'
          value={loadingMetrics ? '...' : (isValidNumber(inflation) ? inflation.toFixed(2) : '0.00')}
          suffix='%'
          subtitle="Variación Anualizada"
          tooltip="Variación anualizada del Índice de Precios al Consumidor (IPC) certificado por el DANE."
          icon={PieChart}
          color='rose'
          onClick={() => onViewChange?.('metrics')}
        />
      </div>

      {/* Destacados del Mercado Section */}
      <div className='bg-white border border-slate-100 p-6 md:p-8 shadow-sm rounded-[32px] transition-all hover:shadow-md space-y-6'>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <h3 className="font-serif text-2xl text-primary tracking-tight">Destacados del Mercado</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Top 3 activos según su comportamiento histórico. Sin sesgos ni sugerencias de inversión.
            </p>
          </div>
          <div className="flex bg-slate-50 p-1 rounded-full border border-slate-100 shadow-inner shrink-0 self-start sm:self-auto">
            <button
              onClick={() => {
                setActiveHighlightTab('etf');
                setExpandedGrowthIdx(0);
                setExpandedEfficiencyIdx(0);
                setExpandedStabilityIdx(0);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                activeHighlightTab === 'etf' ? "text-primary shadow-sm bg-white border border-slate-100" : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
              )}
            >
              ETFs
            </button>
            <button
              onClick={() => {
                setActiveHighlightTab('stock');
                setExpandedGrowthIdx(0);
                setExpandedEfficiencyIdx(0);
                setExpandedStabilityIdx(0);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                activeHighlightTab === 'stock' ? "text-primary shadow-sm bg-white border border-slate-100" : "text-slate-400 hover:text-slate-600 bg-transparent border border-transparent"
              )}
            >
              Acciones
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderHighlightColumn("Líderes de Crecimiento", "Rendimiento 30D", currentHighlights?.growth, expandedGrowthIdx, setExpandedGrowthIdx, "emerald", <Zap size={16} />, activeGrowthHistories, ['#10B981','#34D399','#6EE7B7'])}
          {renderHighlightColumn("Rendimiento Inteligente", "Eficiencia Sharpe 90D", currentHighlights?.efficiency, expandedEfficiencyIdx, setExpandedEfficiencyIdx, "amber", <Award size={16} />, activeEfficiencyHistories, ['#F59E0B','#FBBF24','#FCD34D'])}
          {renderHighlightColumn("Inversión Estable", "Menor Volatilidad 180D", currentHighlights?.stability, expandedStabilityIdx, setExpandedStabilityIdx, "blue", <Shield size={16} />, activeStabilityHistories, ['#3B82F6','#60A5FA','#93C5FD'])}
        </div>

      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
        <div className='xl:col-span-2 bg-white border border-slate-100 p-6 md:p-8 shadow-sm rounded-[32px] transition-all hover:shadow-md'>
          <div className='flex items-start justify-between mb-8'>
            <div className='space-y-1.5'>
              <h3 className='font-serif text-2xl text-primary tracking-tight'>Trayectorias Comparativas</h3>
              <p className='text-[10px] text-slate-500 max-w-md leading-relaxed font-medium'>
                Analiza el <strong>retorno porcentual acumulado</strong> real (Base 100). Este benchmark visual identifica si la volatilidad del mercado está superando la rentabilidad base de la renta fija.
              </p>
            </div>
            <button className='p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-primary group' onClick={() => onViewChange?.('compare')}>
              <ArrowUpRight size={20} className='group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform' />
            </button>
          </div>
          <div className='h-[350px] w-full'>
            {(loadingMetrics || loadingHistory) ? (
              <div className='h-full w-full bg-slate-50/50 animate-pulse rounded-[24px] flex flex-col items-center justify-center gap-4'>
                <div className='w-8 h-8 border-2 border-slate-100 border-t-slate-300 rounded-full animate-spin' />
                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]'>Auditando Mercados Históricos...</span>
              </div>
            ) : (
              <ErrorBoundary fallbackMessage="Failed to load comparative trajectory chart. No default data is shown.">
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
              </ErrorBoundary>
            )}
          </div>
          <div className='mt-8 pt-6 border-t border-slate-50 flex flex-wrap items-center gap-8'>
            <div className='flex items-center gap-3'>
              <div className='w-1.5 h-1.5 rounded-full bg-emerald-500' />
              <div>
                <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Max 52s TRM</p>
                <p className='text-sm font-mono font-bold text-primary tracking-tighter'>{(trmHigh && trmHigh > 0) ? formatCurrency(trmHigh, 2) : '---'}</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <div className='w-1.5 h-1.5 rounded-full bg-slate-200' />
              <div>
                <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Min 52s TRM</p>
                <p className='text-sm font-mono font-bold text-primary tracking-tighter'>{(trmLow && trmLow > 0) ? formatCurrency(trmLow, 2) : '---'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white border border-slate-100 p-6 md:p-8 shadow-sm rounded-[32px] flex flex-col'>
          <div className='flex items-center justify-between mb-8 pb-4 border-b border-slate-50'>
            <h3 className='font-serif text-xl text-primary tracking-tight'>Activos Sincronizados</h3>
            <span className='text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest'>Live</span>
          </div>
          <div className='space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar pr-2'>
            {assets.length > 0 ? assets.slice(0, 10).map((item: AssetDetail, idx: number) => {
              const change = (item?.change_1d && item?.change_1d !== 0)
                ? item?.change_1d
                : (item?.change_7d || item?.annual_return);

              return (
                <div
                  key={idx}
                  className='flex items-center gap-4 p-3 hover:bg-slate-50 transition-all rounded-2xl cursor-pointer group border border-transparent hover:border-slate-100'
                  onClick={() => onViewChange?.('assets')}
                >
                  <div className='w-10 h-10 bg-slate-50 group-hover:bg-primary group-hover:text-white transition-all rounded-xl flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm'>
                    {item?.asset?.ticker?.substring(0, 2) || '??'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-xs font-bold text-primary truncate leading-tight'>{item?.asset?.name}</h4>
                    <p className='text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1'>{item?.asset?.ticker}</p>
                  </div>
                  <div className='text-right'>
                    <p className={`text-[12px] font-mono font-bold ${!isValidNumber(change) ? 'text-slate-400' : (change > 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                      {isValidNumber(change) ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : '---'}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className='text-center py-20'>
                <p className='text-slate-400 text-[10px] uppercase tracking-widest font-bold animate-pulse'>Esperando Flujo de Datos...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
