import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Clock, Settings } from 'lucide-react';
import { useMarketMetrics, useAssets } from '../hooks/useFinance';
import { formatCurrency } from '../lib/utils';
import { AssetDetail } from '../types';

const Header: React.FC = () => {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { data: metricsResponse } = useMarketMetrics();
  const { data: assetsResponse } = useAssets({ type: 'etf' });

  const metrics = metricsResponse?.data;
  const currentTRM = metrics?.trm_current;
  const trmChange = metrics?.trm_change_7d;

  const assets = assetsResponse?.data || [];

  const tickerItems = [
    ...(currentTRM ? [{ label: 'TRM', value: formatCurrency(currentTRM, 2), change: trmChange || 0 }] : []),
    ...assets.slice(0, 10).map((item: AssetDetail) => {
      const activeChange = (item?.change_1d && item?.change_1d !== 0)
        ? item?.change_1d
        : (item?.change_7d || item?.annual_return || 0);
      return {
        label: item?.asset?.ticker || '---',
        value: `$` + (item?.price_cop?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'),
        change: activeChange
      };
    })
  ];

  return (
    <header className='sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100'>
      <div className='h-16 px-6 lg:px-10 flex items-center justify-between'>
        <div className='flex items-center gap-8'>
          <h1 className='font-serif text-2xl text-primary tracking-tight font-bold'>
            Fin<span className='italic font-medium text-emerald-700'>Compare</span>
          </h1>

          <div className='relative group hidden md:block'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors' size={16} />
            <input
              type='text'
              placeholder='Buscar activos, CDTs o noticias...'
              className='pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm w-64 lg:w-96 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all placeholder:text-slate-400'
            />
          </div>
        </div>

        <div className='flex items-center gap-4 lg:gap-6'>
          {/* Reloj del mercado */}
          <div className='hidden lg:flex items-center gap-2 text-slate-400'>
            <Clock size={16} className='text-emerald-600/70' />
            <div className='text-right'>
              <p className='text-xs font-mono font-bold text-slate-600'>{time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
              <p className='text-[9px] uppercase tracking-widest'>{time.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')}</p>
            </div>
          </div>

          <div className='h-8 w-px bg-slate-100 hidden sm:block' />

          <div className='flex items-center gap-2 pr-2'>
            <div className='text-right hidden sm:block'>
              <p className='text-sm font-bold text-primary tracking-tight'>
                {(() => {
                  const day = time.getDay();
                  const hour = time.getHours();
                  const isWeekend = day === 0 || day === 6;
                  const isWorkingHours = hour >= 8 && hour < 16;
                  return (!isWeekend && isWorkingHours) ? 'Mercado Abierto' : 'Mercado Cerrado';
                })()}
              </p>
              <div className='flex items-center justify-end gap-1.5 mt-0.5'>
                {(() => {
                  const day = time.getDay();
                  const hour = time.getHours();
                  const isWeekend = day === 0 || day === 6;
                  const isWorkingHours = hour >= 8 && hour < 16;
                  const isOpen = !isWeekend && isWorkingHours;
                  return (
                    <>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse shadow-[0_0_4px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></span>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${isOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isOpen ? 'Cotizando en Vivo' : 'Fuera de Horario'}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
            
          </div>
        </div>
      </div>

      <div className='h-10 bg-slate-50 border-t border-slate-100 flex items-center overflow-hidden'>
        <div className='flex animate-marquee whitespace-nowrap'>
          {[...tickerItems, ...tickerItems].map((item, idx) => (
            <div key={idx} className='flex items-center gap-4 px-8 border-r border-slate-200/50'>
              <span className='text-[10px] font-bold text-slate-500 uppercase tracking-widest'>{item.label}</span>
              <span className='text-xs font-mono font-bold text-primary'>{item.value}</span>
              <div className={`flex items-center gap-1 text-[11px] font-bold ${item.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {item.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span>{Math.abs(item.change).toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;
