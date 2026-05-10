import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { Wallet, TrendingUp, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
import StatCard from '../components/StatCard';
import { useBestCDT, useMarketMetrics, useAssets, useTRMMetrics } from '../hooks/useFinance';
import { formatCurrency, isValidNumber } from '../lib/utils';
import { AssetDetail } from '../types';

interface DashboardProps {
  onViewChange?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onViewChange }) => {
  const { data: bestCDTResponse, isLoading: loadingCDT } = useBestCDT();
  const { data: metricsResponse, isLoading: loadingMetrics } = useMarketMetrics();
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets({ type: 'etf' });
  const { data: trmMetricsResponse } = useTRMMetrics(7);

  const metrics = metricsResponse?.data;
  const bestCDT = bestCDTResponse?.data;
  const assets = assetsResponse?.data || [];
  const trmMetrics = trmMetricsResponse?.data;

  const currentTRM = trmMetrics?.current || metrics?.trm_current;
  const trmChange = trmMetrics?.change_7d || metrics?.trm_change_7d;
  const inflation = 5.68; // TODO: Hardcodeado (DANE abril 2026) mientras se arregla el backend

  const bestCDTValue = bestCDT?.cdt?.tasa_ea;
  const bestCDTEntity = bestCDT?.cdt?.institution?.name;

  // Valores de referencia TRM (Máximos/Mínimos)
  const trmHigh = trmMetrics?.high_52w;
  const trmLow = trmMetrics?.low_52w;

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: '#111827', fontSize: 11, fontFamily: 'Inter' },
      padding: [8, 12],
      valueFormatter: (value: any) => typeof value === 'number' ? value.toFixed(2) + '%' : value
    },
    legend: {
      data: ['Rendimiento CDT', 'Retorno ETF'],
      bottom: 0,
      itemWidth: 8,
      itemHeight: 8,
      textStyle: { fontSize: 10 }
    },
    grid: { left: '1%', right: '1%', bottom: '15%', top: '5%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: assets.length > 0 ? ['T-2', 'T-1', 'Actual'] : [],
      axisLabel: { fontSize: 10 }
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
    series: [
      {
        name: 'Rendimiento CDT',
        type: 'line',
        smooth: true,
        data: isValidNumber(bestCDTValue) ? [bestCDTValue, bestCDTValue, bestCDTValue] : [],
        lineStyle: { width: 2, color: '#10B981' }
      },
      {
        name: 'Retorno ETF',
        type: 'line',
        smooth: true,
        data: assets.length > 0 && isValidNumber(assets[0]?.annual_return) ? [assets[0]?.annual_return, assets[0]?.annual_return, assets[0]?.annual_return] : [],
        lineStyle: { width: 2, color: '#111827' }
      }
    ]
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight leading-tight'>Panorama del Mercado</h2>
          <div className='flex items-center gap-2 mt-1'>
            <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span className='text-[9px] font-bold text-slate-400 uppercase tracking-widest'>Sincronización Activa</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatCard
          label={loadingCDT ? 'Sincronizando...' : (bestCDTEntity || 'CDT Destacado')}
          value={loadingCDT ? '...' : (isValidNumber(bestCDTValue) ? bestCDTValue.toFixed(2) : '0.00')}
          suffix='%'
          icon={Wallet}
          color='emerald'
          onClick={() => onViewChange?.('cdts')}
        />
        <StatCard
          label='TRM Actual'
          value={loadingMetrics ? '...' : formatCurrency(currentTRM)}
          change={isValidNumber(trmChange) ? Number(trmChange.toFixed(2)) : undefined}
          icon={DollarSign}
          color='primary'
        />
        <StatCard
          label='Mejor ETF'
          value={loadingAssets ? '...' : (assets.length > 0 && isValidNumber(assets[0]?.annual_return) ? assets[0]?.annual_return.toFixed(2) : '0.00')}
          suffix='%'
          icon={TrendingUp}
          color='amber'
          onClick={() => onViewChange?.('assets')}
        />
        <StatCard
          label='Inflación IPC'
          value={loadingMetrics ? '...' : (inflation != null ? inflation.toFixed(2) : '---')}
          suffix={(!loadingMetrics && inflation != null) ? '%' : ''}
          icon={PieChart}
          color='rose'
          onClick={() => onViewChange?.('metrics')}
        />
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        <div className='xl:col-span-2 bg-white border border-slate-100 p-6 shadow-sm rounded-xl'>
          <div className='flex items-center justify-between mb-6'>
            <h3 className='font-serif text-xl text-primary tracking-tight'>Trayectorias Comparativas</h3>
            <button className='text-accent p-1 hover:bg-slate-50 rounded' onClick={() => onViewChange?.('compare')}>
              <ArrowUpRight size={16} />
            </button>
          </div>
          <div className='h-[350px] w-full'>
            {loadingMetrics ? (
              <div className='h-full w-full bg-slate-50 animate-pulse rounded-lg flex items-center justify-center'>
                <span className='text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]'>Calculando Proyecciones...</span>
              </div>
            ) : (
              <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
            )}
          </div>
          <div className='mt-4 pt-4 border-t border-slate-50 flex items-center gap-6'>
            <div>
              <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>TRM Máximo 52s</p>
              <p className='text-xs font-mono font-bold text-primary'>{(trmHigh && trmHigh > 0 && !isNaN(trmHigh)) ? formatCurrency(trmHigh) : formatCurrency(4150)}</p>
            </div>
            <div>
              <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>TRM Mínimo 52s</p>
              <p className='text-xs font-mono font-bold text-primary'>{(trmLow && trmLow > 0 && !isNaN(trmLow)) ? formatCurrency(trmLow) : formatCurrency(3720)}</p>
            </div>
          </div>
        </div>

        <div className='bg-white border border-slate-100 p-6 shadow-sm rounded-xl flex flex-col'>
          <div className='flex items-center justify-between mb-6 pb-2 border-b border-slate-50'>
            <h3 className='font-serif text-lg text-primary tracking-tight'>Activos Sincronizados</h3>
          </div>
          <div className='space-y-3 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar pr-1'>
            {assets.length > 0 ? assets.slice(0, 10).map((item: AssetDetail, idx: number) => {
              const change = (item?.change_1d && item?.change_1d !== 0)
                ? item?.change_1d
                : (item?.change_7d || item?.annual_return);

              return (
                <div
                  key={idx}
                  className='flex items-center gap-3 p-2 hover:bg-slate-50 transition-all rounded-lg cursor-pointer group'
                  onClick={() => onViewChange?.('assets')}
                >
                  <div className='w-7 h-7 bg-slate-100 group-hover:bg-primary group-hover:text-white transition-colors rounded flex items-center justify-center text-[9px] font-bold text-slate-500'>
                    {item?.asset?.ticker?.substring(0, 2) || '??'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h4 className='text-xs font-bold text-primary truncate leading-none'>{item?.asset?.name}</h4>
                    <p className='text-[9px] text-slate-400 uppercase font-bold mt-0.5'>{item?.asset?.ticker}</p>
                  </div>
                  <div className='text-right'>
                    <p className={`text-[11px] font-bold ${!isValidNumber(change) ? 'text-slate-400' : (change > 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                      {isValidNumber(change) ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : '---'}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className='text-center py-10 text-slate-400 text-[10px] uppercase tracking-widest font-bold'>
                Esperando datos de API...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
