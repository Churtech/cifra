import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactECharts from 'echarts-for-react';
import { PieChart, TrendingUp, Zap, ShieldAlert, BarChart3 } from 'lucide-react';
import { useAssets, useMarketMetrics, useAssetCorrelation, useTRMMetrics } from '../hooks/useFinance';
import { cn } from '../lib/utils';

const CorrelationPair: React.FC<{ ticker1: string; ticker2: string; pairName: string }> = ({ ticker1, ticker2, pairName }) => {
  const { data: correlationResponse, isLoading, isError } = useAssetCorrelation(ticker1, ticker2);
  const correlation = correlationResponse?.data?.correlation;

  // Skeleton state while loading
  if (isLoading) {
    return (
      <div className='p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 animate-pulse h-[140px] flex flex-col justify-between'>
        <div className='w-24 h-2.5 bg-slate-200 rounded-full' />
        <div className='w-16 h-8 bg-slate-200 rounded-xl' />
      </div>
    );
  }

  // If error or no data, return null so the grid can collapse or show next
  if (isError || correlation === undefined || correlation === null) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:border-primary/20 hover:shadow-xl transition-all group'
    >
      <div className='flex items-center justify-between mb-6'>
        <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-primary transition-colors'>{pairName}</p>
        <div className='p-1.5 bg-slate-50 rounded-lg group-hover:bg-primary/5 transition-colors'>
          <BarChart3 size={12} className='text-slate-400 group-hover:text-primary' />
        </div>
      </div>
      <div className='flex items-end justify-between'>
        <p className={cn(
          'text-4xl font-mono font-bold tracking-tighter',
          correlation < 0 ? 'text-rose-500' : 'text-emerald-500'
        )}>
          {correlation.toFixed(2)}
        </p>
        <div className={cn(
          'px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider',
          Math.abs(correlation) > 0.7 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
        )}>
          {Math.abs(correlation) > 0.7 ? 'Fuerte' : Math.abs(correlation) > 0.3 ? 'Moderada' : 'Débil'}
        </div>
      </div>
    </motion.div>
  );
};

