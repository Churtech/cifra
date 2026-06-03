import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { 
  ArrowLeftRight, Calendar, DollarSign, Activity, AlertTriangle, 
  HelpCircle, BookOpen, Info, Shield, Award, Scale, Zap, ChevronDown 
} from 'lucide-react';
import { 
  useSimulateRetrospective, useAssets, useMarketMetrics, useBestCDT 
} from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { RetrospectiveResult } from '../types';

const RetrospectiveSimulator: React.FC = () => {
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

  // Form States
  const [initialAmountStr, setInitialAmountStr] = useState('10000000');
  const [dates, setDates] = useState({ start: getYearsAgoStr(2), end: getTodayStr() });
  const [assetTicker, setAssetTicker] = useState('SPY');
  const [cdtPlazo, setCdtPlazo] = useState(360);
  const [investorType, setInvestorType] = useState<'natural' | 'juridica'>('natural');

  const [result, setResult] = useState<RetrospectiveResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dropdown States
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [isCdtDropdownOpen, setIsCdtDropdownOpen] = useState(false);

  // Hook Queries
  const { data: etfsResponse } = useAssets({ type: 'etf' });
  const { data: stocksResponse } = useAssets({ type: 'stock' });
  const simulateMutation = useSimulateRetrospective();

  // Dynamic Best CDT Query
  const { data: bestCDTResponse } = useBestCDT({
    investment: Number(initialAmountStr) || 10000000,
    days: cdtPlazo
  });

  const assets = [...(etfsResponse?.data || []), ...(stocksResponse?.data || [])].filter(
    a => a.asset.currency === 'USD'
  );

  const assetsList = useMemo(() => {
    if (assets.length > 0) {
      return assets.map(a => ({
        ticker: a.asset.ticker,
        name: a.asset.name,
        type: a.asset.type
      }));
    }
    return [
      { ticker: 'SPY', name: 'S&P 500 ETF Trust', type: 'etf' },
      { ticker: 'QQQ', name: 'Invesco QQQ Trust', type: 'etf' },
      { ticker: 'AAPL', name: 'Apple Inc.', type: 'stock' }
    ];
  }, [assets]);

  const selectedAsset = useMemo(() => {
    return assetsList.find(a => a.ticker === assetTicker) || assetsList[0];
  }, [assetsList, assetTicker]);

  const filteredDropdownAssets = useMemo(() => {
    return assetsList.filter(a => 
      a.ticker.toLowerCase().includes(assetSearch.toLowerCase()) ||
      a.name.toLowerCase().includes(assetSearch.toLowerCase())
    );
  }, [assetsList, assetSearch]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setInitialAmountStr(value);
  };

  const handleSimulate = async () => {
    const amount = Number(initialAmountStr);
    if (isNaN(amount) || amount <= 0) {
      setError('Por favor ingresa un monto inicial válido mayor a 0.');
      return;
    }

    try {
      setError(null);
      setResult(null);
      const res = await simulateMutation.mutateAsync({
        initial_amount_cop: amount,
        start_date: `${dates.start}T00:00:00Z`,
        end_date: `${dates.end}T23:59:59Z`,
        asset_ticker: assetTicker,
        cdt_plazo_dias: cdtPlazo,
        investor_type: investorType
      });
      setResult(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error || 
        err.message || 
        'Error ejecutando la simulación. Verifica que el activo posea precios históricos en el rango seleccionado.'
      );
    }
  };

  // Re-run simulation automatically when quick toggles change (if result is already visible)
  React.useEffect(() => {
    if (result) {
      const amount = Number(initialAmountStr);
      if (!isNaN(amount) && amount > 0) {
        simulateMutation.mutateAsync({
          initial_amount_cop: amount,
          start_date: `${dates.start}T00:00:00Z`,
          end_date: `${dates.end}T23:59:59Z`,
          asset_ticker: assetTicker,
          cdt_plazo_dias: cdtPlazo,
          investor_type: investorType
        }).then(res => {
          setResult(res.data);
        }).catch(err => {
          setError(
            err.response?.data?.error || 
            err.message || 
            'Error ejecutando la simulación.'
          );
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetTicker, cdtPlazo, investorType]);

  const chartOption = useMemo(() => {
    if (!result) return {};

    const cdtValues = result.cdt_trajectory.daily_values;
    const usdValues = result.usd_trajectory.daily_values;

    const datesAxis = cdtValues.map(v => v.date);

    return {
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
              <span style="font-weight:bold;font-size:11px;color:#1e293b">${formatCurrency(item.value)}</span>
            </div>`;
          });
          return res;
        }
      },
      legend: {
        data: ['CDT COP', `${result.request.asset_ticker} (COP con TRM)`],
        bottom: 0,
        textStyle: { fontSize: 10, color: '#64748b', fontWeight: 'bold' }
      },
      grid: { left: '3%', right: '3%', bottom: '15%', top: '8%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: datesAxis,
        axisLabel: { 
          fontSize: 9, 
          color: '#94a3b8', 
          fontWeight: 'bold',
          interval: Math.floor(datesAxis.length / 6)
        },
        axisLine: { lineStyle: { color: '#F1F5F9' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: '#94a3b8',
          fontWeight: 'bold',
          formatter: (val: number) => `$${(val / 1000000).toFixed(1)}M`
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#F1F5F9' } }
      },
      series: [
        {
          name: 'CDT COP',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: cdtValues.map(v => v.value_cop),
          lineStyle: { width: 3, color: '#10B981' },
          itemStyle: { color: '#10B981' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.1)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]
            }
          }
        },
        {
          name: `${result.request.asset_ticker} (COP con TRM)`,
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: usdValues.map(v => v.value_cop),
          lineStyle: { width: 3, color: '#0F172A' },
          itemStyle: { color: '#0F172A' },
          areaStyle: {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(15, 23, 42, 0.05)' }, { offset: 1, color: 'rgba(15, 23, 42, 0)' }]
            }
          }
        }
      ]
    };
  }, [result]);

  return (
    <div className='space-y-10 pb-20'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-6'>
        <div>
          <h2 className='text-4xl md:text-5xl font-serif text-primary tracking-tight'>Simulador Retrospectivo</h2>
          <p className='text-sm text-slate-500 mt-3 max-w-xl'>
            Compara el rendimiento histórico de un CDT colombiano contra un activo en dólares (convertido mediante TRM diaria), aplicando impuestos y comisiones.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10'>
        {/* Form Column */}
        <div className='col-span-1 space-y-6'>
          <div className='p-8 bg-white rounded-[40px] border border-slate-100 shadow-sm space-y-6'>
            <div className='flex items-center gap-2 pb-4 border-b border-slate-100'>
              <Scale size={16} className='text-primary' />
              <h4 className='text-xs font-bold text-primary uppercase tracking-widest'>Parámetros</h4>
            </div>

            <div className='space-y-4'>
              <div className='group'>
                <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block ml-1'>Capital Inicial (COP)</label>
                <div className='relative'>
                  <DollarSign className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors pointer-events-none' size={18} />
                  <input
                    type='text'
                    value={initialAmountStr ? Number(initialAmountStr).toLocaleString('es-CO') : ''}
                    onChange={handleAmountChange}
                    className='w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all font-mono'
                    placeholder='10,000,000'
                  />
                </div>
              </div>

              <div className='group'>
                <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1'>Fecha Inicio</label>
                <input
                  type='date'
                  max={dates.end}
                  value={dates.start}
                  onChange={e => setDates({ ...dates, start: e.target.value })}
                  className='w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all cursor-pointer'
                />
              </div>

              <div className='group'>
                <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1'>Fecha Fin</label>
                <input
                  type='date'
                  min={dates.start}
                  max={getTodayStr()}
                  value={dates.end}
                  onChange={e => setDates({ ...dates, end: e.target.value })}
                  className='w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[22px] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/30 text-sm font-medium transition-all cursor-pointer'
                />
              </div>

              <div className='relative'>
                <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1'>Activo en USD</label>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsAssetDropdownOpen(!isAssetDropdownOpen)}
                  className='w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[22px] outline-none text-left flex justify-between items-center text-sm font-bold text-primary transition-all cursor-pointer hover:bg-slate-100/50'
                >
                  <div className='truncate pr-4'>
                    <span className='font-mono font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-lg mr-2'>{selectedAsset?.ticker}</span>
                    <span className='text-slate-600 font-normal text-xs'>{selectedAsset?.name}</span>
                  </div>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform duration-200 shrink-0', isAssetDropdownOpen ? 'rotate-180' : 'rotate-0')} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isAssetDropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div className='fixed inset-0 z-20' onClick={() => setIsAssetDropdownOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className='absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[26px] shadow-2xl p-4 z-30 flex flex-col gap-3 max-h-80 overflow-hidden'
                      >
                        {/* Search Input */}
                        <div className='relative'>
                          <input
                            type="text"
                            placeholder="Buscar activo por ticker o nombre..."
                            value={assetSearch}
                            onChange={e => setAssetSearch(e.target.value)}
                            className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:border-primary/50 transition-colors'
                          />
                        </div>

                        {/* List Items */}
                        <div className='overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-1 max-h-52'>
                          {filteredDropdownAssets.map(asset => {
                            const isCurrent = asset.ticker === assetTicker;
                            return (
                              <div
                                key={asset.ticker}
                                onClick={() => {
                                  setAssetTicker(asset.ticker);
                                  setIsAssetDropdownOpen(false);
                                  setAssetSearch('');
                                }}
                                className={cn(
                                  'px-3 py-2.5 rounded-xl cursor-pointer flex justify-between items-center transition-all',
                                  isCurrent ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-50 text-primary'
                                )}
                              >
                                <div className='truncate pr-2'>
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
                          {filteredDropdownAssets.length === 0 && (
                            <div className='p-4 text-xs text-center text-slate-400'>No se encontraron activos</div>
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className='relative'>
                <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1'>Plazo CDT</label>
                
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsCdtDropdownOpen(!isCdtDropdownOpen)}
                  className='w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[22px] outline-none text-left flex justify-between items-center text-sm font-bold text-primary transition-all cursor-pointer hover:bg-slate-100/50'
                >
                  <div className='truncate pr-4 flex items-center'>
                    <span className='font-mono font-bold bg-primary/5 text-primary px-2 py-0.5 rounded-lg mr-2'>{cdtPlazo}D</span>
                    <span className='text-slate-600 font-normal text-xs'>
                      {cdtPlazo === 90 ? '3 Meses (Corto Plazo)' : cdtPlazo === 180 ? '6 Meses (Mediano Plazo)' : '12 Meses (Largo Plazo)'}
                    </span>
                  </div>
                  <ChevronDown size={16} className={cn('text-slate-400 transition-transform duration-200 shrink-0', isCdtDropdownOpen ? 'rotate-180' : 'rotate-0')} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isCdtDropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div className='fixed inset-0 z-20' onClick={() => setIsCdtDropdownOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className='absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[26px] shadow-2xl p-4 z-30 flex flex-col gap-2 overflow-hidden'
                      >
                        {[90, 180, 360].map(plazo => {
                          const isCurrent = cdtPlazo === plazo;
                          const label = plazo === 90 ? '3 Meses • Corto Plazo' : plazo === 180 ? '6 Meses • Mediano Plazo' : '12 Meses • Largo Plazo';
                          return (
                            <div
                              key={plazo}
                              onClick={() => {
                                setCdtPlazo(plazo);
                                setIsCdtDropdownOpen(false);
                              }}
                              className={cn(
                                'px-3 py-2.5 rounded-xl cursor-pointer flex justify-between items-center transition-all',
                                isCurrent ? 'bg-primary text-white shadow-sm font-bold' : 'hover:bg-slate-50 text-primary'
                              )}
                            >
                              <div className='truncate pr-2'>
                                <span className={cn('font-mono font-bold text-xs px-2 py-0.5 rounded-md mr-2', isCurrent ? 'bg-white/10' : 'bg-slate-100 text-slate-700')}>{plazo}D</span>
                                <span className={cn('text-xs font-normal', isCurrent ? 'text-white/80' : 'text-slate-500')}>{label}</span>
                              </div>
                              {isCurrent && <div className='w-1.5 h-1.5 rounded-full bg-white shrink-0' />}
                            </div>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
                <p className='text-[9px] text-slate-400 leading-normal mt-2 ml-1 font-medium'>
                  💡 Se autoselecciona la mejor tasa real histórica registrada en Colombia para esa fecha de inicio.
                </p>
                {bestCDTResponse?.data?.cdt && (
                  <div className='mt-3 p-3 bg-emerald-50/40 border border-emerald-100/30 rounded-xl flex items-start gap-2 text-[10px] text-emerald-800 leading-relaxed font-semibold'>
                    <Info size={12} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      Tasa actual de referencia: <span className='text-emerald-700 font-extrabold'>{bestCDTResponse.data.cdt.tasa_ea.toFixed(2)}% E.A.</span>
                      <span className='block text-[9px] font-normal text-slate-500 mt-0.5'>({bestCDTResponse.data.cdt.institution?.name || 'Superfinanciera'})</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className='block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1'>Tipo de Inversionista</label>
                <div className='flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100'>
                  <button
                    onClick={() => setInvestorType('natural')}
                    className={cn(
                      'flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all',
                      investorType === 'natural' ? 'bg-primary text-white shadow-md' : 'text-slate-400'
                    )}
                  >
                    P. Natural
                  </button>
                  <button
                    onClick={() => setInvestorType('juridica')}
                    className={cn(
                      'flex-1 py-2 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all',
                      investorType === 'juridica' ? 'bg-primary text-white shadow-md' : 'text-slate-400'
                    )}
                  >
                    P. Jurídica
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleSimulate}
              disabled={simulateMutation.isPending}
              className='w-full mt-6 py-5 bg-primary text-white rounded-[26px] font-bold text-base shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50'
            >
              {simulateMutation.isPending ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full' />
              ) : (
                <><ArrowLeftRight size={20} /> Ejecutar Simulación</>
              )}
            </button>

            {error && (
              <div className='p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 mt-4'>
                <AlertTriangle size={18} className='text-rose-500 mt-0.5 shrink-0' />
                <p className='text-[11px] text-rose-600 leading-relaxed font-medium'>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Output Column */}
        <div className='col-span-1 md:col-span-2 lg:col-span-3 flex flex-col gap-8'>
          {result ? (
            <>
              {/* Winner Banner */}
              {(() => {
                const cdtFinalVal = result.cdt_trajectory.final_cop;
                const usdFinalVal = result.usd_trajectory.final_cop;
                const isCdtWinner = result.winner === 'CDT';
                const winnerName = isCdtWinner ? 'CDT colombiano' : `${result.request.asset_ticker} en USD`;
                const loserName = isCdtWinner ? result.request.asset_ticker : 'CDT';
                const diffCOP = Math.abs(usdFinalVal - cdtFinalVal);
                const loserVal = isCdtWinner ? usdFinalVal : cdtFinalVal;
                const diffPct = loserVal > 0 ? (diffCOP / loserVal) * 100 : 0;

                return (
                  <div className={cn(
                    'p-8 rounded-[40px] border shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6',
                    isCdtWinner ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-200'
                  )}>
                    <div className='flex items-center gap-4'>
                      <div className={cn(
                        'w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner',
                        isCdtWinner ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-primary text-white border-slate-800'
                      )}>
                        {isCdtWinner ? <Award size={28} /> : <Zap size={28} />}
                      </div>
                      <div>
                        <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest'>Simulación Finalizada</span>
                        <h3 className='text-2xl font-serif font-bold text-primary mt-1'>
                          Ganador: {winnerName}
                        </h3>
                        <p className='text-xs text-slate-500 font-medium mt-1'>
                          Esta estrategia obtuvo <strong className='text-slate-700'>{formatCurrency(diffCOP)} COP</strong> ({diffPct.toFixed(2)}%) más que {loserName === 'CDT' ? 'el CDT' : `el activo ${loserName}`}.
                        </p>
                      </div>
                    </div>

                    <div className='text-left md:text-right'>
                      <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1'>Diferencia Acumulada</span>
                      <p className='text-2xl font-mono font-bold text-emerald-600'>
                        + {formatCurrency(diffCOP)} <span className='text-sm font-sans font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg ml-1'>(+{diffPct.toFixed(2)}% vs. {loserName})</span>
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Stats Cards */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='bg-white border border-slate-100 p-8 rounded-[36px] shadow-sm relative overflow-hidden'>
                  <div className='flex items-center gap-2.5 mb-4'>
                    <div className='w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500'>
                      <Shield size={16} />
                    </div>
                    <div className='flex flex-col'>
                      <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Estrategia Local (CDT)</span>
                      {result.cdt_trajectory.metadata?.institution && (
                        <span className='text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5'>
                          Entidad: {result.cdt_trajectory.metadata.institution}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className='text-3xl font-mono font-bold text-primary tracking-tighter'>
                    {formatCurrency(result.cdt_trajectory.final_cop)}
                  </p>
                  <div className='flex flex-wrap items-center gap-2 mt-4 text-[10px] text-slate-500 font-bold uppercase'>
                    <span className='text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[9px]'>
                      Retorno: {(result.cdt_trajectory.total_return * 100).toFixed(2)}%
                    </span>
                    {result.cdt_trajectory.metadata?.tasa_ea && (
                      <span className='text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[9px]'>
                        Tasa: {Number(result.cdt_trajectory.metadata.tasa_ea).toFixed(2)}% E.A.
                      </span>
                    )}
                    {result.cdt_trajectory.metadata?.retencion_pct !== undefined && (
                      <span className='text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[9px]' title="Impuesto de Retención en la Fuente sobre rendimientos financieros (Art. 395 E.T.)">
                        Retención: {parseFloat(Number(result.cdt_trajectory.metadata.retencion_pct).toFixed(2))}%
                      </span>
                    )}
                    {result.cdt_trajectory.metadata?.tasa_neta_ea && (
                      <span className='text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[9px]'>
                        Neta: {Number(result.cdt_trajectory.metadata.tasa_neta_ea).toFixed(2)}% E.A.
                      </span>
                    )}
                    <span className='text-slate-400 py-0.5 text-[9px]'>Plazo: {result.request.cdt_plazo_dias} Días</span>
                  </div>
                </div>

                <div className='bg-white border border-slate-100 p-8 rounded-[36px] shadow-sm relative overflow-hidden'>
                  <div className='flex items-center gap-2.5 mb-4'>
                    <div className='w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white'>
                      <DollarSign size={16} />
                    </div>
                    <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
                      Estrategia Global ({result.request.asset_ticker})
                    </span>
                  </div>
                  <p className='text-3xl font-mono font-bold text-primary tracking-tighter'>
                    {formatCurrency(result.usd_trajectory.final_cop)}
                  </p>
                  <div className='flex items-center gap-2 mt-4 text-[10px] text-slate-500 font-bold uppercase'>
                    <span className='text-slate-900 bg-slate-100 px-2 py-0.5 rounded'>
                      Retorno COP: {(result.usd_trajectory.total_return * 100).toFixed(2)}%
                    </span>
                    <span>Ticker: {result.request.asset_ticker}</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className='bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm flex flex-col min-h-[450px] relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-primary to-blue-500' />
                <div className='flex justify-between items-center mb-8'>
                  <div>
                    <h4 className='text-sm font-bold text-slate-700 uppercase tracking-widest'>Trayectorias de Capital</h4>
                    <p className='text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1'>Crecimiento Proyectado en COP (Base 100 Real)</p>
                  </div>
                </div>
                <div className='flex-1 w-full'>
                  <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>

              {/* Caja de Cristal & Education details */}
              <div className='space-y-4'>
                <div className='p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4'>
                  <div className='flex items-center gap-3 pb-3 border-b border-slate-200'>
                    <BookOpen size={18} className='text-primary' />
                    <h4 className='text-xs font-bold text-primary uppercase tracking-widest'>
                      Caja de Cristal Educativa: CDT vs. USD Asset
                    </h4>
                  </div>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                    <div className='space-y-4'>
                      <div>
                        <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
                          Lógica Financiera CDT
                        </h5>
                        <p className='text-xs text-slate-600 leading-relaxed'>
                          El capital crece linealmente devengando la tasa E.A. del momento en pesos, restándole el **7% de Retención en la Fuente** sobre los intereses brutos generados (según el Artículo 395 del Estatuto Tributario).
                        </p>
                      </div>
                      <div>
                        <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
                          Lógica Financiera USD Asset
                        </h5>
                        <p className='text-xs text-slate-600 leading-relaxed'>
                          El capital se convierte a dólares el Día Cero usando la TRM oficial. Compra el activo en USD y sigue su fluctuación de precios. Al final del horizonte, vende el activo y convierte el capital de dólares a pesos usando la TRM vigente ese día, asumiendo la devaluación/revaluación del COP.
                        </p>
                      </div>
                    </div>

                    <div className='space-y-4'>
                      <div>
                        <h5 className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>
                          Fórmulas Utilizadas
                        </h5>
                        <div className='space-y-2.5'>
                          {result.education.formulas_usage && Object.entries(result.education.formulas_usage).map(([m, f]) => (
                            <div key={m} className='bg-white p-3 rounded-lg border border-slate-100 shadow-sm'>
                              <p className='text-[9px] font-bold text-primary uppercase mb-1'>{m}</p>
                              <code className='text-[10px] font-mono block text-slate-600 font-bold overflow-x-auto whitespace-pre-wrap'>{f}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {result.education.disclaimers?.length > 0 && (
                    <div className='pt-4 border-t border-slate-200'>
                      <p className='text-[9px] text-slate-400 leading-relaxed italic bg-white p-4 rounded-xl border border-slate-100 shadow-sm'>
                        * {result.education.disclaimers.join('\n* ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className='bg-slate-50/50 rounded-[48px] border border-slate-100 border-dashed min-h-[500px] flex flex-col items-center justify-center text-center p-12 flex-1 shadow-inner'>
              <div className='w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-xl border border-slate-100 mb-8 text-slate-200'>
                <Activity size={40} />
              </div>
              <h4 className='text-2xl font-serif font-bold text-slate-700 mb-4 tracking-tight'>Listo para la Simulación Histórica</h4>
              <p className='text-slate-400 text-base max-w-md leading-relaxed'>
                Configura los activos y rango de fechas a la izquierda, y corre la comparativa para analizar el veredicto del capital local vs internacional.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetrospectiveSimulator;
