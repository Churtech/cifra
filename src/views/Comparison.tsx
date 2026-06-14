import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Trash2, ArrowRight, TrendingUp,
  Database, ChevronDown, Search, Loader2, Info
} from 'lucide-react';
import { useCDTs, useAssets, useMarketMetrics } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import ProjectionDrawer from '../components/ProjectionDrawer';
import { ComparisonItem, CDTDetail, AssetDetail } from '../types';

// ── Tipos internos ──────────────────────────────────────────────────────────
type SelectedCDT   = CDTDetail   & { _type: 'CDT' };
type SelectedAsset = AssetDetail & { _type: 'ASSET' };
type SelectedItem  = SelectedCDT | SelectedAsset;

interface ProjectionRow extends ComparisonItem {
  _plazo: number;
  _itemKey: string; 
  _growth_cop?: number; // Crecimiento real en COP considerando TRM
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtCOP = (val: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

/** Ganancia compuesta usando la tasa neta que viene del backend */
const computeGain = (investment: number, netRateEA: number, days: number): number =>
  investment * (Math.pow(1 + netRateEA / 100, days / 365) - 1);

// ── Componente ──────────────────────────────────────────────────────────────
const ComparisonView: React.FC = () => {
  const [searchTerm, setSearchTerm]         = useState('');
  const [investment, setInvestment]         = useState(10_000_000);
  const [displayInv, setDisplayInv]         = useState('10.000.000');
  const [days, setDays]                     = useState(360);
  const [selected, setSelected]             = useState<SelectedItem[]>([]);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [isDaysDropdownOpen, setIsDaysDropdownOpen] = useState(false);
  const [mode, setMode]                     = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [activeDetail, setActiveDetail]     = useState<ComparisonItem | null>(null);

  // ── Data del backend ─────────────────────────────────────────────────────
  const { data: cdtsRes, isLoading: loadCDTs }   = useCDTs({ investment, days });
  const { data: etfsRes, isLoading: loadETFs }   = useAssets({ type: 'etf',   investment, days });
  const { data: stksRes, isLoading: loadStocks } = useAssets({ type: 'stock', investment, days });
  const { data: metricsRes } = useMarketMetrics();

  const trmChange30d = metricsRes?.data?.trm_change_30d || 0;
  const isLoading = mode === 'FIXED' ? loadCDTs : (loadETFs || loadStocks);

  // ── Pool de items disponibles para buscar ────────────────────────────────
  const pool = useMemo((): SelectedItem[] => {
    if (mode === 'FIXED') {
      return (cdtsRes?.data ?? []).map(c => ({ ...c, _type: 'CDT' as const }));
    }
    const etfs  = (etfsRes?.data  ?? []).map(a => ({ ...a, _type: 'ASSET' as const }));
    const stks  = (stksRes?.data  ?? []).map(a => ({ ...a, _type: 'ASSET' as const }));
    return [...etfs, ...stks];
  }, [mode, cdtsRes, etfsRes, stksRes]);

  // ── Clave única por item ─────────────────────────────────────────────────
  const itemKey = (item: SelectedItem): string =>
    item._type === 'CDT' ? `CDT-${(item as SelectedCDT).cdt.id}` : `ASSET-${(item as SelectedAsset).asset.id}`;

  // ── Resultados de búsqueda ───────────────────────────────────────────────
  const searchResults = useMemo(() => {
    const selectedKeys = new Set(selected.map(itemKey));
    const unselected   = pool.filter(i => !selectedKeys.has(itemKey(i)));

    if (!searchTerm) return unselected.slice(0, 10);

    const term = searchTerm.toLowerCase();
    return unselected.filter(i => {
      if (i._type === 'CDT') {
        const c = (i as SelectedCDT).cdt;
        return c.institution.name.toLowerCase().includes(term);
      }
      const a = (i as SelectedAsset).asset;
      return a.name.toLowerCase().includes(term) || a.ticker.toLowerCase().includes(term);
    }).slice(0, 8);
  }, [pool, selected, searchTerm]);

  // ── Filas de comparación (rankeadas por net_rate_ea del backend) ──────────
  const projections = useMemo((): ProjectionRow[] => {
    const rows = selected.map((item): Omit<ProjectionRow, 'rank'> => {
      if (item._type === 'CDT') {
        const c    = item as SelectedCDT;
        const gain = computeGain(investment, c.net_rate_ea, days);
        return {
          _type:       'CDT',
          _plazo:       c.cdt.plazo_dias,
          _itemKey:     `CDT-${c.cdt.id}`,
          type:         'CDT',
          product:      c.cdt.institution.name,
          institution:  c.cdt.institution.name,
          rate_ea:      c.cdt.tasa_ea,         
          annual_return: c.cdt.tasa_ea,
          net_return:   c.net_rate_ea,          
          nominal_return: c.nominal_return,
          real_return:  c.real_return,
          gain,
          final_amount: investment + gain,
          risk:         c.risk,
          liquidity:    c.liquidity,
          guarantee:    c.guarantee,
          _growth_cop:  gain, 
        } as any;
      } else {
        const a    = item as SelectedAsset;
        const gain = computeGain(investment, a.annual_return, days);
        
        // Retorno Real en COP (Fase 3): [ (1 + retorno_usd) * (1 + cambio_trm) - 1 ]
        const trmProxy = trmChange30d * 12; // Anualización simple para unificar en base E.A.
        const totalGrowthFactor = (1 + (a.annual_return / 100)) * (1 + (trmProxy / 100));
        // Capitalización compuesta sobre el horizonte de días
        const gainCOP = investment * (Math.pow(totalGrowthFactor, days / 365) - 1);

        return {
          _type:       'ASSET',
          _plazo:       0,
          _itemKey:     `ASSET-${a.asset.id}`,
          type:         a.asset.type === 'etf' ? 'ETF' : 'Stock',
          product:      a.asset.name,
          ticker:       a.asset.ticker,
          institution:  '',
          rate_ea:      a.annual_return,
          annual_return: a.annual_return,
          net_return:   a.annual_return,        
          nominal_return: a.annual_return,
          real_return:  a.annual_return,
          gain,
          final_amount: investment + gainCOP,
          risk:         a.risk,
          liquidity:    'Alta liquidez (mercado)',
          guarantee:    undefined,
          _growth_cop:  gainCOP,
        } as any;
      }
    });

    return rows
      .sort((a, b) => (b as any).net_return - (a as any).net_return)
      .map((r, i) => ({ ...(r as any), rank: i + 1 }));
  }, [selected, investment, days, trmChange30d]);

  const best = projections[0] ?? null;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleInvestmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const n   = Number(raw);
    if (n > 2_000_000_000) return;
    setInvestment(n);
    setDisplayInv(n > 0 ? n.toLocaleString('es-CO') : '');
  };

  const addItem = (item: SelectedItem) => {
    const key = itemKey(item);
    if (selected.some(s => itemKey(s) === key)) return;
    setSelected(prev => [...prev, item]);
    setSearchTerm('');
    setSearchOpen(true);
  };

  const removeItem = (key: string) =>
    setSelected(prev => prev.filter(s => itemKey(s) !== key));

  const switchMode = (m: 'FIXED' | 'VARIABLE') => {
    setMode(m);
    setSelected([]);
    setSearchTerm('');
  };

  const openDrawer = (row: ProjectionRow) => {
    setActiveDetail(row);
    setDrawerOpen(true);
  };

  return (
    <div className='p-8 max-w-7xl mx-auto'>
      <div className='mb-12'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg'>
            <TrendingUp size={18} />
          </div>
          <h1 className='text-3xl font-serif font-bold text-primary'>Comparativa Institucional</h1>
        </div>
        <p className='text-slate-500 max-w-2xl'>
          Analiza y proyecta rendimientos netos reales entre diferentes activos financieros en Colombia, incluyendo el impacto de la TRM.
        </p>
      </div>

      <div className='flex flex-col lg:flex-row gap-6 mb-12 items-stretch h-auto lg:h-[160px]'>
        <div className='flex-[2] bg-white px-10 py-0 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div className='flex flex-col justify-center'>
              <label className='block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1'>Capital a Proyectar (COP)</label>
              <div className='w-full px-6 py-4 bg-slate-50/50 rounded-2xl flex items-center border border-transparent h-[56px]'>
                <span className='text-slate-300 text-lg font-light mr-2'>$</span>
                <input
                  type='text'
                  value={displayInv}
                  onChange={handleInvestmentChange}
                  className='w-full bg-transparent border-none p-0 text-lg font-bold text-primary focus:ring-0 placeholder:text-slate-100'
                  placeholder='0'
                />
              </div>
            </div>
            <div className='flex flex-col justify-center relative'>
              <label className='block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1'>Horizonte de Tiempo</label>
              <div className='relative group h-[56px]'>
                {/* Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDaysDropdownOpen(!isDaysDropdownOpen)}
                  className='w-full px-6 py-4 bg-slate-50/50 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-all border border-transparent h-full'
                >
                  <span className='text-sm font-bold text-primary'>
                    {days === 90  ? '90 Días (3 Meses)'   : days === 180 ? '180 Días (6 Meses)'  : '360 Días (Un Año)'}
                  </span>
                  <ChevronDown size={16} className={cn('text-slate-300 group-hover:text-primary transition-transform duration-200', isDaysDropdownOpen ? 'rotate-180 text-primary' : 'rotate-0')} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isDaysDropdownOpen && (
                    <>
                      {/* Click outside backdrop */}
                      <div className='fixed inset-0 z-20' onClick={() => setIsDaysDropdownOpen(false)} />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className='absolute left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[22px] shadow-2xl p-3 z-30 flex flex-col gap-1 overflow-hidden'
                      >
                        {[90, 180, 360].map(plazo => {
                          const isCurrent = days === plazo;
                          const label = plazo === 90 ? '90 Días (3 Meses)' : plazo === 180 ? '180 Días (6 Meses)' : '360 Días (Un Año)';
                          return (
                            <div
                              key={plazo}
                              onClick={() => {
                                setDays(plazo);
                                setIsDaysDropdownOpen(false);
                              }}
                              className={cn(
                                'px-4 py-3 rounded-xl cursor-pointer flex justify-between items-center transition-all text-xs font-bold',
                                isCurrent ? 'bg-primary text-white shadow-sm' : 'hover:bg-slate-50 text-primary'
                              )}
                            >
                              <span>{label}</span>
                              {isCurrent && <div className='w-1.5 h-1.5 rounded-full bg-white shrink-0' />}
                            </div>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        <div className='flex-1 bg-white px-10 py-0 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center'>
          <div className='flex flex-col justify-center gap-4'>
            <div className='flex items-center justify-between'>
              <label className='block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1'>Tipo de Comparativa</label>
              <div className='flex gap-2 p-1 bg-slate-50 rounded-lg'>
                <button onClick={() => switchMode('FIXED')} className={cn('text-[8px] font-bold px-3 py-1 rounded-md transition-all', mode === 'FIXED' ? 'bg-primary text-white' : 'text-slate-400')}>Fija</button>
                <button onClick={() => switchMode('VARIABLE')} className={cn('text-[8px] font-bold px-3 py-1 rounded-md transition-all', mode === 'VARIABLE' ? 'bg-primary text-white' : 'text-slate-400')}>Variable</button>
              </div>
            </div>
            <div className='relative h-[56px]'>
              <div className='relative group h-full'>
                {isLoading ? <Loader2 className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 animate-spin' size={18} /> : <Search className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 transition-colors' size={18} />}
                <input
                  type='text'
                  value={searchTerm}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 250)}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-4 focus:ring-primary/5 transition-all outline-none h-full'
                  placeholder={mode === 'FIXED' ? 'Buscar banco o CDT…' : 'Buscar ETF o acción…'}
                />
              </div>
              <AnimatePresence>
                {searchOpen && pool.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className='absolute top-full left-0 right-0 mt-4 bg-white border border-slate-100 rounded-[28px] shadow-2xl z-50 overflow-hidden max-h-[350px] overflow-y-auto'>
                    <div className='p-4 border-b border-slate-50 bg-slate-50/50'><p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>Resultados en Renta {mode === 'FIXED' ? 'Fija' : 'Variable'}</p></div>
                    {searchResults.map((item, idx) => {
                      const isCDT = item._type === 'CDT';
                      const name  = isCDT ? (item as SelectedCDT).cdt.institution.name : (item as SelectedAsset).asset.ticker;
                      return (
                        <div key={`${itemKey(item)}-${idx}`} onMouseDown={e => { e.preventDefault(); addItem(item); }} className='px-6 py-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 group transition-colors flex items-center justify-between'>
                          <div><p className='text-[13px] font-bold text-primary'>{name}</p><p className='text-[9px] text-slate-400 font-bold uppercase mt-0.5'>{isCDT ? `${(item as SelectedCDT).cdt.tasa_ea}% E.A.` : (item as SelectedAsset).asset.name}</p></div>
                          <Plus size={14} className='text-slate-200 group-hover:text-primary opacity-0 group-hover:opacity-100' />
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <div className='bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='bg-slate-50/50 border-b border-slate-100'>
              <th className='px-6 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Activo</th>
              <th className='px-6 py-5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Tasa Bruta</th>
              <th className='px-6 py-5 text-right text-[10px] font-bold text-emerald-600 uppercase tracking-widest'>Tasa Neta E.A.</th>
              <th className='px-6 py-5 text-right text-[10px] font-bold text-primary uppercase tracking-widest whitespace-nowrap bg-slate-50/30'>
                <div className='flex items-center justify-end gap-1.5'>
                  Retorno Real en COP
                  <span title="Calcula cuánto tendrías hoy en Pesos Colombianos, incluyendo la variación de la TRM frente al USD.">
                    <Info size={12} className='text-slate-300 cursor-help' />
                  </span>
                </div>
              </th>
              <th className='px-6 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Valor Proyectado</th>
              <th className='px-6 py-5 w-10'></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-50'>
            {projections.map((row) => {
              const isBest = row.rank === 1;
              return (
                <motion.tr layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={row._itemKey} onClick={() => openDrawer(row)} className={cn('group transition-all cursor-pointer', isBest ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50')}>
                  <td className='px-6 py-6'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary font-bold shadow-sm border border-slate-100 uppercase text-xs'>{row.type.substring(0, 2)}</div>
                      <div><p className='text-sm font-bold text-primary leading-tight'>{row.product}</p><p className='text-[10px] text-slate-400 font-bold uppercase mt-0.5'>{row.type === 'CDT' ? row.institution : row.ticker}</p></div>
                    </div>
                  </td>
                  <td className='px-6 py-6 text-center'><span className='px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-600 text-xs'>{(row.rate_ea ?? 0).toFixed(2)}%</span></td>
                  <td className='px-6 py-6 text-right'>
                    <div className='flex flex-col items-end'>
                      <span className='text-lg font-mono font-bold text-emerald-600 leading-none'>{(row.net_return ?? 0).toFixed(2)}%</span>
                      <span className='text-[7px] font-bold text-emerald-500 uppercase tracking-tighter mt-1 bg-emerald-50 px-1 rounded'>Efectiva Post-Impuestos</span>
                    </div>
                  </td>
                  <td className='px-6 py-6 text-right bg-slate-50/20'>
                    <div className='flex flex-col items-end'>
                      <span className={cn('text-lg font-mono font-bold leading-none', (row._growth_cop || 0) > 0 ? 'text-primary' : 'text-rose-500')}>
                        +{fmtCOP(row._growth_cop || 0)}
                      </span>
                      <span className='text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-1'>Incluye TRM & Devaluación</span>
                    </div>
                  </td>
                  <td className='px-6 py-6 text-right'><p className='text-lg font-mono font-bold text-primary tracking-tighter'>{fmtCOP(row.final_amount)}</p></td>
                  <td className='px-6 py-6 text-right'><button onClick={e => { e.stopPropagation(); removeItem(row._itemKey); }} className='p-2 text-slate-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100'><Trash2 size={16} /></button></td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ProjectionDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} comparisonItem={activeDetail} initialInvestment={investment} />
    </div>
  );
};

export default ComparisonView;
