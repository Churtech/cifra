import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Download, Building2, Search, Database } from 'lucide-react';
import { useCDTs } from '../hooks/useFinance';
import { formatCurrency, cn } from '../lib/utils';
import { CDTDetail, ComparisonItem } from '../types';
import ProjectionDrawer from '../components/ProjectionDrawer';
import { DEFAULT_INVESTMENT } from '../constants';

const CDTsView: React.FC = () => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCDT, setSelectedCDT] = useState<ComparisonItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const { data: cdtsResponse, isLoading } = useCDTs();
  const cdts = cdtsResponse?.data || [];

  const filteredCDTs = useMemo(() => {
    return cdts.filter((item: CDTDetail) => {
      const entityName = item?.cdt?.institution?.name || 'Entidad Financiera';
      return entityName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [cdts, searchTerm]);

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCDTs.length && filteredCDTs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCDTs.map(item => item?.cdt?.id).filter(Boolean) as number[]);
    }
  };

  const handleOpenProjection = (item: CDTDetail) => {
    const entityName = item?.cdt?.institution?.name || 'Entidad Financiera';
    const compItem: ComparisonItem = {
      rank: 0,
      type: 'CDT',
      institution: entityName,
      product: entityName,
      ticker: undefined,
      rate_ea: item.cdt?.tasa_ea,
      nominal_return: item.nominal_return,
      net_return: item.net_return,
      real_return: item.real_return,
      final_amount: item.final_amount,
      gain: item.interest_net,
      risk: item.risk,
      liquidity: item.liquidity,
      guarantee: item.guarantee,
    };
    setSelectedCDT(compItem);
    setIsDrawerOpen(true);
  };

  const handleExport = () => {
    const itemsToExport = selectedIds.length > 0 
      ? filteredCDTs.filter(item => item?.cdt?.id && selectedIds.includes(item.cdt.id))
      : filteredCDTs;

    if (itemsToExport.length === 0) return;

    const headers = ['Entidad', 'Plazo (Días)', 'Tasa EA (%)', 'Monto Min', 'Interes Neto Est.'];
    const rows = itemsToExport.map(item => [
      item?.cdt?.institution?.name || 'N/A',
      item?.cdt?.plazo_dias || '0',
      item?.cdt?.tasa_ea || '0',
      item?.cdt?.monto_min || '0',
      item?.interest_net || '0'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fincompare_cdts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className='space-y-6 pb-20'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight'>CDTs & Renta Fija</h2>
          <div className='flex items-center gap-2 mt-1'>
             <div className='flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-bold text-emerald-700 uppercase tracking-widest'>
               <Database size={10} /> Datos SFC Sincronizados
             </div>
             {selectedIds.length > 0 && (
               <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className='px-2 py-0.5 bg-primary text-white rounded text-[9px] font-bold uppercase tracking-widest'
               >
                 {selectedIds.length} Seleccionados
               </motion.div>
             )}
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <button 
            onClick={toggleSelectAll}
            disabled={filteredCDTs.length === 0}
            className='px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-primary transition-colors disabled:opacity-30'
          >
            {selectedIds.length === filteredCDTs.length && filteredCDTs.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
          <button 
            onClick={handleExport}
            disabled={filteredCDTs.length === 0}
            className='flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-primary/20 transition-all active:scale-95 shadow-sm disabled:opacity-50'
          >
             <Download size={14} className='text-primary' /> 
             {selectedIds.length > 0 ? `Exportar (${selectedIds.length})` : 'Exportar Todo'}
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' size={14} />
          <input 
            type='text' 
            placeholder='Buscar entidad...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:border-primary transition-all'
          />
        </div>
        <div className='flex items-center justify-center bg-slate-50 border border-slate-100 rounded-xl p-2'>
          <div className='flex items-center gap-2 text-slate-500'>
            <Building2 size={14} />
            <span className='text-[10px] font-bold uppercase tracking-widest'>Entidades Vigiladas por la SFC</span>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className='h-48 bg-slate-50 rounded-2xl animate-pulse border border-slate-100' />
          ))
        ) : (
          filteredCDTs.length > 0 ? filteredCDTs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((item: CDTDetail, idx: number) => {
            const entityName = item?.cdt?.institution?.name || 'Banco Aliado';
            const isSelected = item?.cdt?.id ? selectedIds.includes(item.cdt.id) : false;
            return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                onClick={() => item?.cdt?.id && toggleSelection(item.cdt.id)}
                className={cn(
                  'bg-white border p-7 rounded-2xl shadow-sm hover:shadow-xl transition-all group relative cursor-pointer',
                  isSelected ? 'border-primary ring-2 ring-primary/5' : 'border-slate-100'
                )}
              >
                <div className={cn(
                  'absolute top-5 right-5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  isSelected ? 'bg-primary border-primary scale-110' : 'border-slate-200 bg-white'
                )}>
                  {isSelected && <div className='w-2 h-2 bg-white rounded-full' />}
                </div>

                <div className='flex items-start justify-between mb-8'>
                  <div className='flex items-center gap-4'>
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center font-serif italic text-xl border transition-all',
                      isSelected ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 text-primary border-slate-100 group-hover:bg-primary group-hover:text-white'
                    )}>
                      {entityName[0]}
                    </div>
                    <div>
                      <h3 className='text-base font-bold text-primary leading-tight'>{entityName}</h3>
                      <div className='flex items-center gap-2 mt-1.5'>
                        <Calendar size={12} className='text-slate-400' />
                        <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>{item?.cdt?.plazo_dias || '---'} Días</span>
                      </div>
                    </div>
                  </div>
                  <div className='text-right pr-8'>
                     <span className='text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg uppercase tracking-tight'>Tasa EA</span>
                     <p className='text-3xl font-mono font-bold text-primary mt-1'>{item?.cdt?.tasa_ea || 0}%</p>
                  </div>
                </div>

                <div className='space-y-4 pt-6 border-t border-slate-50'>
                  <div className='flex justify-between items-center'>
                    <span className='text-xs text-slate-400 font-medium uppercase tracking-wider'>Monto Mínimo</span>
                    <span className='text-sm font-bold text-primary font-mono'>
                      {(item?.cdt?.monto_min && item?.cdt?.monto_min > 0) ? formatCurrency(item?.cdt?.monto_min) : 'No especificado'}
                    </span>
                  </div>
                  <div className='flex justify-between items-center'>
                    <span className='text-xs text-slate-400 font-medium uppercase tracking-wider'>Retorno Neto Est.</span>
                    <span className='text-sm font-bold text-emerald-600 font-mono'>{formatCurrency(item?.interest_net || 0)}</span>
                  </div>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProjection(item);
                  }}
                  className='w-full mt-8 py-3.5 bg-slate-50 text-slate-500 font-bold text-[10px] tracking-[0.2em] uppercase hover:bg-primary hover:text-white transition-all rounded-xl border border-slate-100'
                >
                  Ver Proyección
                </button>
              </motion.div>
            );
          }) : (
            <div className='col-span-full py-20 text-center bg-white border-2 border-dashed border-slate-100 rounded-3xl'>
               <p className='text-sm text-slate-400 uppercase tracking-widest font-bold'>No hay resultados que coincidan</p>
            </div>
          )
        )}
      </div>

      {/* Control de Paginación */}
      {Math.ceil(filteredCDTs.length / ITEMS_PER_PAGE) > 1 && (
        <div className='flex items-center justify-between bg-white border border-slate-100 px-6 py-4 rounded-2xl shadow-sm mt-8'>
          <p className='text-xs text-slate-500 font-bold uppercase tracking-wider font-sans'>
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredCDTs.length)} de {filteredCDTs.length} CDTs
          </p>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className='px-4 py-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all'
            >
              Anterior
            </button>
            <span className='text-xs font-bold font-mono text-primary bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-150'>
              Página {currentPage} de {Math.ceil(filteredCDTs.length / ITEMS_PER_PAGE)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCDTs.length / ITEMS_PER_PAGE), prev + 1))}
              disabled={currentPage === Math.ceil(filteredCDTs.length / ITEMS_PER_PAGE)}
              className='px-4 py-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 hover:border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all'
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <ProjectionDrawer 
        comparisonItem={selectedCDT} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        initialInvestment={DEFAULT_INVESTMENT} 
      />
    </div>
  );
};

export default CDTsView;
