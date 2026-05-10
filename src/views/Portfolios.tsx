import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { Briefcase, Plus, TrendingUp, Shield, Zap, Trash2, Play, X, Calendar, AlertTriangle, Lightbulb, CheckCircle2, ChevronRight } from 'lucide-react';
import { usePortfolios, useCreatePortfolio, useDeletePortfolio, useAssets, useBacktest, usePortfolioDetail } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { Portfolio, PortfolioAllocation, BacktestResult, AssetDetail } from '../types';

const BacktestModal: React.FC<{ portfolio: Portfolio; isOpen: boolean; onClose: () => void }> = ({ portfolio, isOpen, onClose }) => {
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getYearsAgoStr = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - years);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const getMonthsAgoStr = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const [dates, setDates] = useState({ start: getYearsAgoStr(1), end: getTodayStr() });
  const backtest = useBacktest();
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    try {
      setError(null);
      setResult(null);
      const res = await backtest.mutateAsync({
        portfolioId: portfolio.id,
        start_date: `${dates.start}T00:00:00Z`,
        end_date: `${dates.end}T23:59:59Z`
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error ejecutando backtest. Verifica el rango de fechas e intenta de nuevo.');
    }
  };

  const chartOption = useMemo(() => {
    if (!result || !result.daily_values) return {};

    // Filtrar valores NaN o nulos para evitar errores en la gráfica
    const cleanData = result.daily_values.filter(d => d.portfolio_value !== null && !isNaN(d.portfolio_value));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: [8, 12],
        formatter: (params: any) => {
          const data = params[0];
          return `<div class="font-sans">
                <p class="text-[10px] text-slate-400 uppercase font-bold mb-1">${data.name}</p>
                <p class="text-sm font-bold text-primary">${formatCurrency(data.value)}</p>
            </div>`;
        }
      },
      grid: { left: '3%', right: '3%', bottom: '5%', top: '10%', containLabel: true },
      xAxis: { type: 'category', data: cleanData.map(d => d.date), show: false },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          formatter: (value: number) => `$${(value / 1000000).toFixed(1)}M`
        }
      },
      series: [{
        name: 'Valor Portafolio',
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: cleanData.map(d => d.portfolio_value),
        lineStyle: { width: 3, color: '#10B981' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.2)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]
          }
        }
      }]
    };
  }, [result]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4'>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm'
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className='relative w-full max-w-[1400px] h-[90vh] bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col border border-white/20'
          >
            <div className='p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/40 backdrop-blur-md'>
              <div>
                <h3 className='text-3xl font-serif font-bold text-slate-900 tracking-tight'>Análisis de Backtesting: {portfolio.name}</h3>
                <p className='text-xs text-slate-400 mt-1.5 uppercase tracking-[0.3em] font-bold flex items-center gap-2'>
                  <span className='w-8 h-[1px] bg-slate-200'></span>
                  Terminal de Simulación Histórica
                </p>
              </div>
              <button onClick={onClose} className='p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-slate-900 active:scale-90'><X size={24} /></button>
            </div>

            <div className='p-10 overflow-y-auto custom-scrollbar flex-1'>
              <div className='grid grid-cols-1 lg:grid-cols-4 gap-10'>
                <div className='space-y-8 col-span-1'>
                  <div className='p-8 bg-slate-50 rounded-[40px] border border-slate-100 shadow-sm'>
                    <div className='flex items-center justify-between mb-8'>
                      <h4 className='text-[11px] font-bold text-slate-500 uppercase tracking-widest'>Configuración</h4>
                      <div className='flex gap-1.5'>
                        <button onClick={() => setDates({ start: getMonthsAgoStr(6), end: getTodayStr() })} className='px-3 py-1.5 bg-white border border-slate-200 text-[9px] font-bold uppercase rounded-lg hover:border-primary text-slate-500 hover:text-primary transition-all active:scale-95'>6M</button>
                        <button onClick={() => setDates({ start: getYearsAgoStr(1), end: getTodayStr() })} className='px-3 py-1.5 bg-white border border-slate-200 text-[9px] font-bold uppercase rounded-lg hover:border-primary text-slate-500 hover:text-primary transition-all active:scale-95'>1A</button>
                        <button onClick={() => setDates({ start: getYearsAgoStr(2), end: getTodayStr() })} className='px-3 py-1.5 bg-white border border-slate-200 text-[9px] font-bold uppercase rounded-lg hover:border-primary text-slate-500 hover:text-primary transition-all active:scale-95'>2A</button>
                      </div>
                    </div>
                    <div className='space-y-6'>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Fecha Inicio</label>
                        <div className='relative'>
                          <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none' size={18} />
                          <input
                            type='date'
                            max={dates.end}
                            value={dates.start}
                            onChange={e => setDates({ ...dates, start: e.target.value })}
                            className='w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all cursor-pointer'
                          />
                        </div>
                      </div>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Fecha Fin</label>
                        <div className='relative'>
                          <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none' size={18} />
                          <input
                            type='date'
                            min={dates.start}
                            max={getTodayStr()}
                            value={dates.end}
                            onChange={e => setDates({ ...dates, end: e.target.value })}
                            className='w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all cursor-pointer'
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleRun} disabled={backtest.isPending}
                      className='w-full mt-10 py-5 bg-primary text-white rounded-[26px] font-bold text-base shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100'
                    >
                      {backtest.isPending ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full' />
                      ) : (
                        <><Play size={20} fill='currentColor' className='ml-1' /> Ejecutar Simulación</>
                      )}
                    </button>
                    {error && (
                      <div className='mt-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3'>
                        <AlertTriangle size={18} className='text-rose-500 mt-0.5 shrink-0' />
                        <p className='text-[11px] text-rose-600 leading-relaxed font-medium'>{error}</p>
                      </div>
                    )}
                  </div>

                  <div className='p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50'>
                    <div className='flex items-center gap-2 mb-3'>
                      <Lightbulb size={14} className='text-blue-500' />
                      <h4 className='text-[10px] font-bold text-blue-700 uppercase tracking-widest'>¿Qué es el Backtesting?</h4>
                    </div>
                    <p className='text-[11px] text-slate-600 leading-relaxed mb-4'>
                      Es una simulación cuantitativa que aplica tu estrategia de portafolio a <strong>datos históricos reales del mercado</strong>.
                    </p>
                    <ul className='text-[10px] text-slate-500 space-y-2.5'>
                      <li className='flex items-start gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0' />
                        <span>Evalúa cómo se habría comportado el capital y confirma si el rendimiento supera la tasa libre de riesgo.</span>
                      </li>
                      <li className='flex items-start gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0' />
                        <span><strong>Sharpe Ratio:</strong> Mide la eficiencia. Si es bajo o cercano a 0, el riesgo asumido no compensa las ganancias.</span>
                      </li>
                      <li className='flex items-start gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0' />
                        <span><strong>Win Rate:</strong> Porcentaje de días en los que el portafolio cerró con ganancias.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className='lg:col-span-3 flex flex-col gap-8'>
                  {result ? (
                    <>
                      <div className='grid grid-cols-3 gap-6'>
                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden group transition-all hover:shadow-md hover:border-emerald-100'>
                          <div className='absolute right-0 top-0 w-20 h-20 bg-emerald-50/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-125' />
                          <div className='flex items-center gap-2.5 mb-3 relative'>
                            <div className='w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center'>
                              <TrendingUp size={14} className='text-emerald-500' />
                            </div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Retorno Total</span>
                          </div>
                          <p className={cn('text-3xl font-mono font-bold relative tracking-tight', (result.total_return || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {(result.total_return || 0) > 0 ? '+' : ''}{(result.total_return || 0).toFixed(2)}%
                          </p>
                        </div>
                        
                        <div className='bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl flex flex-col justify-center relative overflow-hidden group transition-all hover:bg-slate-800'>
                          <div className='absolute right-0 top-0 w-20 h-20 bg-blue-500/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-125' />
                          <div className='flex items-center gap-2.5 mb-3 relative'>
                            <div className='w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center'>
                              <Shield size={14} className='text-blue-400' />
                            </div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Sharpe Ratio</span>
                          </div>
                          <p className='text-3xl font-mono font-bold text-white relative tracking-tight'>
                            {(result.sharpe_ratio || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden group transition-all hover:shadow-md hover:border-primary/10'>
                          <div className='flex items-center justify-between mb-3 relative'>
                            <div className='flex items-center gap-2.5'>
                              <div className='w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center'>
                                <CheckCircle2 size={14} className='text-primary' />
                              </div>
                              <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Win Rate</span>
                            </div>
                            <span className='text-sm font-mono font-bold text-primary'>{((result.win_rate || 0) * 100).toFixed(1)}%</span>
                          </div>
                          <div className='w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-2 relative'>
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${(result.win_rate || 0) * 100}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className='h-full bg-primary rounded-full' 
                            />
                          </div>
                        </div>
                      </div>

                      <div className='bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex-1 flex flex-col min-h-[450px] relative overflow-hidden'>
                        <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-primary to-blue-500' />
                        <div className='flex justify-between items-center mb-8'>
                          <div className='flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-600 shadow-inner'>
                              <TrendingUp size={22} />
                            </div>
                            <div>
                              <h4 className='text-sm font-bold text-slate-700 uppercase tracking-widest'>Curva de Crecimiento</h4>
                              <p className='text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1'>Simulación Histórica de Activos</p>
                            </div>
                          </div>
                          <div className='text-right bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100'>
                            <p className='text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Capital Final Obtenido</p>
                            <span className='text-2xl font-mono font-bold text-primary tracking-tight'>{formatCurrency(result.final_value || 0)}</span>
                          </div>
                        </div>
                        <div className='flex-1 w-full'>
                          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className='bg-slate-50/50 rounded-[48px] border border-slate-100 border-dashed min-h-[500px] flex flex-col items-center justify-center text-center p-12 flex-1'>
                      <div className='w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl border border-slate-100 mb-8 text-slate-200'>
                        <Calendar size={40} />
                      </div>
                      <h4 className='text-2xl font-serif font-bold text-slate-700 mb-4 tracking-tight'>Listo para la Simulación</h4>
                      <p className='text-slate-400 text-base max-w-md leading-relaxed'>
                        Configura el rango temporal y ejecuta el backtest para validar tu estrategia con datos históricos reales.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const PortfolioInsights: React.FC<{ portfolio: Portfolio }> = ({ portfolio }) => {
  const rec = portfolio.recommendation;
  if (!rec) return null;

  return (
    <div className='mt-8 pt-8 border-t border-slate-50 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Zap size={16} className='text-amber-500' fill='currentColor' />
          <h4 className='text-xs font-bold text-primary uppercase tracking-widest'>IA Intelligence Report</h4>
        </div>
        <div className='flex items-center gap-2'>
          {rec.classification && (
            <span className='px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-widest'>
              Perfil: {rec.classification}
            </span>
          )}
          {rec.confidence_level ? (
            <span className='px-3 py-1 bg-primary/5 text-primary rounded-full text-[9px] font-bold uppercase tracking-widest' title="Fiabilidad estadística del modelo predictivo">
              Fiabilidad del Modelo: {rec.confidence_level}%
            </span>
          ) : (
            <span className='px-3 py-1 bg-primary/5 text-primary rounded-full text-[9px] font-bold uppercase tracking-widest'>
              Análisis Completado
            </span>
          )}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='space-y-4'>
          <h5 className='text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2'>
            <AlertTriangle size={12} /> Riesgos Detectados
          </h5>
          <div className='space-y-2'>
            {rec.risks?.map((risk, i) => (
              <div key={i} className='flex items-start gap-2 p-3 bg-rose-50/50 rounded-xl border border-rose-100/50'>
                <ChevronRight size={12} className='text-rose-400 mt-0.5 shrink-0' />
                <p className='text-[11px] text-rose-700 leading-relaxed'>{risk}</p>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-4'>
          <h5 className='text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2'>
            <Lightbulb size={12} /> Acciones Sugeridas
          </h5>
          <div className='space-y-2'>
            {rec.actions?.map((action, i) => (
              <div key={i} className='flex items-start gap-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50'>
                <CheckCircle2 size={12} className='text-emerald-500 mt-0.5 shrink-0' />
                <p className='text-[11px] text-emerald-800 leading-relaxed'>{action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className='p-4 bg-slate-900 rounded-2xl text-white'>
        <p className='text-[10px] text-white/40 uppercase tracking-widest mb-2 font-bold'>Executive Summary</p>
        <p className='text-xs leading-relaxed text-slate-300 italic'>"{rec.summary}"</p>

        {portfolio.correlations?.assets && portfolio.correlations.assets.length > 1 && (
          <div className='mt-4 pt-4 border-t border-slate-800 flex items-start gap-3'>
            <Shield size={14} className='text-emerald-500 mt-0.5 shrink-0' />
            <div>
              <p className='text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1'>Respaldo Cuantitativo</p>
              <p className='text-[10px] text-slate-400 leading-relaxed'>
                Recomendaciones y puntaje de diversificación sustentados mediante el cálculo de la frontera eficiente y matriz de correlación de Pearson cruzada entre <strong>{portfolio.correlations.assets.length} activos</strong>: {portfolio.correlations.assets.join(', ')}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PortfolioCard: React.FC<{ initialPortfolio: Portfolio; onBacktest: () => void; assets: AssetDetail[] }> = ({ initialPortfolio, onBacktest, assets }) => {
  const { data: detailData } = usePortfolioDetail(initialPortfolio.id);
  const deletePortfolio = useDeletePortfolio();

  // Use detailed data if available, fallback to initial
  const portfolio = detailData || initialPortfolio;

  return (
    <div className='bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group'>
      <div className='flex justify-between items-start mb-8'>
        <div className='flex items-center gap-4'>
          <div className='p-3 bg-slate-50 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all'><Briefcase size={24} /></div>
          <div>
            <h4 className='text-xl font-serif font-bold text-primary'>{portfolio.name}</h4>
            {portfolio.description && <p className='text-xs text-slate-500 mt-1'>{portfolio.description}</p>}
            <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2'>Capital: {formatCurrency(portfolio.total_investment_cop)}</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <button className='flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all' onClick={onBacktest}>
            <TrendingUp size={14} /> Backtesting
          </button>
          <button className='p-2 text-slate-300 hover:text-rose-500 transition-colors' onClick={() => deletePortfolio.mutate(portfolio.id)}><Trash2 size={18} /></button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8'>
        <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100'>
          <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>Retorno EA</span>
          <p className={cn('text-2xl font-mono font-bold', (portfolio.metrics?.expected_return || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {(portfolio.metrics?.expected_return || 0).toFixed(2)}%
          </p>
        </div>
        <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100'>
          <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>Volatilidad Anual</span>
          <p className='text-2xl font-mono font-bold text-primary'>{(portfolio.metrics?.volatility || 0).toFixed(2)}%</p>
        </div>
        <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100'>
          <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>Sharpe Ratio</span>
          <p className='text-2xl font-mono font-bold text-primary'>{(portfolio.metrics?.sharpe_ratio || 0).toFixed(2)}</p>
        </div>
        <div className='p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-primary/10'>
          <span className='text-[8px] font-bold text-white/40 uppercase tracking-widest block mb-2'>Max Drawdown</span>
          <p className='text-2xl font-mono font-bold text-rose-400'>{(portfolio.metrics?.maximum_drawdown || 0).toFixed(2)}%</p>
        </div>
      </div>

      <div className='space-y-4 mb-8'>
        <div className='flex justify-between items-center'>
          <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Asignación Táctica de Activos</span>
          <span className='text-[10px] font-bold text-primary uppercase tracking-widest'>{portfolio.metrics?.diversification_score || 0}/100 Diversificación</span>
        </div>
        <div className='h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner'>
          {portfolio.allocations?.map((alloc, i) => {
            const colors = ['#0F172A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];
            const assetInfo = assets?.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
            const ticker = assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || i + 1}`;
            return (
              <div
                key={i}
                title={`${ticker} - ${alloc.weight_percentage}%`}
                style={{ width: `${alloc.weight_percentage}%`, backgroundColor: colors[i % colors.length] }}
                className='h-full relative group/alloc cursor-pointer'
              >
                <div className='absolute inset-0 bg-white/10 opacity-0 group-hover/alloc:opacity-100 transition-opacity' />
              </div>
            );
          })}
        </div>

        <div className='flex flex-wrap gap-4 mt-3 bg-slate-50 p-4 rounded-2xl border border-slate-100'>
          {portfolio.allocations?.map((alloc, i) => {
            const colors = ['#0F172A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];
            const assetInfo = assets?.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
            const ticker = assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || i + 1}`;
            const name = assetInfo?.name || '';
            return (
              <div key={i} className='flex items-center gap-2 min-w-[120px] group/legend' title={name}>
                <div className='w-3 h-3 rounded-full shadow-sm' style={{ backgroundColor: colors[i % colors.length] }} />
                <span className='text-xs font-bold text-slate-700'>{ticker}</span>
                {name && <span className='text-[10px] text-slate-400 hidden md:inline-block max-w-[150px] truncate'>{name}</span>}
                <span className='text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-100'>{alloc.weight_percentage.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <PortfolioInsights portfolio={portfolio} />
    </div>
  );
};

const PortfoliosView: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [newPortfolio, setNewPortfolio] = useState<{ name: string; description: string; total_investment_cop: number; allocations: PortfolioAllocation[] }>({
    name: '',
    description: '',
    total_investment_cop: 10000000,
    allocations: []
  });
  const [investmentInput, setInvestmentInput] = useState('10000000');
  const [error, setError] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  const { data: portfoliosData, isLoading } = usePortfolios({ user_id: 1 });
  const { data: etfsResponse } = useAssets({ type: 'etf' });
  const { data: stocksResponse } = useAssets({ type: 'stock' });
  const createPortfolio = useCreatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  const assets = [...(etfsResponse?.data || []), ...(stocksResponse?.data || [])];
  const portfolios = portfoliosData?.portfolios || [];

  const filteredAssets = assets.filter(a =>
    a.asset.ticker.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.asset.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newPortfolio.name) {
      setError('Por favor ingresa un nombre para el portafolio.');
      return;
    }
    if (newPortfolio.allocations.length === 0) {
      setError('Debes agregar al menos un activo.');
      return;
    }
    const sum = newPortfolio.allocations.reduce((acc, a) => acc + a.weight_percentage, 0);
    if (Math.abs(sum - 100) > 1) {
      setError('La suma de las asignaciones debe ser 100%.');
      return;
    }

    setError('');
    await createPortfolio.mutateAsync({ ...newPortfolio, user_id: 1 });
    setIsCreating(false);
    setNewPortfolio({ name: '', description: '', total_investment_cop: 10000000, allocations: [] });
    setInvestmentInput('10000000');
  };

  const addAllocation = (ticker: string) => {
    if (newPortfolio.allocations.find(a => a.ticker === ticker)) return;

    const newAllocations = [...newPortfolio.allocations, { ticker, weight_percentage: 0 }];
    const count = newAllocations.length;
    const evenly = Math.floor(100 / count);
    const remainder = 100 - (evenly * count);

    const distributed = newAllocations.map((a, i) => ({
      ...a,
      weight_percentage: evenly + (i < remainder ? 1 : 0)
    }));

    setNewPortfolio({
      ...newPortfolio,
      allocations: distributed
    });
  };

  const removeAllocation = (ticker: string) => {
    const newAllocations = newPortfolio.allocations.filter(a => a.ticker !== ticker);
    if (newAllocations.length === 0) {
      setNewPortfolio({ ...newPortfolio, allocations: [] });
      return;
    }
    const count = newAllocations.length;
    const evenly = Math.floor(100 / count);
    const remainder = 100 - (evenly * count);

    const distributed = newAllocations.map((a, i) => ({
      ...a,
      weight_percentage: evenly + (i < remainder ? 1 : 0)
    }));

    setNewPortfolio({ ...newPortfolio, allocations: distributed });
  };

  const handleAllocationChange = (ticker: string, newValue: number) => {
    let current = [...newPortfolio.allocations];
    const index = current.findIndex(a => a.ticker === ticker);
    if (index === -1) return;

    const oldValue = current[index].weight_percentage;
    const difference = newValue - oldValue;

    if (current.length === 1) {
      current[0].weight_percentage = 100;
      setNewPortfolio({ ...newPortfolio, allocations: current });
      return;
    }

    const others = current.filter((_, i) => i !== index);
    const sumOthers = others.reduce((acc, a) => acc + a.weight_percentage, 0);

    current[index].weight_percentage = newValue;

    if (sumOthers === 0) {
      const diffPerOther = difference / others.length;
      others.forEach(o => {
        const i = current.findIndex(a => a.ticker === o.ticker);
        current[i].weight_percentage -= diffPerOther;
      });
    } else {
      others.forEach(o => {
        const i = current.findIndex(a => a.ticker === o.ticker);
        const proportion = o.weight_percentage / sumOthers;
        current[i].weight_percentage -= difference * proportion;
      });
    }

    current = current.map(a => ({ ...a, weight_percentage: Math.round(a.weight_percentage) }));
    const roundedSum = current.reduce((acc, a) => acc + a.weight_percentage, 0);
    if (roundedSum !== 100) {
      const diff = 100 - roundedSum;
      const otherIndex = index === 0 ? 1 : 0;
      current[otherIndex].weight_percentage += diff;
    }

    current = current.map(a => ({ ...a, weight_percentage: Math.max(0, Math.min(100, a.weight_percentage)) }));
    setNewPortfolio({ ...newPortfolio, allocations: current });
  };

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setInvestmentInput(value);
    setNewPortfolio({ ...newPortfolio, total_investment_cop: Number(value || 0) });
  };

  return (
    <div className='space-y-10 pb-20'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
        <div>
          <h2 className='text-4xl md:text-5xl font-serif text-primary tracking-tight'>Simulador de Portafolios</h2>
          <p className='text-sm text-slate-500 mt-3 max-w-xl'>Diseña estrategias institucionales, gestiona riesgos y aprende de las proyecciones de IA.</p>
        </div>
        <button onClick={() => setIsCreating(!isCreating)} className='flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-xl'>
          {isCreating ? <X size={18} /> : <Plus size={18} />} {isCreating ? 'Cancelar' : 'Nuevo Portafolio'}
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className='bg-white p-8 rounded-3xl border border-slate-100 shadow-xl overflow-visible'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <div className='space-y-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase mb-2'>Nombre del Portafolio</label>
                  <input type='text' placeholder='Ej: Crecimiento Moderado' value={newPortfolio.name} onChange={e => setNewPortfolio({ ...newPortfolio, name: e.target.value })} className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-primary transition-colors' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase mb-2'>Inversión Inicial (COP)</label>
                  <input type='text' value={investmentInput ? Number(investmentInput).toLocaleString('es-CO') : ''} onChange={handleInvestmentChange} placeholder='10,000,000' className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono outline-none focus:border-primary transition-colors' />
                </div>
              </div>
              <div className='space-y-4'>
                <div className='relative z-20'>
                  <label className='block text-xs font-bold text-slate-400 uppercase mb-2'>Activos (Total: 100%)</label>
                  <input
                    type="text"
                    placeholder="+ Buscar activo por Ticker o Nombre..."
                    value={assetSearch}
                    onFocus={() => setIsAssetDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsAssetDropdownOpen(false), 200)}
                    onChange={e => {
                      setAssetSearch(e.target.value);
                      setIsAssetDropdownOpen(true);
                    }}
                    className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-primary transition-colors'
                  />

                  <AnimatePresence>
                    {isAssetDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className='absolute z-30 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto'
                      >
                        {filteredAssets.map(asset => (
                          <div
                            key={asset.asset.ticker}
                            onClick={() => {
                              addAllocation(asset.asset.ticker);
                              setAssetSearch('');
                              setIsAssetDropdownOpen(false);
                            }}
                            className='px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0'
                          >
                            <p className='text-sm font-bold text-primary'>{asset.asset.ticker}</p>
                            <p className='text-xs text-slate-500 truncate'>{asset.asset.name}</p>
                          </div>
                        ))}
                        {filteredAssets.length === 0 && (
                          <div className='p-4 text-sm text-center text-slate-400'>No se encontraron activos</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className='space-y-2 mt-4'>
                  {newPortfolio.allocations.map(alloc => (
                    <div key={alloc.ticker} className='flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100'>
                      <span className='text-xs font-bold w-16 text-primary'>{alloc.ticker}</span>
                      <input type='range' min='0' max='100' value={alloc.weight_percentage} onChange={e => handleAllocationChange(alloc.ticker, Number(e.target.value))} className='flex-1 accent-primary' />
                      <span className='text-xs font-mono w-10 text-right'>{alloc.weight_percentage}%</span>
                      <button onClick={() => removeAllocation(alloc.ticker)} className='text-slate-300 hover:text-rose-500 transition-colors'><X size={14} /></button>
                    </div>
                  ))}
                  {newPortfolio.allocations.length === 0 && (
                    <div className='text-center p-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed'>
                      <p className='text-xs text-slate-400'>No has agregado activos aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && <p className='text-rose-500 text-sm font-bold mt-6 flex items-center gap-2'><AlertTriangle size={16} /> {error}</p>}

            <div className='mt-8 flex justify-end gap-3'>
              <button onClick={() => { setIsCreating(false); setError(''); }} className='px-6 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors'>Cancelar</button>
              <button onClick={handleCreate} disabled={createPortfolio.isPending} className='px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'>
                {createPortfolio.isPending ? 'Creando...' : 'Crear y Analizar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='grid grid-cols-1 gap-8'>
        {isLoading ? (
          <div className='p-12 text-center text-slate-400'>Cargando portafolios...</div>
        ) : portfolios.length === 0 ? (
          <div className='p-12 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed'>
            <Briefcase size={48} className='mx-auto text-slate-300 mb-4' />
            <h3 className='text-lg font-bold text-primary mb-2'>No tienes portafolios creados</h3>
            <p className='text-slate-500 text-sm max-w-sm mx-auto'>Crea tu primer portafolio seleccionando distintos activos y analizando su rendimiento histórico y proyecciones de riesgo.</p>
          </div>
        ) : (
          portfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} initialPortfolio={portfolio} onBacktest={() => setSelectedPortfolio(portfolio)} assets={assets} />
          ))
        )}
      </div>

      {selectedPortfolio && (
        <BacktestModal
          portfolio={selectedPortfolio}
          isOpen={!!selectedPortfolio}
          onClose={() => setSelectedPortfolio(null)}
        />
      )}
    </div>
  );
};

export default PortfoliosView;
