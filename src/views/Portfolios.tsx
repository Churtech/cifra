import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { Briefcase, Plus, TrendingUp, Shield, Zap, Trash2, Play, X, Calendar, AlertTriangle, Lightbulb, CheckCircle2, ChevronRight, BookOpen, HelpCircle, Scale, Award, Info, Pencil } from 'lucide-react';
import { usePortfolios, useCreatePortfolio, useUpdatePortfolio, useDeletePortfolio, useAssets, useBacktest, usePortfolioDetail, useCDTs, usePortfolioAnalysis, useComparePortfolios } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { Portfolio, PortfolioAllocation, BacktestResult, AssetDetail, AnalysisReport, CDTDetail, PortfolioComparison } from '../types';

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
  const [feePercentage, setFeePercentage] = useState<number>(0.2); // 0.20% default
  const [feeMin, setFeeMin] = useState<number>(5000); // 5000 COP default
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
        end_date: `${dates.end}T23:59:59Z`,
        brokerage_fee_percentage: feePercentage / 100, // Send as decimal
        brokerage_fee_min_cop: feeMin
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
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10'>
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

                      {/* Brokerage Fees UI Inputs */}
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Comisión Corretaje (%)</label>
                        <input
                          type='number'
                          step='0.01'
                          min='0'
                          max='5'
                          value={feePercentage}
                          onChange={e => setFeePercentage(Number(e.target.value))}
                          className='w-full px-5 py-4 bg-white border border-slate-200 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all'
                          placeholder='0.20'
                        />
                      </div>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Comisión Mínima (COP)</label>
                        <input
                          type='number'
                          min='0'
                          value={feeMin}
                          onChange={e => setFeeMin(Number(e.target.value))}
                          className='w-full px-5 py-4 bg-white border border-slate-200 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all font-mono'
                          placeholder='5000'
                        />
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
                        <span>Aplica intereses diarios en CDTs y dividendos/precios reales en renta variable.</span>
                      </li>
                      <li className='flex items-start gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0' />
                        <span><strong>Comisiones:</strong> Descuenta los costos mínimos y de corretaje bursátil.</span>
                      </li>
                      <li className='flex items-start gap-2'>
                        <div className='w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0' />
                        <span><strong>Sharpe Ratio:</strong> Mide la eficiencia respecto a la tasa libre de riesgo.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className='col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-8'>
                  {result ? (
                    <>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden group transition-all hover:shadow-md hover:border-emerald-100'>
                          <div className='absolute right-0 top-0 w-20 h-20 bg-emerald-50/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-125' />
                          <div className='flex items-center gap-2.5 mb-3 relative'>
                            <div className='w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center'>
                              <TrendingUp size={14} className='text-emerald-500' />
                            </div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Retorno Total</span>
                          </div>
                          <p className={cn('text-2xl font-mono font-bold relative tracking-tight', (result.total_return || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
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
                          <p className='text-2xl font-mono font-bold text-white relative tracking-tight'>
                            {(result.sharpe_ratio || 0).toFixed(2)}
                          </p>
                        </div>

                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden group transition-all hover:shadow-md hover:border-rose-100'>
                          <div className='absolute right-0 top-0 w-20 h-20 bg-rose-50/50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-125' />
                          <div className='flex items-center gap-2.5 mb-3 relative'>
                            <div className='w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center'>
                              <Scale size={14} className='text-rose-500' />
                            </div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Comisiones COP</span>
                          </div>
                          <p className='text-2xl font-mono font-bold text-rose-600 relative tracking-tight'>
                            {formatCurrency(result.total_commissions_cop || 0)}
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
                        Configura el rango temporal y comisiones, y ejecuta el backtest para validar tu estrategia con datos históricos reales.
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

const classificationTranslations: Record<string, string> = {
  conservative: 'Conservador',
  balanced: 'Moderado',
  aggressive: 'Agresivo',
  speculative: 'Especulativo',
  comparison: 'Comparación',
};

const PortfolioInsights: React.FC<{ portfolio: Portfolio }> = ({ portfolio }) => {
  const rec = portfolio.recommendation;
  if (!rec) return null;

  const translatedClassification = rec.classification
    ? (classificationTranslations[rec.classification.toLowerCase()] || rec.classification)
    : '';

  return (
    <div className='mt-8 pt-8 border-t border-slate-50 space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Zap size={16} className='text-amber-500' fill='currentColor' />
          <h4 className='text-xs font-bold text-primary uppercase tracking-widest'>Reporte de Inteligencia IA</h4>
        </div>
        <div className='flex items-center gap-2'>
          {rec.classification && (
            <span className='px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-widest'>
              Perfil: {translatedClassification}
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

const PortfolioAnalysisDetails: React.FC<{ portfolio: Portfolio; isRealReturnMode: boolean }> = ({ portfolio, isRealReturnMode }) => {
  const { data: analysisReport, isLoading } = usePortfolioAnalysis(portfolio.id);
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);

  if (isLoading) return <div className='py-4 text-center text-slate-400 text-xs'>Cargando auditoría cuantitativa...</div>;
  if (!analysisReport) return null;

  const { education, human_analysis, data_quality, assumptions } = analysisReport;

  // Check Fogafín limit: single bank CDT total allocation > 50,000,000 COP
  const fogafinLimit = 50000000;
  const singleBankCdts: Record<string, number> = {};
  portfolio.allocations?.forEach(alloc => {
    if (alloc.cdt_id && alloc.cdt) {
      const bank = alloc.cdt.institution.name;
      const amount = (alloc.weight_percentage / 100) * portfolio.total_investment_cop;
      singleBankCdts[bank] = (singleBankCdts[bank] || 0) + amount;
    }
  });

  const fogafinAlerts = Object.entries(singleBankCdts)
    .filter(([_, amount]) => amount > fogafinLimit)
    .map(([bank, amount]) => ({ bank, amount }));

  return (
    <div className='mt-8 pt-8 border-t border-slate-50 space-y-8'>
      {/* Data Quality & Fogafin Alerts */}
      <div className='flex flex-wrap gap-4'>
        {data_quality && (
          <div className='relative'>
            {/* The Badge */}
            <div className='flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 shadow-sm'>
              <Info size={12} className={cn(data_quality.score >= 90 ? 'text-emerald-500' : 'text-amber-500')} />
              <span>Fidelidad de Datos: {data_quality.score}/100</span>
              {data_quality.warnings?.length > 0 && (
                <button 
                  onClick={() => setShowAlertsPopover(!showAlertsPopover)}
                  className='text-amber-500 hover:text-amber-600 cursor-pointer underline ml-1 font-mono outline-none'
                >
                  ({data_quality.warnings.length} alerts)
                </button>
              )}
            </div>

            {/* The Popover (rendered outside the badge to avoid CSS text/flex inheritance) */}
            {data_quality.warnings?.length > 0 && (
              <AnimatePresence>
                {showAlertsPopover && (
                  <>
                    {/* Backdrop to close popover on click outside */}
                    <div className='fixed inset-0 z-30' onClick={() => setShowAlertsPopover(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className='absolute bottom-full left-0 mb-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl p-5 z-40 text-left'
                    >
                      <div className='flex items-center gap-2 mb-3 pb-2 border-b border-slate-100'>
                        <AlertTriangle size={14} className='text-amber-500' />
                        <h5 className='text-[10px] font-bold text-slate-700 uppercase tracking-wider'>Advertencias de Datos</h5>
                      </div>
                      <ul className='space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar pr-1'>
                        {data_quality.warnings.map((warn, i) => (
                          <li key={i} className='flex items-start gap-2 text-[10px] text-slate-600 font-normal leading-relaxed'>
                            <div className='w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 shrink-0' />
                            <span>{warn}</span>
                          </li>
                        ))}
                      </ul>
                      <div className='p-3 bg-amber-50/50 border border-amber-100/30 rounded-xl'>
                        <p className='text-[9px] text-amber-800 font-bold leading-normal'>
                          💡 Impacto Financiero:
                        </p>
                        <p className='text-[9px] text-slate-500 font-normal leading-normal mt-1'>
                          Tener series históricas con menos días de los solicitados (252 días) puede sobredimensionar o restar estabilidad al cálculo de la volatilidad y Sharpe anualizados.
                        </p>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            )}
          </div>
        )}
        {fogafinAlerts.map(alert => (
          <div key={alert.bank} className='flex items-start gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-700 leading-relaxed font-medium shadow-sm w-full'>
            <AlertTriangle size={16} className='mt-0.5 shrink-0 text-amber-500' />
            <span>
              <strong>Límite Fogafín Superado en {alert.bank}:</strong> Tienes proyectado {formatCurrency(alert.amount)}, lo cual supera el seguro de depósito ($50,000,000 COP). Considera diversificar en otra entidad.
            </span>
          </div>
        ))}
      </div>

      {/* Human Analysis (Conversational summary) */}
      {human_analysis && (
        <div className='p-6 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden group hover:bg-slate-800 transition-all'>
          <div className='absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-bl-full -mr-16 -mt-16 pointer-events-none' />
          <div className='relative z-10 space-y-4'>
            <p className='text-[10px] text-emerald-400 uppercase tracking-widest font-bold'>Análisis Humano de IA</p>
            <p className='text-xs leading-relaxed text-slate-300 italic'>"{human_analysis.summary}"</p>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5'>
              <div className='space-y-1'>
                <h5 className='text-[9px] font-bold text-slate-400 uppercase tracking-wider'>Retorno Proyectado</h5>
                <p className='text-[11px] text-slate-300 leading-relaxed'>{human_analysis.return_explanation}</p>
              </div>
              <div className='space-y-1'>
                <h5 className='text-[9px] font-bold text-slate-400 uppercase tracking-wider'>Riesgo y Volatilidad</h5>
                <p className='text-[11px] text-slate-300 leading-relaxed'>{human_analysis.risk_explanation}</p>
              </div>
              <div className='space-y-1'>
                <h5 className='text-[9px] font-bold text-slate-400 uppercase tracking-wider'>Eficiencia (Sharpe)</h5>
                <p className='text-[11px] text-slate-300 leading-relaxed'>{human_analysis.sharpe_explanation}</p>
              </div>
              {human_analysis.diversification_explanation && (
                <div className='space-y-1'>
                  <h5 className='text-[9px] font-bold text-slate-400 uppercase tracking-wider'>Diversificación</h5>
                  <p className='text-[11px] text-slate-300 leading-relaxed'>{human_analysis.diversification_explanation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assumptions & Crystal Box */}
      <div className='space-y-4'>
        <details className='group border border-slate-100 rounded-[24px] bg-white overflow-hidden transition-all duration-300'>
          <summary className='flex justify-between items-center p-5 cursor-pointer list-none select-none font-serif text-sm font-bold text-primary hover:bg-slate-50'>
            <div className='flex items-center gap-3'>
              <BookOpen size={16} className='text-primary' />
              <span>Caja de Cristal Educativa (Fórmulas y Referencias)</span>
            </div>
            <ChevronRight size={16} className='text-slate-400 group-open:rotate-90 transition-transform' />
          </summary>
          <div className='p-6 border-t border-slate-50 space-y-6 bg-slate-50/30'>
            {/* Assumptions */}
            {assumptions && (
              <div>
                <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3'>Supuestos Utilizados</h5>
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
                  <div className='bg-white p-4 border border-slate-100 rounded-xl shadow-sm'>
                    <p className='text-[8px] font-bold text-slate-400 uppercase'>Tasa Libre de Riesgo</p>
                    <p className='text-sm font-mono font-bold text-primary'>{(assumptions.risk_free_rate * 100).toFixed(2)}% E.A.</p>
                  </div>
                  <div className='bg-white p-4 border border-slate-100 rounded-xl shadow-sm'>
                    <p className='text-[8px] font-bold text-slate-400 uppercase'>Inflación Referencia</p>
                    <p className='text-sm font-mono font-bold text-primary'>{(assumptions.inflation_rate * 100).toFixed(2)}% Anual</p>
                  </div>
                  <div className='bg-white p-4 border border-slate-100 rounded-xl shadow-sm'>
                    <p className='text-[8px] font-bold text-slate-400 uppercase'>TRM Conversión</p>
                    <p className='text-sm font-mono font-bold text-primary'>{formatCurrency(assumptions.trm, 2)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Formulas */}
            {education.formulas_usage && (
              <div>
                <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3'>Fórmulas Financieras Aplicadas</h5>
                <div className='space-y-3.5'>
                  {Object.entries(education.formulas_usage).map(([metric, formula]) => (
                    <div key={metric} className='bg-white p-4 border border-slate-100 rounded-xl shadow-sm'>
                      <p className='text-[10px] font-bold text-primary uppercase mb-1'>{metric}</p>
                      <p className='text-xs font-mono bg-slate-50 p-2 rounded text-slate-700 font-bold overflow-x-auto'>{formula}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {education.references?.length > 0 && (
              <div>
                <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>Referencias de Literatura</h5>
                <ul className='text-[10px] text-slate-500 space-y-1.5 list-disc list-inside pl-1'>
                  {education.references.map((ref, idx) => (
                    <li key={idx} className='leading-relaxed'>{ref}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Disclaimers */}
            {education.disclaimers?.length > 0 && (
              <div>
                <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>Disclaimers y Notas Legales</h5>
                <div className='space-y-1.5'>
                  {education.disclaimers.map((disc, idx) => (
                    <p key={idx} className='text-[9px] text-slate-400 leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm'>{disc}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
};

const PortfolioCard: React.FC<{ 
  initialPortfolio: Portfolio; 
  onBacktest: () => void; 
  onEdit: (portfolio: Portfolio) => void;
  assets: AssetDetail[]; 
  cdts: CDTDetail[];
  selectedPortfolios: number[];
  onToggleSelect: (id: number) => void;
}> = ({ initialPortfolio, onBacktest, onEdit, assets, cdts, selectedPortfolios, onToggleSelect }) => {
  const { data: detailData } = usePortfolioDetail(initialPortfolio.id);
  const deletePortfolio = useDeletePortfolio();
  const [isRealReturn, setIsRealReturn] = useState(false);

  // Use detailed data if available, fallback to initial
  const portfolio = detailData || initialPortfolio;
  const isSelected = selectedPortfolios.includes(portfolio.id);

  // Fetch analysis report to get the exact DANE inflation for Fisher calculation
  const { data: analysisReport } = usePortfolioAnalysis(portfolio.id);
  const inflation = analysisReport?.assumptions?.inflation_rate ?? 0.05; // Default 5%
  
  const expectedReturn = isRealReturn
    ? ((1 + (portfolio.metrics?.expected_return || 0) / 100) / (1 + inflation) - 1) * 100
    : (portfolio.metrics?.expected_return || 0);

  return (
    <div className={cn(
      'bg-white p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative',
      isSelected ? 'border-primary ring-2 ring-primary/5' : 'border-slate-100'
    )}>
      {/* Checkbox selector for side-by-side comparison */}
      <div 
        onClick={() => onToggleSelect(portfolio.id)}
        className={cn(
          'absolute top-8 left-8 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer z-10',
          isSelected ? 'bg-primary border-primary scale-110' : 'border-slate-200 bg-white opacity-0 group-hover:opacity-100'
        )}
      >
        {isSelected && <div className='w-2 h-2 bg-white rounded-full' />}
      </div>

      <div className='flex justify-between items-start mb-8 pl-8 lg:pl-10'>
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
          <button className='p-2 text-slate-300 hover:text-blue-600 transition-colors' onClick={() => onEdit(portfolio)} title='Editar Portafolio'><Pencil size={18} /></button>
          <button className='p-2 text-slate-300 hover:text-rose-500 transition-colors' onClick={() => deletePortfolio.mutate(portfolio.id)} title='Eliminar Portafolio'><Trash2 size={18} /></button>
        </div>
      </div>

      {/* Metrics Header with Real/Nominal switch */}
      <div className='flex justify-between items-center mb-4 pl-8 lg:pl-10'>
        <span className='text-[9px] font-bold text-slate-400 uppercase tracking-wider'>Desempeño del Portafolio</span>
        <button
          onClick={() => setIsRealReturn(!isRealReturn)}
          className='flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold text-slate-500 uppercase hover:bg-slate-100 transition-colors'
        >
          {isRealReturn ? 'Ver Retorno Nominal' : 'Ver Retorno Real (Fisher)'}
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 pl-8 lg:pl-10'>
        <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100'>
          <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>
            {isRealReturn ? 'Retorno Real E.A.' : 'Retorno Esperado E.A.'}
          </span>
          <p className={cn('text-2xl font-mono font-bold', expectedReturn >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
            {expectedReturn.toFixed(2)}%
          </p>
        </div>
        <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100'>
          <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>Volatilidad Anual</span>
          <p className='text-2xl font-mono font-bold text-primary'>{(portfolio.metrics?.volatility || 0).toFixed(2)}%</p>
        </div>
        <div className='p-6 bg-slate-50 rounded-2xl border border-slate-100 relative'>
          <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-2'>Sharpe Ratio</span>
          <p className='text-2xl font-mono font-bold text-primary'>
            {(portfolio.metrics?.sharpe_ratio || 0).toFixed(2)}
          </p>
        </div>
        <div className='p-6 bg-slate-900 rounded-2xl text-white shadow-xl shadow-primary/10'>
          <span className='text-[8px] font-bold text-white/40 uppercase tracking-widest block mb-2'>Max Drawdown</span>
          <p className='text-2xl font-mono font-bold text-rose-400'>{(portfolio.metrics?.maximum_drawdown || 0).toFixed(2)}%</p>
        </div>
      </div>

      <div className='space-y-4 mb-8 pl-8 lg:pl-10'>
        <div className='flex justify-between items-center'>
          <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Asignación Táctica de Activos</span>
          <span className='text-[10px] font-bold text-primary uppercase tracking-widest'>{portfolio.metrics?.diversification_score || 0}/100 Diversificación</span>
        </div>
        <div className='h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner'>
          {portfolio.allocations?.map((alloc, i) => {
            const colors = ['#0F172A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];
            const assetInfo = assets?.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
            const cdtInfo = cdts?.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
            const name = alloc.cdt_id
              ? `CDT ${cdtInfo?.institution?.name || 'Bancario'} (${cdtInfo?.plazo_dias || '---'}D)`
              : (assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || i + 1}`);

            return (
              <div
                key={i}
                title={`${name} - ${alloc.weight_percentage}%`}
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
            const cdtInfo = cdts?.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
            const displayName = alloc.cdt_id
              ? `CDT ${cdtInfo?.institution?.name || 'Bancario'} (${cdtInfo?.plazo_dias || '---'}D)`
              : (assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || i + 1}`);
            const detailName = alloc.cdt_id
              ? `Tasa E.A: ${cdtInfo?.tasa_ea}%`
              : (assetInfo?.name || '');

            return (
              <div key={i} className='flex items-center gap-2 min-w-[120px] group/legend' title={detailName}>
                <div className='w-3 h-3 rounded-full shadow-sm' style={{ backgroundColor: colors[i % colors.length] }} />
                <span className='text-xs font-bold text-slate-700'>{displayName}</span>
                {detailName && <span className='text-[10px] text-slate-400 hidden md:inline-block max-w-[150px] truncate'>{detailName}</span>}
                <span className='text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-100'>{alloc.weight_percentage.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <PortfolioInsights portfolio={portfolio} />
      <PortfolioAnalysisDetails portfolio={portfolio} isRealReturnMode={isRealReturn} />
    </div>
  );
};

const ComparisonPortfoliosModal: React.FC<{
  portfolioIds: number[];
  isOpen: boolean;
  onClose: () => void;
  allPortfolios: Portfolio[];
  assets?: AssetDetail[];
  cdts?: CDTDetail[];
}> = ({ portfolioIds, isOpen, onClose, allPortfolios, assets = [], cdts = [] }) => {
  const comparePortfolios = useComparePortfolios();
  const [comparisonData, setComparisonData] = useState<PortfolioComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && portfolioIds.length >= 2) {
      setError(null);
      setComparisonData(null);
      comparePortfolios.mutate(portfolioIds, {
        onSuccess: (res) => {
          setComparisonData(res.data);
        },
        onError: (err: any) => {
          setError(err.response?.data?.error || err.message || 'Error comparando portafolios.');
        }
      });
    }
  }, [isOpen, portfolioIds]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className='fixed inset-0 z-[120] flex items-center justify-center p-4'>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className='absolute inset-0 bg-slate-900/60 backdrop-blur-sm'
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className='relative w-full max-w-[1000px] max-h-[85vh] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/20 p-8 z-10'
        >
          <div className='flex justify-between items-center mb-6 pb-4 border-b border-slate-100'>
            <div>
              <h3 className='text-2xl font-serif font-bold text-slate-900 tracking-tight'>Comparativa Cruzada de Portafolios</h3>
              <p className='text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold flex items-center gap-2'>
                <span className='w-4 h-[1px] bg-slate-200'></span>
                Análisis de Eficiencia en Lote (Markowitz & Sharpe)
              </p>
            </div>
            <button onClick={onClose} className='p-3 hover:bg-slate-50 rounded-full transition-all text-slate-400 hover:text-slate-900'><X size={20} /></button>
          </div>

          <div className='overflow-y-auto custom-scrollbar flex-1 pr-1'>
            {comparePortfolios.isPending ? (
              <div className='py-20 text-center flex flex-col items-center gap-4'>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className='w-10 h-10 border-4 border-slate-100 border-t-primary rounded-full' />
                <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>Ejecutando cálculos de optimización cruzada...</p>
              </div>
            ) : error ? (
              <div className='p-6 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 my-10'>
                <AlertTriangle size={18} className='text-rose-500 mt-0.5 shrink-0' />
                <p className='text-xs text-rose-600 font-medium'>{error}</p>
              </div>
            ) : comparisonData ? (
              <div className='overflow-x-auto custom-scrollbar pb-4'>
                <table className='w-full border-collapse'>
                  <thead>
                    <tr className='border-b border-slate-100 bg-slate-50/50'>
                      <th className='p-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Métrica / Portafolio</th>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        return (
                          <th key={id} className='p-4 text-right text-xs font-bold text-primary font-serif'>{p.name}</th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    <tr>
                      <td className='p-4 text-xs font-medium text-slate-500'>Retorno Esperado E.A.</td>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        const isBest = String(id) === String(comparisonData.best_return);
                        return (
                          <td key={id} className='p-4 text-right font-mono text-sm font-bold'>
                            <span className={cn('inline-flex items-center gap-1.5', isBest && 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg')}>
                              {isBest && <Award size={12} />}
                              {(p.metrics?.expected_return || 0).toFixed(2)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className='p-4 text-xs font-medium text-slate-500'>Volatilidad Anual</td>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        return (
                          <td key={id} className='p-4 text-right font-mono text-sm font-bold text-slate-700'>
                            {(p.metrics?.volatility || 0).toFixed(2)}%
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className='p-4 text-xs font-medium text-slate-500'>Sharpe Ratio</td>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        const isBest = String(id) === String(comparisonData.best_sharpe);
                        return (
                          <td key={id} className='p-4 text-right font-mono text-sm font-bold'>
                            <span className={cn('inline-flex items-center gap-1.5', isBest && 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg')}>
                              {isBest && <Zap size={12} fill='currentColor' />}
                              {(p.metrics?.sharpe_ratio || 0).toFixed(2)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className='p-4 text-xs font-medium text-slate-500'>Máximo Drawdown</td>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        return (
                          <td key={id} className='p-4 text-right font-mono text-sm font-bold text-rose-500'>
                            {(p.metrics?.maximum_drawdown || 0).toFixed(2)}%
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className='p-4 text-xs font-medium text-slate-500'>Score de Diversificación</td>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        const isBest = String(id) === String(comparisonData.best_diversification);
                        return (
                          <td key={id} className='p-4 text-right font-mono text-sm font-bold'>
                            <span className={cn('inline-flex items-center gap-1.5', isBest && 'text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg')}>
                              {isBest && <Shield size={12} />}
                              {(p.metrics?.diversification_score || 0)}/100
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className='p-4 text-xs font-medium text-slate-500'>Composición de Activos</td>
                      {Object.entries(comparisonData.portfolios).map(([id, unknownP]) => {
                        const p = unknownP as Portfolio;
                        return (
                          <td key={id} className='p-4 text-right text-xs'>
                            <div className='flex flex-col gap-1 items-end max-w-[250px] ml-auto'>
                              {p.allocations?.map((alloc, idx) => {
                                const assetInfo = assets?.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
                                const cdtInfo = cdts?.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
                                const displayName = alloc.cdt_id
                                  ? `CDT ${cdtInfo?.institution?.name || 'Banco'} (${cdtInfo?.plazo_dias || 180}D)`
                                  : (assetInfo?.ticker || alloc.ticker || `Activo ${alloc.asset_id || idx + 1}`);
                                return (
                                  <span key={idx} className='bg-slate-50 border border-slate-100 rounded px-2 py-0.5 text-[9px] text-slate-500 font-mono'>
                                    {displayName}: {alloc.weight_percentage}%
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const PortfoliosView: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [selectedPortfoliosForComparison, setSelectedPortfoliosForComparison] = useState<number[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
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
  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);

  const { data: portfoliosData, isLoading } = usePortfolios({ user_id: 1 });
  const { data: etfsResponse } = useAssets({ type: 'etf' });
  const { data: stocksResponse } = useAssets({ type: 'stock' });
  const { data: cdtsResponse } = useCDTs();
  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio(editingPortfolioId || 0);

  const assets = [...(etfsResponse?.data || []), ...(stocksResponse?.data || [])];
  const cdts = cdtsResponse?.data || [];
  const portfolios = portfoliosData?.portfolios || [];

  const filteredAssets = assets.filter(a =>
    a.asset.ticker.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.asset.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const filteredCDTs = cdts.filter(c =>
    c.cdt.institution.name.toLowerCase().includes(assetSearch.toLowerCase())
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
    const mappedAllocations = newPortfolio.allocations.map(a => ({
      asset_id: a.asset_id,
      cdt_id: a.cdt_id,
      ticker: a.ticker,
      weight_percentage: a.weight_percentage
    }));

    if (editingPortfolioId) {
      await updatePortfolio.mutateAsync({
        ...newPortfolio,
        allocations: mappedAllocations,
        user_id: 1
      });
    } else {
      await createPortfolio.mutateAsync({ 
        ...newPortfolio, 
        allocations: mappedAllocations,
        user_id: 1 
      });
    }
    setIsCreating(false);
    setEditingPortfolioId(null);
    setNewPortfolio({ name: '', description: '', total_investment_cop: 10000000, allocations: [] });
    setInvestmentInput('10000000');
  };

  const handleStartEdit = (portfolio: Portfolio) => {
    setEditingPortfolioId(portfolio.id);
    setNewPortfolio({
      name: portfolio.name,
      description: portfolio.description || '',
      total_investment_cop: portfolio.total_investment_cop,
      allocations: portfolio.allocations.map(a => ({
        ticker: a.ticker || '',
        asset_id: a.asset_id,
        cdt_id: a.cdt_id,
        weight_percentage: a.weight_percentage
      }))
    });
    setInvestmentInput(portfolio.total_investment_cop.toString());
    setIsCreating(true);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addAllocation = (item: { ticker?: string; asset_id?: number; cdt_id?: number }) => {
    const exists = newPortfolio.allocations.some(a => 
      (item.cdt_id && a.cdt_id === item.cdt_id) ||
      (item.asset_id && a.asset_id === item.asset_id) ||
      (item.ticker && a.ticker === item.ticker)
    );
    if (exists) return;

    const newAllocations = [...newPortfolio.allocations, { 
      ticker: item.ticker,
      asset_id: item.asset_id,
      cdt_id: item.cdt_id,
      weight_percentage: 0 
    }];
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

  const removeAllocation = (allocToRemove: PortfolioAllocation) => {
    const newAllocations = newPortfolio.allocations.filter(a => {
      if (allocToRemove.cdt_id && a.cdt_id === allocToRemove.cdt_id) return false;
      if (allocToRemove.asset_id && a.asset_id === allocToRemove.asset_id) return false;
      if (allocToRemove.ticker && a.ticker === allocToRemove.ticker) return false;
      return true;
    });

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

  const handleAllocationChange = (allocKey: { ticker?: string; cdt_id?: number }, newValue: number) => {
    let current = [...newPortfolio.allocations];
    const index = current.findIndex(a => 
      (allocKey.cdt_id && a.cdt_id === allocKey.cdt_id) || 
      (allocKey.ticker && a.ticker === allocKey.ticker)
    );
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
        const i = current.findIndex(a => 
          (o.cdt_id && a.cdt_id === o.cdt_id) || 
          (o.ticker && a.ticker === o.ticker)
        );
        current[i].weight_percentage -= diffPerOther;
      });
    } else {
      others.forEach(o => {
        const i = current.findIndex(a => 
          (o.cdt_id && a.cdt_id === o.cdt_id) || 
          (o.ticker && a.ticker === o.ticker)
        );
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

  const handleBalanceWeights = () => {
    const count = newPortfolio.allocations.length;
    if (count === 0) return;
    const evenly = Math.floor(100 / count);
    const remainder = 100 - (evenly * count);

    const distributed = newPortfolio.allocations.map((a, i) => ({
      ...a,
      weight_percentage: evenly + (i < remainder ? 1 : 0)
    }));

    setNewPortfolio({
      ...newPortfolio,
      allocations: distributed
    });
  };

  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setInvestmentInput(value);
    setNewPortfolio({ ...newPortfolio, total_investment_cop: Number(value || 0) });
  };

  const handleToggleSelectPortfolio = (id: number) => {
    setSelectedPortfoliosForComparison(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className='space-y-10 pb-28 relative'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
        <div>
          <h2 className='text-4xl md:text-5xl font-serif text-primary tracking-tight'>Simulador de Portafolios</h2>
          <p className='text-sm text-slate-500 mt-3 max-w-xl'>Diseña estrategias institucionales, combina CDTs con acciones y audita el riesgo con IA.</p>
        </div>
        <button 
          onClick={() => {
            if (isCreating) {
              setIsCreating(false);
              setEditingPortfolioId(null);
              setNewPortfolio({ name: '', description: '', total_investment_cop: 10000000, allocations: [] });
              setInvestmentInput('10000000');
            } else {
              setIsCreating(true);
              setEditingPortfolioId(null);
              setNewPortfolio({ name: '', description: '', total_investment_cop: 10000000, allocations: [] });
              setInvestmentInput('10000000');
            }
          }}
          className='flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-all shadow-xl'
        >
          {isCreating ? <X size={18} /> : <Plus size={18} />} {isCreating ? 'Cancelar' : 'Nuevo Portafolio'}
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div initial={{ opacity: 0, y: 20, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -20, height: 0 }} className='bg-white p-8 rounded-3xl border border-slate-100 shadow-xl overflow-visible'>
            <div className='mb-6 pb-4 border-b border-slate-100 flex justify-between items-center'>
              <h3 className='text-lg font-serif font-bold text-primary'>
                {editingPortfolioId ? 'Editar Portafolio' : 'Crear Nuevo Portafolio'}
              </h3>
              {editingPortfolioId && (
                <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1 rounded-lg'>
                  Modo Edición
                </span>
              )}
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <div className='space-y-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase mb-2'>Nombre del Portafolio</label>
                  <input type='text' placeholder='Ej: Crecimiento Mixto Moderado' value={newPortfolio.name} onChange={e => setNewPortfolio({ ...newPortfolio, name: e.target.value })} className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-primary transition-colors' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase mb-2'>Inversión Inicial (COP)</label>
                  <input type='text' value={investmentInput ? Number(investmentInput).toLocaleString('es-CO') : ''} onChange={handleInvestmentChange} placeholder='10,000,000' className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono outline-none focus:border-primary transition-colors' />
                </div>
              </div>
              <div className='space-y-4'>
                <div className='relative z-20'>
                  <div className='flex justify-between items-center mb-2'>
                    <label className='block text-xs font-bold text-slate-400 uppercase'>Activos (Total: 100%)</label>
                    {newPortfolio.allocations.length > 0 && (
                      <button
                        onClick={handleBalanceWeights}
                        className='text-[9px] font-bold text-primary uppercase bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors flex items-center gap-1 shadow-sm'
                      >
                        <Scale size={10} /> Equilibrar Pesos
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="+ Buscar activo (SPY, Bancolombia, CDT...)"
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
                        {/* Renta Variable */}
                        {filteredAssets.map(asset => (
                          <div
                            key={`asset-dropdown-${asset.asset.id}`}
                            onMouseDown={() => {
                              addAllocation({ asset_id: asset.asset.id, ticker: asset.asset.ticker });
                              setAssetSearch('');
                            }}
                            className='px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center'
                          >
                            <div>
                              <p className='text-sm font-bold text-primary'>{asset.asset.ticker}</p>
                              <p className='text-xs text-slate-500 truncate'>{asset.asset.name}</p>
                            </div>
                            <span className='px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase tracking-wider'>RV</span>
                          </div>
                        ))}

                        {/* Renta Fija (CDTs) */}
                        {filteredCDTs.map(item => (
                          <div
                            key={`cdt-dropdown-${item.cdt.id}`}
                            onMouseDown={() => {
                              addAllocation({ cdt_id: item.cdt.id });
                              setAssetSearch('');
                            }}
                            className='px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center'
                          >
                            <div>
                              <p className='text-sm font-bold text-primary'>CDT {item.cdt.institution.name} ({item.cdt.plazo_dias}D)</p>
                              <p className='text-xs text-slate-500 truncate'>Tasa: {item.cdt.tasa_ea}% E.A. • Mín: {formatCurrency(item.cdt.monto_min)}</p>
                            </div>
                            <span className='px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[8px] font-bold uppercase tracking-wider'>CDT</span>
                          </div>
                        ))}

                        {filteredAssets.length === 0 && filteredCDTs.length === 0 && (
                          <div className='p-4 text-sm text-center text-slate-400'>No se encontraron activos o CDTs</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className='space-y-2 mt-4'>
                  {newPortfolio.allocations.map((alloc, idx) => {
                    const isCDT = !!alloc.cdt_id;
                    const cdtInfo = cdts.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
                    const assetInfo = assets.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
                    const displayName = isCDT 
                      ? `CDT ${cdtInfo?.institution?.name || 'Bancario'} (${cdtInfo?.plazo_dias || '---'}D)`
                      : (assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || idx + 1}`);

                    return (
                      <div key={alloc.cdt_id ? `alloc-cdt-${alloc.cdt_id}` : `alloc-asset-${alloc.ticker || alloc.asset_id || idx}`} className='flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm'>
                        <span className='text-xs font-bold w-32 text-primary truncate' title={displayName}>{displayName}</span>
                        <input 
                          type='range' 
                          min='0' 
                          max='100' 
                          value={alloc.weight_percentage} 
                          onChange={e => handleAllocationChange({ ticker: alloc.ticker, cdt_id: alloc.cdt_id }, Number(e.target.value))} 
                          className='flex-1 accent-primary' 
                        />
                        <span className='text-xs font-mono w-10 text-right'>{alloc.weight_percentage}%</span>
                        <button onClick={() => removeAllocation(alloc)} className='text-slate-300 hover:text-rose-500 transition-colors' type='button'><X size={14} /></button>
                      </div>
                    );
                  })}
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
              <button 
                onClick={() => { 
                  setIsCreating(false); 
                  setEditingPortfolioId(null); 
                  setNewPortfolio({ name: '', description: '', total_investment_cop: 10000000, allocations: [] });
                  setInvestmentInput('10000000');
                  setError(''); 
                }} 
                className='px-6 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors'
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreate} 
                disabled={createPortfolio.isPending || updatePortfolio.isPending} 
                className='px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {createPortfolio.isPending || updatePortfolio.isPending 
                  ? (editingPortfolioId ? 'Guardando...' : 'Creando...') 
                  : (editingPortfolioId ? 'Guardar Cambios' : 'Crear y Analizar')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className='grid grid-cols-1 gap-8'>
        {isLoading ? (
          <div className='p-12 text-center text-slate-400'>Cargando portafolios...</div>
        ) : portfolios.length === 0 ? (
          <div className='p-12 text-center bg-slate-50 rounded-3xl border border-slate-100 border-dashed shadow-inner'>
            <Briefcase size={48} className='mx-auto text-slate-300 mb-4' />
            <h3 className='text-lg font-bold text-primary mb-2'>No tienes portafolios creados</h3>
            <p className='text-slate-500 text-sm max-w-sm mx-auto'>Crea tu primer portafolio seleccionando distintos activos y analizando su rendimiento histórico y proyecciones de riesgo.</p>
          </div>
        ) : (
          portfolios.map((portfolio) => (
            <PortfolioCard 
              key={portfolio.id} 
              initialPortfolio={portfolio} 
              onBacktest={() => setSelectedPortfolio(portfolio)} 
              onEdit={handleStartEdit}
              assets={assets} 
              cdts={cdts}
              selectedPortfolios={selectedPortfoliosForComparison}
              onToggleSelect={handleToggleSelectPortfolio}
            />
          ))
        )}
      </div>

      {/* Floating compare action bar */}
      <AnimatePresence>
        {selectedPortfoliosForComparison.length >= 2 && (
          <motion.div 
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className='fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-slate-900 text-white px-8 py-5 rounded-[28px] shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md'
          >
            <div className='flex items-center gap-3'>
              <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
              <p className='text-xs font-bold uppercase tracking-widest text-slate-300'>
                {selectedPortfoliosForComparison.length} Portafolios Seleccionados
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <button 
                onClick={() => setSelectedPortfoliosForComparison([])}
                className='text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors'
              >
                Limpiar
              </button>
              <button
                onClick={() => setIsComparisonModalOpen(true)}
                className='px-6 py-3 bg-white text-slate-900 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 active:scale-95 shadow-lg'
              >
                <Scale size={14} /> Comparar Lote
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedPortfolio && (
        <BacktestModal
          portfolio={selectedPortfolio}
          isOpen={!!selectedPortfolio}
          onClose={() => setSelectedPortfolio(null)}
        />
      )}

      {isComparisonModalOpen && (
        <ComparisonPortfoliosModal
          portfolioIds={selectedPortfoliosForComparison}
          isOpen={isComparisonModalOpen}
          onClose={() => {
            setIsComparisonModalOpen(false);
            setSelectedPortfoliosForComparison([]);
          }}
          allPortfolios={portfolios}
          assets={assets}
          cdts={cdts}
        />
      )}
    </div>
  );
};

export default PortfoliosView;
