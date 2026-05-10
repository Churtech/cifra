import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, ArrowDownRight, Shield, Zap, Activity, Search, Database } from 'lucide-react';
import { useAssets, useAssetHistory, useMarketMetrics } from '../hooks/useFinance';
import { cn, isValidNumber } from '../lib/utils';
import { AssetDetail } from '../types';

const AssetsView: React.FC = () => {
  const [selectedType, setSelectedType] = useState<'etf' | 'stock'>('etf');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAssetTicker, setActiveAssetTicker] = useState<string | null>(null);

  const { data: assetsResponse, isLoading: loadingAssets } = useAssets({ type: selectedType });
  const assets = assetsResponse?.data || [];

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a?.asset?.ticker?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a?.asset?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  const activeAsset = useMemo(() => {
    return filteredAssets.find(a => a?.asset?.ticker === activeAssetTicker) || filteredAssets[0];
  }, [filteredAssets, activeAssetTicker]);

  const { data: metricsResponse } = useMarketMetrics();
  const trmCurrent = metricsResponse?.data?.trm_current || 0;

  const { data: historyResponse } = useAssetHistory(activeAsset?.asset?.ticker || '');
  const history = historyResponse?.data || [];

  const chartData = useMemo(() => history.map(p => p?.close || 0), [history]);
  const chartLabels = useMemo(() => history.map(p => p?.date ? new Date(p.date).toLocaleDateString() : '---'), [history]);

  const currentPrice = useMemo(() => {
    if (history.length > 0) return history[history.length - 1]?.close;
    return activeAsset?.asset?.currency === 'COP' ? activeAsset?.price_cop : activeAsset?.price_usd;
  }, [history, activeAsset]);

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 11, fontFamily: 'Inter' },
      padding: [8, 12],
    },
    grid: { left: '1%', right: '1%', bottom: '5%', top: '5%', containLabel: false },
    xAxis: { type: 'category', boundaryGap: false, show: false, data: chartLabels },
    yAxis: { type: 'value', show: false, min: 'dataMin', max: 'dataMax' },
    series: [{
      name: 'Precio',
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: '#111827' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(17, 24, 39, 0.04)' }, { offset: 1, color: 'rgba(17, 24, 39, 0)' }]
        }
      },
      data: chartData
    }]
  };

  if (loadingAssets && !assetsResponse) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] space-y-6'>
        <div className='w-12 h-12 border-4 border-slate-100 border-t-primary rounded-full animate-spin' />
        <p className='text-xs font-bold tracking-[0.3em] text-slate-400 uppercase'>Sincronizando Mercados...</p>
      </div>
    );
  }

  return (
    <div className='space-y-6 pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight'>Explorador de Activos</h2>
          <div className='flex items-center gap-2 mt-1'>
             <div className='flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-bold text-emerald-700 uppercase tracking-widest'>
               <Database size={12} /> Datos Reales
             </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col lg:flex-row gap-4'>
        <div className='flex-1 flex gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm'>
          {(['etf', 'stock'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                'flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all',
                selectedType === type ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
              )}
            >
              {type === 'etf' ? 'ETFs' : 'Acciones'}
            </button>
          ))}
        </div>
        <div className='relative lg:w-80'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={16} />
          <input 
            type='text'
            placeholder='Buscar activo...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all'
          />
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-4 gap-6'>
        <div className='xl:col-span-1 space-y-3 max-h-[700px] overflow-y-auto pr-1 custom-scrollbar'>
          {filteredAssets.length > 0 ? filteredAssets.map((item) => {
             const change = (item?.change_1d && item?.change_1d !== 0) 
               ? item?.change_1d 
               : (item?.change_7d || item?.annual_return);
             return (
              <button
                key={item?.asset?.ticker}
                onClick={() => setActiveAssetTicker(item?.asset?.ticker)}
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-all group relative overflow-hidden',
                  activeAsset?.asset?.ticker === item?.asset?.ticker 
                    ? 'bg-white border-primary shadow-lg shadow-primary/5' 
                    : 'bg-white border-slate-100 hover:border-slate-300'
                )}
              >
                <div className='flex justify-between items-start mb-1'>
                  <span className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>{item?.asset?.currency}</span>
                  <div className={cn(
                    'text-[9px] font-mono font-bold',
                    !isValidNumber(change) ? 'text-slate-300' : (change > 0 ? 'text-emerald-500' : 'text-rose-500')
                  )}>
                    {isValidNumber(change) ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : '---'}
                  </div>
                </div>
                <h4 className='text-base font-serif font-bold text-primary leading-none'>{item?.asset?.ticker}</h4>
                <p className='text-[10px] text-slate-500 truncate mt-1'>{item?.asset?.name}</p>
              </button>
             );
          }) : (
             <p className='text-xs text-slate-400 text-center py-10'>No hay activos disponibles en esta categoría</p>
          )}
        </div>

        <div className='xl:col-span-3 space-y-6'>
          {activeAsset ? (
            <>
              <div className='bg-white p-6 md:p-10 rounded-2xl border border-slate-100 shadow-sm'>
                <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6'>
                  <div className='flex-1 space-y-4'>
                    <div className='flex items-center gap-2'>
                      <span className='px-2 py-0.5 bg-primary text-white text-[9px] font-bold tracking-widest uppercase rounded'>
                        {activeAsset?.asset?.type}
                      </span>
                      <span className='text-slate-400 font-mono text-[10px] font-bold'>
                        {activeAsset?.asset?.ticker} • {activeAsset?.asset?.currency}
                      </span>
                    </div>
                    <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight leading-tight'>
                      {activeAsset?.asset?.name}
                    </h2>
                  </div>
                  <div className='lg:w-56 bg-slate-50 p-6 rounded-xl border border-slate-100 text-right flex flex-col justify-center'>
                    <p className='text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Precio {activeAsset?.asset?.currency || 'USD'}</p>
                    <h3 className='text-3xl font-mono font-bold tracking-tighter text-primary'>
                      ${(currentPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h3>
                    {activeAsset?.asset?.currency !== 'COP' ? (
                      <p className='text-[10px] font-mono text-slate-400 mt-0.5'>
                        ~ {(trmCurrent > 0 && currentPrice ? currentPrice * trmCurrent : (activeAsset?.price_cop || 0)).toLocaleString('es-CO', { minimumFractionDigits: 0 })} COP
                      </p>
                    ) : null}
                    {(() => {
                      const activeChange = (activeAsset?.change_1d && activeAsset?.change_1d !== 0) 
                        ? activeAsset?.change_1d 
                        : (activeAsset?.change_7d || activeAsset?.annual_return);
                      return (
                        <div className={cn(
                          'inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full font-mono font-bold text-[10px]',
                          !isValidNumber(activeChange) ? 'bg-slate-100 text-slate-400' : (activeChange > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')
                        )}>
                          {isValidNumber(activeChange) ? (activeChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />) : null}
                          <span>{isValidNumber(activeChange) ? `${activeChange.toFixed(2)}%` : '---'}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <div className='lg:col-span-2 bg-white border border-slate-100 p-6 shadow-sm rounded-2xl'>
                  <div className='flex items-center gap-2 mb-6'>
                    <Activity size={16} className='text-primary' />
                    <h4 className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>Historial Sincronizado</h4>
                  </div>
                  <div className='h-[300px] w-full'>
                    <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
                  </div>
                </div>

                <div className='bg-primary rounded-2xl p-6 text-white space-y-6 shadow-xl shadow-primary/10'>
                  <h4 className='text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/10 pb-3'>Ficha Técnica</h4>
                  <div className='grid grid-cols-1 gap-4'>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-white/10 rounded-lg'><Shield size={16} className='text-emerald-400' /></div>
                      <div>
                        <p className='text-[8px] font-bold text-white/40 uppercase tracking-widest'>Riesgo</p>
                        <p className='text-base font-mono font-bold'>{activeAsset?.risk || '---'}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-white/10 rounded-lg'><Zap size={16} className='text-emerald-400' /></div>
                      <div>
                        <p className='text-[8px] font-bold text-white/40 uppercase tracking-widest'>Volatilidad</p>
                        <p className='text-base font-mono font-bold'>{isValidNumber(activeAsset?.volatility) ? `${activeAsset.volatility.toFixed(2)}%` : '---'}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <div className='p-2 bg-white/10 rounded-lg'><ArrowUpRight size={16} className='text-emerald-400' /></div>
                      <div>
                        <p className='text-[8px] font-bold text-white/40 uppercase tracking-widest'>Retorno Anual</p>
                        <p className='text-base font-mono font-bold'>{isValidNumber(activeAsset?.annual_return) ? `${(activeAsset.annual_return).toFixed(2)}%` : '---'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className='h-full flex items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-20 text-center'>
               <p className='text-[10px] text-slate-400 uppercase tracking-widest font-bold'>Selecciona un activo para ver detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetsView;