const CorrelationsView: React.FC = () => {
  const { data: metricsResponse } = useMarketMetrics();
  const { data: trmResponse } = useTRMMetrics(1);
  const { data: assetsResponse, isLoading: loadingAssets } = useAssets({ type: 'etf' });

  const metrics = metricsResponse?.data;
  const trm = trmResponse?.data;
  const assets = assetsResponse?.data || [];

  const currentTRM = trm?.current != null && trm.current > 0 ? trm.current : metrics?.trm_current;
  const currentInflation = metrics?.inflation_rate || 0;
  const bestCDTRate = metrics?.best_cdt_rate || 0;

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
    series: [{
      name: 'Composición de Riesgo',
      type: 'pie',
      radius: ['45%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 16, borderColor: '#fff', borderWidth: 4 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold', fontFamily: 'Playfair Display' } },
      labelLine: { show: false },
      data: assets.length > 0 ? assets.slice(0, 4).map((a, i) => ({
        value: 100 / Math.min(assets.length, 4),
        name: a.asset.name,
        itemStyle: { color: i === 0 ? '#0F172A' : i === 1 ? '#10B981' : i === 2 ? '#3B82F6' : '#F59E0B' }
      })) : []
    }]
  };

  const scatterOption = {
    grid: { top: '15%', left: '10%', right: '10%', bottom: '15%' },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#1e293b', fontSize: 12 },
      formatter: (params: any) => `
        <div style="min-width: 140px">
          <p style="margin:0; font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em">${params.data[3]}</p>
          <p style="margin:4px 0; font-weight: 800; color: #0f172a; font-size: 13px">${params.data[2]}</p>
          <div style="display: flex; justify-content: space-between; margin-top: 8px; border-top: 1px solid #f1f5f9; pt: 8px">
            <span style="color: #64748b; font-size: 11px">Retorno:</span>
            <span style="font-weight: bold; color: #10b981; font-size: 11px">${params.data[1].toFixed(2)}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 4px">
            <span style="color: #64748b; font-size: 11px">Volatilidad:</span>
            <span style="font-weight: bold; color: #0f172a; font-size: 11px">${params.data[0].toFixed(2)}%</span>
          </div>
        </div>`
    },
    xAxis: { 
      name: 'Volatilidad (%)', 
      nameLocation: 'middle', 
      nameGap: 30, 
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } 
    },
    yAxis: { 
      name: 'Retorno (%)', 
      nameLocation: 'middle', 
      nameGap: 40, 
      axisLabel: { fontSize: 10, color: '#94a3b8' },
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } 
    },
    series: [{
      symbolSize: (data: any) => {
        const size = Math.sqrt(data[0]) * 4 + 8;
        return Math.min(Math.max(size, 10), 30);
      },
      data: assets.map(a => [a.volatility, a.annual_return, a.asset.name, a.asset.ticker]),
      type: 'scatter',
      itemStyle: { 
        color: (params: any) => {
          return params.data[1] > bestCDTRate ? '#10B981' : '#0F172A';
        },
        opacity: 0.75, 
        shadowBlur: 10, 
        shadowColor: 'rgba(15, 23, 42, 0.1)' 
      },
      label: {
        show: true,
        formatter: (params: any) => params.data[3],
        position: 'top',
        fontSize: 9,
        fontWeight: 'bold',
        color: '#64748b',
        distance: 8
      },
      labelLayout: {
        hideOverlap: true,
        moveOverlap: 'shiftY'
      },
      emphasis: {
        itemStyle: {
          opacity: 1,
          borderWidth: 2,
          borderColor: '#fff',
          shadowBlur: 20
        },
        label: {
          show: true,
          fontSize: 11,
          color: '#0F172A'
        }
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#10B981', opacity: 0.5, width: 1.5 },
        data: [{
          name: 'Benchmark CDT',
          yAxis: bestCDTRate,
          label: {
            show: true,
            position: 'end',
            formatter: `BANCO: ${bestCDTRate.toFixed(1)}%`,
            fontSize: 9,
            fontWeight: 'bold',
            color: '#10b981',
            backgroundColor: '#fff',
            padding: [2, 4],
            borderRadius: 4
          }
        }]
      }
    }]
  };

  // High-probability pairs to ensure we have data
  const correlationPairs = [
    { t1: "SPY", t2: "QQQ", name: "S&P 500 / Nasdaq" },
    { t1: "SPY", t2: "GLD", name: "S&P 500 / Oro" },
    { t1: "VOO", t2: "VTI", name: "VOO / VTI (US Total)" },
    { t1: "AAPL", t2: "MSFT", name: "Apple / Microsoft" },
    { t1: "GLD", t2: "SLV", name: "Oro / Plata" },
    { t1: "ECOPETROL", t2: "CORFICOLCF", name: "Ecopetrol / Corficol" },
  ];

  return (
    <div className='space-y-10 pb-20'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-6'>
        <div>
          <h2 className='text-4xl md:text-5xl font-serif text-primary tracking-tight'>Análisis de Correlaciones</h2>
          <p className='text-sm text-slate-500 mt-3 max-w-xl'>
            Visualiza cómo interactúan los diferentes activos entre sí y con la TRM para optimizar la diversificación de tu portafolio.
          </p>
        </div>
        <div className='flex items-center gap-2 px-5 py-2.5 bg-emerald-50 rounded-full border border-emerald-100 shadow-sm'>
          <div className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
          <span className='text-[10px] font-bold text-emerald-700 uppercase tracking-[0.2em]'>Servidor de Análisis Activo</span>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        <div className='bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm transition-all hover:shadow-lg'>
          <div className='flex items-center gap-4 mb-10'>
            <div className='w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center'>
               <PieChart size={24} />
            </div>
            <h3 className='text-xl font-serif font-bold text-primary'>Composición de Carteras Modelo</h3>
          </div>
          <div className='h-[320px]'>
            {loadingAssets ? (
              <div className='h-full flex items-center justify-center bg-slate-50 rounded-[40px] animate-pulse'>
                <span className='text-[10px] font-bold text-slate-300 uppercase tracking-widest'>Analizando Composición...</span>
              </div>
            ) : assets.length > 0 ? (
              <ReactECharts option={chartOption} style={{ height: '100%' }} />
            ) : (
              <div className='h-full flex items-center justify-center border border-dashed border-slate-200 rounded-[40px]'>
                <p className='text-xs text-slate-400'>No hay datos suficientes</p>
              </div>
            )}
          </div>
          <div className='mt-10 grid grid-cols-2 gap-6'>
             <div className='p-7 bg-slate-50/50 rounded-[32px] border border-slate-100 group hover:bg-white hover:border-emerald-200 transition-all'>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3'>Inflación Actual</p>
                <p className='text-3xl font-mono font-bold text-emerald-600'>{currentInflation != null ? `${Number(currentInflation).toFixed(2)}%` : '---'}</p>
                <p className='text-[10px] text-slate-500 mt-2 flex items-center gap-1.5'>
                  <span className='w-1.5 h-1.5 bg-emerald-400 rounded-full' />
                  Métrica IPC Sincronizada
                </p>
             </div>
             <div className='p-7 bg-slate-50/50 rounded-[32px] border border-slate-100 group hover:bg-white hover:border-primary/20 transition-all'>
                <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3'>TRM Actual</p>
                <p className='text-3xl font-mono font-bold text-primary'>{currentTRM ? `$${currentTRM.toLocaleString('es-CO')}` : '---'}</p>
                <p className='text-[10px] text-slate-500 mt-2 flex items-center gap-1.5'>
                  <span className='w-1.5 h-1.5 bg-primary/40 rounded-full' />
                  Referencia Mercado Real
                </p>
             </div>
          </div>
        </div>

        <div className='bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm transition-all hover:shadow-lg'>
          <div className='flex items-center gap-4 mb-10'>
            <div className='w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center'>
               <TrendingUp size={24} />
            </div>
            <h3 className='text-xl font-serif font-bold text-primary'>Dispersión Retorno vs. Riesgo</h3>
          </div>
          <div className='h-[320px]'>
            {loadingAssets ? (
              <div className='h-full flex items-center justify-center bg-slate-50 rounded-[40px] animate-pulse'>
                <span className='text-[10px] font-bold text-slate-300 uppercase tracking-widest'>Calculando...</span>
              </div>
            ) : assets.length > 0 ? (
              <ReactECharts option={scatterOption} style={{ height: '100%' }} />
            ) : (
              <div className='h-full flex items-center justify-center border border-dashed border-slate-200 rounded-[40px]'>
                <p className='text-xs text-slate-400'>Sin datos de dispersión</p>
              </div>
            )}
          </div>
          <div className='mt-10 p-8 bg-slate-900 rounded-[40px] text-white relative overflow-hidden group hover:bg-slate-800 transition-all'>
             <div className='absolute right-0 top-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform' />
             <div className='flex items-center gap-2 mb-3 relative'>
                <Zap size={16} className='text-amber-400' />
                <span className='text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400'>Insight de Inteligencia</span>
             </div>
             <p className='text-base text-slate-300 leading-relaxed italic relative'>
                "Los datos se sincronizan con el motor Go para proveer insights basados en el mercado real."
             </p>
          </div>
        </div>
      </div>

      <div className='bg-white border border-slate-100 rounded-[56px] p-12 shadow-sm'>
         <div className='flex items-center gap-4 mb-12 border-b border-slate-50 pb-10'>
            <div className='w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm'>
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 className='text-3xl font-serif font-bold text-primary'>Matriz de Correlación de Activos</h3>
              <p className='text-xs text-slate-400 uppercase tracking-[0.3em] mt-1.5'>Visualización de Dependencia Estadística</p>
            </div>
         </div>
         <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10'>
            <AnimatePresence mode='popLayout'>
              {correlationPairs.map((p) => (
                <CorrelationPair key={p.name} ticker1={p.t1} ticker2={p.t2} pairName={p.name} />
              ))}
            </AnimatePresence>
         </div>
         <div className='mt-12 p-6 bg-slate-50 rounded-[32px] border border-dashed border-slate-200 flex items-center justify-center'>
            <p className='text-xs text-slate-400 text-center max-w-lg leading-relaxed'>
              La matriz muestra únicamente los pares con datos históricos suficientes para un análisis estadístico robusto. Los activos se actualizan cada 24 horas.
            </p>
         </div>
      </div>
    </div>
  );
};

export default CorrelationsView;
