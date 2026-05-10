import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Plus, Trash2, ArrowRight, TrendingUp,
  Database, ChevronDown, Search, Loader2
} from 'lucide-react';
import { useCDTs, useAssets } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import ProjectionDrawer from '../components/ProjectionDrawer';
import { ComparisonItem, CDTDetail, AssetDetail } from '../types';

// ── Tipos internos ──────────────────────────────────────────────────────────
type SelectedCDT   = CDTDetail   & { _type: 'CDT' };
type SelectedAsset = AssetDetail & { _type: 'ASSET' };
type SelectedItem  = SelectedCDT | SelectedAsset;

interface ProjectionRow extends ComparisonItem {
  _plazo: number;
  _itemKey: string; // id único para poder borrar
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
  const [mode, setMode]                     = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [activeDetail, setActiveDetail]     = useState<ComparisonItem | null>(null);

  // ── Data del backend ─────────────────────────────────────────────────────
  const { data: cdtsRes, isLoading: loadCDTs }   = useCDTs({ investment, days });
  const { data: etfsRes, isLoading: loadETFs }   = useAssets({ type: 'etf',   investment, days });
  const { data: stksRes, isLoading: loadStocks } = useAssets({ type: 'stock', investment, days });

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
          rate_ea:      c.cdt.tasa_ea,         // tasa bruta del backend
          annual_return: c.cdt.tasa_ea,
          net_return:   c.net_rate_ea,          // tasa neta del backend
          nominal_return: c.nominal_return,
          real_return:  c.real_return,
          gain,
          final_amount: investment + gain,
          risk:         c.risk,
          liquidity:    c.liquidity,
          guarantee:    c.guarantee,
        } as any;
      } else {
        const a    = item as SelectedAsset;
        const gain = computeGain(investment, a.annual_return, days);
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
          net_return:   a.annual_return,        // variable: sin retención específica del backend
          nominal_return: a.annual_return,
          real_return:  a.annual_return,
          gain,
          final_amount: investment + gain,
          risk:         a.risk,
          liquidity:    'Alta liquidez (mercado)',
          guarantee:    undefined,
        } as any;
      }
    });

    // Ordenar por net_return descendente → rank
    return rows
      .sort((a, b) => (b as any).net_return - (a as any).net_return)
      .map((r, i) => ({ ...(r as any), rank: i + 1 }));
  }, [selected, investment, days]);

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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='p-8 max-w-7xl mx-auto'>

      {/* Título */}
      <div className='mb-12'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg'>
            <TrendingUp size={18} />
          </div>
          <h1 className='text-3xl font-serif font-bold text-primary'>Comparativa Institucional</h1>
        </div>
        <p className='text-slate-500 max-w-2xl'>
          Analiza y proyecta rendimientos netos reales entre diferentes activos financieros en Colombia.
        </p>
      </div>

      {/* Cabecera: Capital + Plazo + Buscador */}
      <div className='flex flex-col lg:flex-row gap-6 mb-12 items-stretch h-auto lg:h-[160px]'>

        {/* Card izquierda */}
        <div className='flex-[2] bg-white px-10 py-0 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            {/* Capital */}
            <div className='flex flex-col justify-center'>
              <label className='block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1'>
                Capital a Proyectar (COP)
              </label>
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

            {/* Horizonte */}
            <div className='flex flex-col justify-center'>
              <label className='block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1'>
                Horizonte de Tiempo
              </label>
              <div className='relative group h-[56px]'>
                <div className='w-full px-6 py-4 bg-slate-50/50 rounded-2xl flex items-center justify-between cursor-pointer group-hover:bg-slate-100/50 transition-all border border-transparent h-full'>
                  <select
                    value={days}
                    onChange={e => setDays(Number(e.target.value))}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10'
                  >
                    <option value={90}>90 Días (3 Meses)</option>
                    <option value={180}>180 Días (6 Meses)</option>
                    <option value={360}>360 Días (Un Año)</option>
                    <option value={720}>720 Días (Dos Años)</option>
                  </select>
                  <span className='text-sm font-bold text-primary'>
                    {days === 90  ? '90 Días (3 Meses)'   :
                     days === 180 ? '180 Días (6 Meses)'  :
                     days === 360 ? '360 Días (Un Año)'   : '720 Días (Dos Años)'}
                  </span>
                  <ChevronDown size={16} className='text-slate-300 group-hover:text-primary transition-colors' />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card derecha: modo + buscador */}
        <div className='flex-1 bg-white px-10 py-0 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-center'>
          <div className='flex flex-col justify-center gap-4'>

            {/* Toggle modo */}
            <div className='flex items-center justify-between'>
              <label className='block text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1'>
                Tipo de Comparativa
              </label>
              <div className='flex gap-2 p-1 bg-slate-50 rounded-lg'>
                <button
                  onClick={() => switchMode('FIXED')}
                  className={cn('text-[8px] font-bold px-3 py-1 rounded-md transition-all',
                    mode === 'FIXED' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-primary'
                  )}
                >Fija</button>
                <button
                  onClick={() => switchMode('VARIABLE')}
                  className={cn('text-[8px] font-bold px-3 py-1 rounded-md transition-all',
                    mode === 'VARIABLE' ? 'bg-primary text-white shadow-sm' : 'text-slate-400 hover:text-primary'
                  )}
                >Variable</button>
              </div>
            </div>

            {/* Buscador con dropdown */}
            <div className='relative h-[56px]'>
              <div className='relative group h-full'>
                {isLoading
                  ? <Loader2 className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 animate-spin' size={18} />
                  : <Search  className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors' size={18} />
                }
                <input
                  type='text'
                  value={searchTerm}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 250)}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:ring-4 focus:ring-primary/5 focus:border-slate-400 transition-all outline-none h-full placeholder:text-slate-300'
                  placeholder={mode === 'FIXED' ? 'Buscar banco o CDT…' : 'Buscar ETF o acción…'}
                />
              </div>

              <AnimatePresence>
                {searchOpen && pool.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className='absolute top-full left-0 right-0 mt-4 bg-white border border-slate-100 rounded-[28px] shadow-2xl z-50 overflow-hidden max-h-[350px] overflow-y-auto'
                  >
                    <div className='p-4 border-b border-slate-50 bg-slate-50/50'>
                      <p className='text-[8px] font-bold text-slate-400 uppercase tracking-widest'>
                        Resultados en Renta {mode === 'FIXED' ? 'Fija' : 'Variable'}
                      </p>
                    </div>

                    {searchResults.length === 0 && (
                      <p className='px-6 py-4 text-[11px] text-slate-400'>Sin resultados</p>
                    )}

                    {searchResults.map((item, idx) => {
                      const isCDT = item._type === 'CDT';
                      const name  = isCDT
                        ? (item as SelectedCDT).cdt.institution.name
                        : (item as SelectedAsset).asset.ticker;
                      const sub   = isCDT
                        ? `${(item as SelectedCDT).cdt.tasa_ea}% E.A. · ${(item as SelectedCDT).cdt.plazo_dias} días`
                        : (item as SelectedAsset).asset.name;

                      return (
                        <div
                          key={`${itemKey(item)}-${idx}`}
                          onMouseDown={e => { e.preventDefault(); addItem(item); }}
                          className='px-6 py-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 group transition-colors flex items-center justify-between'
                        >
                          <div>
                            <p className='text-[13px] font-bold text-primary'>{name}</p>
                            <p className='text-[9px] text-slate-400 font-bold uppercase mt-0.5'>{sub}</p>
                          </div>
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

      {/* Tabla de comparación */}
      <div className='bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='bg-slate-50/50 border-b border-slate-100'>
              <th className='px-6 py-5 text-left   text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Posición</th>
              <th className='px-6 py-5 text-left   text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Activo / Institución</th>
              <th className='px-6 py-5 text-left   text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Plazo</th>
              <th className='px-6 py-5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Tasa E.A.</th>
              <th className='px-6 py-5 text-right  text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Tasa Neta E.A.</th>
              <th className='px-6 py-5 text-right  text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Ganancia Proyectada</th>
              <th className='px-6 py-5 text-right  text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap'>Total a Recibir</th>
              <th className='px-6 py-5 w-10'></th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-50'>

            {projections.map((row) => {
              const isBest = row.rank === 1;
              const label  = row.type === 'CDT' ? row.institution : row.ticker;

              return (
                <motion.tr
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={row._itemKey}
                  onClick={() => openDrawer(row)}
                  className={cn(
                    'group transition-all border-b border-slate-50 last:border-0 cursor-pointer',
                    isBest ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50'
                  )}
                >
                  {/* Posición */}
                  <td className='px-6 py-6'>
                    <div className='flex items-center gap-3'>
                      <span className={cn(
                        'w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold',
                        isBest ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400'
                      )}>
                        {row.rank}
                      </span>
                      {isBest && (
                        <div className='hidden md:block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-bold rounded uppercase tracking-tighter'>
                          Mejor Opción
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Activo */}
                  <td className='px-6 py-6'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary font-bold shadow-sm border border-slate-100 uppercase text-xs'>
                        {row.type.substring(0, 2)}
                      </div>
                      <div>
                        <p className='text-sm font-bold text-primary leading-tight'>{row.product}</p>
                        <p className='text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5'>{label}</p>
                      </div>
                    </div>
                  </td>

                  {/* Plazo */}
                  <td className='px-6 py-6 text-sm font-mono text-slate-500'>
                    {row._plazo > 0 ? `${row._plazo} días` : 'Variable'}
                  </td>

                  {/* Tasa bruta (del backend) */}
                  <td className='px-6 py-6 text-center'>
                    <span className='px-3 py-1 bg-slate-100 rounded-lg font-mono font-bold text-slate-600 text-xs'>
                      {(row.rate_ea ?? 0).toFixed(2)}%
                    </span>
                  </td>

                  {/* Tasa neta (del backend) */}
                  <td className='px-6 py-6 text-right'>
                    <span className='text-sm font-mono font-bold text-emerald-600'>
                      {(row.net_return ?? 0).toFixed(2)}%
                    </span>
                  </td>

                  {/* Ganancia (calculada con tasa neta del backend) */}
                  <td className='px-6 py-6 text-right'>
                    <p className='text-sm font-mono font-bold text-primary'>
                      +{fmtCOP(row.gain)}
                    </p>
                    <p className='text-[9px] text-slate-400 font-bold uppercase'>Rendimiento neto</p>
                  </td>

                  {/* Total */}
                  <td className='px-6 py-6 text-right'>
                    <p className='text-lg font-mono font-bold text-primary tracking-tighter'>
                      {fmtCOP(row.final_amount)}
                    </p>
                  </td>

                  {/* Eliminar */}
                  <td className='px-6 py-6 text-right'>
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(row._itemKey); }}
                      className='p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100'
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </motion.tr>
              );
            })}

            {/* Estado vacío */}
            {projections.length === 0 && (
              <tr>
                <td colSpan={8} className='px-6 py-24 text-center'>
                  <div className='flex flex-col items-center gap-4 opacity-20'>
                    <div className='w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center'>
                      <Database size={32} />
                    </div>
                    <div className='max-w-xs'>
                      <p className='text-sm font-bold uppercase tracking-[0.2em] mb-1'>Ring Vacío</p>
                      <p className='text-[10px] font-medium leading-relaxed uppercase'>
                        Busca y agrega activos para comparar
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Banner "Mejor opción" — debajo de la tabla, no flotante */}
      <AnimatePresence>
        {projections.length >= 2 && best && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className='mt-6'
          >
            <div className='bg-slate-900 text-white rounded-[32px] p-2 flex items-center justify-between shadow-2xl border border-white/10'>
              <div className='flex items-center gap-4 pl-6'>
                <div className='w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400'>
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className='text-sm font-bold'>Análisis de Optimización Completado</h4>
                  <p className='text-[10px] text-white/50'>
                    Mejor opción:{' '}
                    <span className='text-emerald-400 font-bold'>{best.product}</span> · tasa neta{' '}
                    <span className='text-emerald-400 font-bold'>{(best.net_return ?? 0).toFixed(2)}% E.A.</span> · ganancia{' '}
                    <span className='text-emerald-400 font-bold'>{fmtCOP(best.gain)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => openDrawer(best)}
                className='bg-white text-slate-900 px-8 py-4 rounded-3xl text-xs font-bold hover:bg-emerald-400 hover:text-white transition-all flex items-center gap-2 group shrink-0'
              >
                Ver Detalle
                <ArrowRight size={14} className='group-hover:translate-x-1 transition-transform' />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer de detalle */}
      <ProjectionDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        comparisonItem={activeDetail}
        initialInvestment={investment}
      />
    </div>
  );
};

export default ComparisonView;
