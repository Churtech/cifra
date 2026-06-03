import React from 'react';
import { motion } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { BarChart3, Gauge, Globe2, Cpu, Server } from 'lucide-react';
import { useMarketMetrics, useAssets } from '../hooks/useFinance';

const MetricsView: React.FC = () => {
  const { data: metricsResponse, isLoading: loadingMetrics } = useMarketMetrics();
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets({ type: 'etf' });
  
  const metrics = metricsResponse?.data;
  const etfs = assetsResponse?.data || [];
  const isLoading = loadingMetrics || loadingAssets;

  // Cálculo basado en datos reales
  const bestCdtRate = metrics?.best_cdt_rate || 10;
  
  const avgEtfReturn = etfs.length > 0 ? etfs.reduce((acc, curr) => acc + (curr.annual_return || 0), 0) / etfs.length : 12;
  const avgEtfVolatility = etfs.length > 0 ? etfs.reduce((acc, curr) => acc + (curr.volatility || 15), 0) / etfs.length : 15;

  const radarOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: '#6B7280', fontSize: 10, fontFamily: 'Inter' }
    },
    radar: {
      indicator: [
        { name: 'Liquidez', max: 100 },
        { name: 'Retorno', max: 100 },
        { name: 'Seguridad', max: 100 },
        { name: 'Costo Eficiente', max: 100 },
        { name: 'Accesibilidad', max: 100 }
      ],
      shape: 'circle',
      axisName: { color: '#6B7280', fontSize: 9, fontWeight: 'bold' },
    },
    series: [{
      name: 'Perfiles',
      type: 'radar',
      data: metrics ? [
        {
          value: [30, Math.min(100, (bestCdtRate / 15) * 100), 95, 90, 70],
          name: 'Renta Fija (CDTs)',
          itemStyle: { color: '#64748B' }, // Slate
          areaStyle: { color: 'rgba(100, 116, 139, 0.1)' }
        },
        {
          value: [95, Math.min(100, (avgEtfReturn / 15) * 100), Math.max(0, 100 - avgEtfVolatility * 2), 75, 90],
          name: 'Renta Variable (ETFs)',
          itemStyle: { color: '#10B981' }, // Emerald
          areaStyle: { color: 'rgba(16, 185, 129, 0.2)' }
        }
      ] : []
    }]
  };

  const barOption = {
    xAxis: {
      type: 'category',
      data: ['90d', '180d', '360d'],
      axisLabel: { color: '#9CA3AF' }
    },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
    series: [{
      data: metrics ? [
        metrics.cdt_average_90d || 0, 
        metrics.cdt_average_180d || 0, 
        metrics.cdt_average_360d || 0
      ] : [],
      type: 'bar',
      itemStyle: { color: '#10B981', borderRadius: [4, 4, 0, 0] }
    }]
  };

  return (
    <div className='space-y-10 pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6'>
        <div>
          <h2 className='text-4xl md:text-5xl font-serif text-primary tracking-tight'>Métricas de Mercado</h2>
          <p className='text-sm text-slate-500 mt-3 max-w-xl'>
            Indicadores técnicos y fundamentales sincronizados con el backend.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8'>
        <div className='xl:col-span-1 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col'>
          <div className='flex items-center gap-3 mb-2'>
             <Gauge size={20} className='text-slate-600' />
             <h3 className='text-lg font-serif font-bold text-primary'>Perfil de Eficiencia</h3>
          </div>
          <p className='text-xs text-slate-500 mb-6 leading-relaxed'>
            Atributos clave contrastando los instrumentos de Renta Fija frente a la Renta Variable.
          </p>
          
          <div className='flex-1 min-h-[300px] -mt-4'>
             {isLoading ? (
               <div className='h-full flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse'>
                 <span className='text-[10px] font-bold text-slate-300 uppercase tracking-widest'>Cargando Perfiles...</span>
               </div>
             ) : (
               <ReactECharts option={radarOption} style={{ height: '100%', width: '100%' }} />
             )}
          </div>

          {!isLoading && (
            <div className='mt-2 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6'>
               <div className='text-center'>
                 <p className='text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Tasa Líder R.F</p>
                 <p className='text-sm font-bold text-slate-600'>{bestCdtRate.toFixed(2)}% <span className='text-[10px] font-normal text-slate-400'>EA</span></p>
               </div>
               <div className='text-center border-l border-slate-100'>
                 <p className='text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Retorno Prom. R.V</p>
                 <p className='text-sm font-bold text-emerald-600'>{avgEtfReturn.toFixed(2)}% <span className='text-[10px] font-normal text-emerald-600/70'>YTD</span></p>
               </div>
            </div>
          )}
        </div>

        <div className='xl:col-span-2 space-y-8'>
          <div className='bg-white p-8 rounded-3xl border border-slate-100 shadow-sm'>
            <div className='flex items-center gap-3 mb-10'>
               <BarChart3 size={20} className='text-emerald-600' />
               <h3 className='text-lg font-serif font-bold text-primary'>Promedios CDT por Plazo</h3>
            </div>
            <div className='h-[280px]'>
               {isLoading ? (
                 <div className='h-full flex items-center justify-center bg-slate-50 rounded-2xl animate-pulse'>
                   <span className='text-[10px] font-bold text-slate-300 uppercase tracking-widest'>Sincronizando Promedios...</span>
                 </div>
               ) : (
                 <ReactECharts option={barOption} style={{ height: '100%' }} />
               )}
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
             <div className='bg-primary p-8 rounded-3xl text-white shadow-xl shadow-primary/10'>
                <div className='flex items-center gap-3 mb-6'>
                   <Globe2 size={20} className='text-emerald-400' />
                   <span className='text-[10px] font-bold uppercase tracking-widest opacity-60'>Inflación Proyectada</span>
                </div>
                <h4 className='text-2xl font-serif mb-4'>
                   {isLoading ? 'Sincronizando...' : `${(metrics?.inflation_rate || 0).toFixed(2)}% IPC Anual`}
                </h4>
                <p className='text-sm text-slate-400 leading-relaxed'>
                   Tasa de inflación reportada para el último periodo (DANE).
                </p>
             </div>
             <div className='bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between'>
                <div>
                   <div className='flex items-center gap-3 mb-6'>
                      <Cpu size={20} className='text-primary' />
                      <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>Estado del Motor</span>
                   </div>
                   <h4 className='text-xl font-bold text-primary'>Go Hexagonal Engine</h4>
                   <p className='text-xs text-slate-500 mt-2'>Sincronizado: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : '---'}</p>
                </div>
                <div className='flex items-center gap-2 mt-8 text-emerald-500'>
                   <Server size={14} />
                   <span className='text-[10px] font-bold uppercase tracking-widest'>Latencia Óptima</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsView;
