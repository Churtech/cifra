import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { TrendingUp, Shield, Scale, CheckCircle2, Play, AlertTriangle, Lightbulb, Calendar, X } from 'lucide-react';
import { useBacktest } from '../../hooks/useFinance';
import { formatCurrency, cn } from '../../lib/utils';
import { Portfolio, BacktestResult } from '../../types';

interface BacktestModalProps {
  portfolio: Portfolio;
  isOpen: boolean;
  onClose: () => void;
}

export const PortfolioCharts: React.FC<BacktestModalProps> = ({ portfolio, isOpen, onClose }) => {
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
  const [feePercentage, setFeePercentage] = useState<number>(0.2);
  const [feeMin, setFeeMin] = useState<number>(5000);
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
        brokerage_fee_percentage: feePercentage / 100,
        brokerage_fee_min_cop: feeMin
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error ejecutando backtest.');
    }
  };

  const chartOption = useMemo(() => {
    if (!result || !result.daily_values) return {};
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
                        <button onClick={() => setDates({ start: getMonthsAgoStr(6), end: getTodayStr() })} className='px-3 py-1.5 bg-white border border-slate-200 text-[9px] font-bold uppercase rounded-lg hover:border-primary text-slate-500 hover:text-primary transition-all'>6M</button>
                        <button onClick={() => setDates({ start: getYearsAgoStr(1), end: getTodayStr() })} className='px-3 py-1.5 bg-white border border-slate-200 text-[9px] font-bold uppercase rounded-lg hover:border-primary text-slate-500 hover:text-primary transition-all'>1A</button>
                        <button onClick={() => setDates({ start: getYearsAgoStr(2), end: getTodayStr() })} className='px-3 py-1.5 bg-white border border-slate-200 text-[9px] font-bold uppercase rounded-lg hover:border-primary text-slate-500 hover:text-primary transition-all'>2A</button>
                      </div>
                    </div>
                    <div className='space-y-6'>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Fecha Inicio</label>
                        <div className='relative'>
                          <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' size={18} />
                          <input type='date' max={dates.end} value={dates.start} onChange={e => setDates({ ...dates, start: e.target.value })} className='w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[22px] outline-none text-sm font-medium transition-all' />
                        </div>
                      </div>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Fecha Fin</label>
                        <div className='relative'>
                          <Calendar className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400' size={18} />
                          <input type='date' min={dates.start} max={getTodayStr()} value={dates.end} onChange={e => setDates({ ...dates, end: e.target.value })} className='w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-[22px] outline-none text-sm font-medium transition-all' />
                        </div>
                      </div>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Comisión Corretaje (%)</label>
                        <input type='number' step='0.01' min='0' max='5' value={feePercentage} onChange={e => setFeePercentage(Number(e.target.value))} className='w-full px-5 py-4 bg-white border border-slate-200 rounded-[22px] outline-none text-sm font-medium transition-all' />
                      </div>
                      <div className='group'>
                        <label className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block ml-1'>Comisión Mínima (COP)</label>
                        <input type='number' min='0' value={feeMin} onChange={e => setFeeMin(Number(e.target.value))} className='w-full px-5 py-4 bg-white border border-slate-200 rounded-[22px] outline-none text-sm font-medium transition-all font-mono' />
                      </div>
                    </div>
                    <button onClick={handleRun} disabled={backtest.isPending} className='w-full mt-10 py-5 bg-primary text-white rounded-[26px] font-bold text-base flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50'>
                      {backtest.isPending ? 'Ejecutando...' : <><Play size={20} className='ml-1' /> Ejecutar Simulación</>}
                    </button>
                    {error && (
                      <div className='mt-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3'>
                        <AlertTriangle size={18} className='text-rose-500 mt-0.5 shrink-0' />
                        <p className='text-[11px] text-rose-600 font-medium'>{error}</p>
                      </div>
                    )}
                  </div>
                  <div className='p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50'>
                    <div className='flex items-center gap-2 mb-3'>
                      <Lightbulb size={14} className='text-blue-500' />
                      <h4 className='text-[10px] font-bold text-blue-700 uppercase tracking-widest'>¿Qué es el Backtesting?</h4>
                    </div>
                    <p className='text-[11px] text-slate-600 mb-4'>Simulación cuantitativa con datos históricos reales.</p>
                  </div>
                </div>

                <div className='col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-8'>
                  {result ? (
                    <>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden group'>
                          <div className='flex items-center gap-2.5 mb-3'>
                            <div className='w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center'><TrendingUp size={14} className='text-emerald-500' /></div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Retorno Total</span>
                          </div>
                          <p className={cn('text-2xl font-mono font-bold', (result.total_return || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {(result.total_return || 0) > 0 ? '+' : ''}{(result.total_return || 0).toFixed(2)}%
                          </p>
                        </div>
                        
                        <div className='bg-slate-900 border border-slate-800 p-6 rounded-[32px] shadow-xl flex flex-col justify-center relative overflow-hidden'>
                          <div className='flex items-center gap-2.5 mb-3'>
                            <div className='w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center'><Shield size={14} className='text-blue-400' /></div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Sharpe Ratio</span>
                          </div>
                          <p className='text-2xl font-mono font-bold text-white'>{(result.sharpe_ratio || 0).toFixed(2)}</p>
                        </div>

                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden'>
                          <div className='flex items-center gap-2.5 mb-3'>
                            <div className='w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center'><Scale size={14} className='text-rose-500' /></div>
                            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Comisiones COP</span>
                          </div>
                          <p className='text-2xl font-mono font-bold text-rose-600'>{formatCurrency(result.total_commissions_cop || 0)}</p>
                        </div>

                        <div className='bg-white border border-slate-100 p-6 rounded-[32px] shadow-sm flex flex-col justify-center relative overflow-hidden'>
                          <div className='flex items-center justify-between mb-3'>
                            <div className='flex items-center gap-2.5'>
                              <div className='w-7 h-7 rounded-lg bg-primary/5 flex items-center justify-center'><CheckCircle2 size={14} className='text-primary' /></div>
                              <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Win Rate</span>
                            </div>
                            <span className='text-sm font-mono font-bold text-primary'>{((result.win_rate || 0) * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className='bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex-1 flex flex-col min-h-[450px] relative overflow-hidden'>
                        <div className='flex justify-between items-center mb-8'>
                          <div className='flex items-center gap-4'>
                            <div className='w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-600 shadow-inner'><TrendingUp size={22} /></div>
                            <div>
                              <h4 className='text-sm font-bold text-slate-700 uppercase tracking-widest'>Curva de Crecimiento</h4>
                            </div>
                          </div>
                          <div className='text-right bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100'>
                            <p className='text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Capital Final Obtenido</p>
                            <span className='text-2xl font-mono font-bold text-primary'>{formatCurrency(result.final_value || 0)}</span>
                          </div>
                        </div>
                        <div className='flex-1 w-full'>
                          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className='bg-slate-50/50 rounded-[48px] border border-slate-100 border-dashed min-h-[500px] flex flex-col items-center justify-center text-center p-12 flex-1'>
                      <div className='w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl border border-slate-100 mb-8 text-slate-200'><Calendar size={40} /></div>
                      <h4 className='text-2xl font-serif font-bold text-slate-700 mb-4 tracking-tight'>Listo para la Simulación</h4>
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
