import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Plus, Shield, Zap, Trash2, X, AlertTriangle, Scale, Award, Pencil } from 'lucide-react';
import { usePortfolios, useCreatePortfolio, useUpdatePortfolio, useDeletePortfolio, useAssets, usePortfolioDetail, useCDTs, usePortfolioAnalysis, useComparePortfolios } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { Portfolio, PortfolioAllocation, AssetDetail, CDTDetail, PortfolioComparison } from '../types';
import { useAuth } from '../context/AuthContext';

import { PortfolioCharts as BacktestModal } from '../components/portfolios/PortfolioCharts';
import { PortfolioSummary } from '../components/portfolios/PortfolioSummary';
import { PortfolioAssetTable } from '../components/portfolios/PortfolioAssetTable';
import { PortfolioRebalancing } from '../components/portfolios/PortfolioRebalancing';

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
            <Zap size={14} /> Backtesting
          </button>
          <button className='p-2 text-slate-300 hover:text-blue-600 transition-colors' onClick={() => onEdit(portfolio)} title='Editar Portafolio'><Pencil size={18} /></button>
          <button className='p-2 text-slate-300 hover:text-rose-500 transition-colors' onClick={() => deletePortfolio.mutate(portfolio.id)} title='Eliminar Portafolio'><Trash2 size={18} /></button>
        </div>
      </div>

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

      <PortfolioAssetTable portfolio={portfolio} assets={assets} cdts={cdts} />
      <PortfolioSummary portfolio={portfolio} isRealReturnMode={isRealReturn} />
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

interface PortfoliosViewProps {
  onViewChange: (view: string) => void;
}

const PortfoliosView: React.FC<PortfoliosViewProps> = ({ onViewChange }) => {
  const { user } = useAuth();
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
  const [editingPortfolioId, setEditingPortfolioId] = useState<number | null>(null);

  const { data: portfoliosData, isLoading } = usePortfolios(undefined, !!user);
  const { data: etfsResponse } = useAssets({ type: 'etf' });
  const { data: stocksResponse } = useAssets({ type: 'stock' });
  const { data: cdtsResponse } = useCDTs();
  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio(editingPortfolioId || 0);

  const assets = [...(etfsResponse?.data || []), ...(stocksResponse?.data || [])];
  const cdts = cdtsResponse?.data || [];
  const portfolios = portfoliosData?.portfolios || [];

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
        allocations: mappedAllocations
      });
    } else {
      await createPortfolio.mutateAsync({ 
        ...newPortfolio, 
        allocations: mappedAllocations
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
      allocations: portfolio.allocations?.map(a => ({
        asset_id: a.asset_id,
        cdt_id: a.cdt_id,
        ticker: a.ticker,
        weight_percentage: a.weight_percentage
      })) || []
    });
    setInvestmentInput(portfolio.total_investment_cop.toString());
    setIsCreating(true);
  };

  const handleToggleSelectPortfolio = (id: number) => {
    setSelectedPortfoliosForComparison(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className='max-w-7xl mx-auto space-y-8 pb-32'>
      <div className='flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100'>
        <div>
          <h2 className='text-3xl font-serif font-bold text-slate-900'>Mis Portafolios</h2>
          <p className='text-slate-500 mt-2 font-medium'>Diseña, analiza y compara estrategias de inversión</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => {
              if (!user) {
                onViewChange('login');
                return;
              }
              setIsCreating(true);
            }} 
            className='px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95'
          >
            <Plus size={20} /> Nuevo Portafolio
          </button>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className='bg-white p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden mb-8'
          >
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-primary to-blue-500' />
            <div className='flex justify-between items-start mb-8'>
              <div>
                <h3 className='text-2xl font-serif font-bold text-slate-900'>{editingPortfolioId ? 'Editar Portafolio' : 'Nuevo Portafolio'}</h3>
                <p className='text-slate-500 mt-1 text-sm'>Define tu estrategia de inversión. La IA optimizará el resto.</p>
              </div>
              <button onClick={() => { setIsCreating(false); setEditingPortfolioId(null); setError(''); }} className='p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 transition-colors'>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className='mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3'>
                <AlertTriangle size={18} className='text-rose-500 mt-0.5 shrink-0' />
                <p className='text-sm text-rose-600 font-medium'>{error}</p>
              </div>
            )}

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-12'>
              <div className='space-y-6'>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>Nombre de la Estrategia</label>
                  <input type="text" placeholder="Ej: Retiro 2040, Fondo Emergencia..." value={newPortfolio.name} onChange={e => setNewPortfolio({ ...newPortfolio, name: e.target.value })} className='w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 outline-none focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all text-lg font-serif' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>Tesis de Inversión (Opcional)</label>
                  <textarea placeholder="¿Cuál es el objetivo de este portafolio?" value={newPortfolio.description} onChange={e => setNewPortfolio({ ...newPortfolio, description: e.target.value })} className='w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 outline-none focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all resize-none h-24' />
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2'>Capital Inicial (COP)</label>
                  <div className='relative'>
                    <span className='absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-mono'>$</span>
                    <input type="text" value={investmentInput} onChange={e => {
                      const val = e.target.value.replace(/\D/g, '');
                      setInvestmentInput(val);
                      setNewPortfolio({ ...newPortfolio, total_investment_cop: Number(val) });
                    }} className='w-full pl-10 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 outline-none focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-mono text-lg' />
                  </div>
                  <p className='text-xs text-slate-400 mt-2 ml-2 font-mono'>{formatCurrency(newPortfolio.total_investment_cop)}</p>
                </div>
              </div>

              <div className='space-y-4'>
                <PortfolioRebalancing 
                  allocations={newPortfolio.allocations}
                  onChange={(allocations) => setNewPortfolio({ ...newPortfolio, allocations })}
                  assets={assets}
                  cdts={cdts}
                />
              </div>
            </div>

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
            <p className='text-slate-500 text-sm max-w-sm mx-auto mb-6'>Crea tu primer portafolio seleccionando distintos activos y analizando su rendimiento histórico y proyecciones de riesgo.</p>
            {!user && (
              <button 
                onClick={() => onViewChange('login')}
                className='px-6 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all shadow-md'
              >
                Iniciar Sesión para Crear
              </button>
            )}
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
