import React, { useState } from 'react';
import { Scale, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PortfolioAllocation, AssetDetail, CDTDetail } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface PortfolioRebalancingProps {
  allocations: PortfolioAllocation[];
  onChange: (allocations: PortfolioAllocation[]) => void;
  assets: AssetDetail[];
  cdts: CDTDetail[];
}

export const PortfolioRebalancing: React.FC<PortfolioRebalancingProps> = ({ allocations, onChange, assets, cdts }) => {
  const [assetSearch, setAssetSearch] = useState('');
  const [isAssetDropdownOpen, setIsAssetDropdownOpen] = useState(false);

  const filteredAssets = assets.filter(a =>
    a.asset.ticker.toLowerCase().includes(assetSearch.toLowerCase()) ||
    a.asset.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const filteredCDTs = cdts.filter(c =>
    c.cdt.institution.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const addAllocation = (item: { ticker?: string; asset_id?: number; cdt_id?: number }) => {
    const exists = allocations.some(a => 
      (item.cdt_id && a.cdt_id === item.cdt_id) ||
      (item.asset_id && a.asset_id === item.asset_id) ||
      (item.ticker && a.ticker === item.ticker)
    );
    if (exists) return;

    const newAllocations = [...allocations, { 
      ticker: item.ticker,
      asset_id: item.asset_id,
      cdt_id: item.cdt_id,
      weight_percentage: 0 
    }];
    const count = newAllocations.length;
    const evenly = Math.floor(100 / count);
    const remainder = 100 - (evenly * count);

    const distributed = newAllocations.map((a, i) => ({
      ...a,
      weight_percentage: evenly + (i < remainder ? 1 : 0)
    }));

    onChange(distributed);
  };

  const removeAllocation = (allocToRemove: PortfolioAllocation) => {
    const newAllocations = allocations.filter(a => {
      if (allocToRemove.cdt_id && a.cdt_id === allocToRemove.cdt_id) return false;
      if (allocToRemove.asset_id && a.asset_id === allocToRemove.asset_id) return false;
      if (allocToRemove.ticker && a.ticker === allocToRemove.ticker) return false;
      return true;
    });

    if (newAllocations.length === 0) {
      onChange([]);
      return;
    }
    const count = newAllocations.length;
    const evenly = Math.floor(100 / count);
    const remainder = 100 - (evenly * count);

    const distributed = newAllocations.map((a, i) => ({
      ...a,
      weight_percentage: evenly + (i < remainder ? 1 : 0)
    }));

    onChange(distributed);
  };

  const handleAllocationChange = (allocKey: { ticker?: string; cdt_id?: number }, newValue: number) => {
    let current = [...allocations];
    const index = current.findIndex(a => 
      (allocKey.cdt_id && a.cdt_id === allocKey.cdt_id) || 
      (allocKey.ticker && a.ticker === allocKey.ticker)
    );
    if (index === -1) return;

    const oldValue = current[index].weight_percentage;
    const difference = newValue - oldValue;

    if (current.length === 1) {
      current[0].weight_percentage = 100;
      onChange(current);
      return;
    }

    const others = current.filter((_, i) => i !== index);
    const sumOthers = others.reduce((acc, a) => acc + a.weight_percentage, 0);

    current[index].weight_percentage = newValue;

    if (sumOthers === 0) {
      const diffPerOther = difference / others.length;
      others.forEach(o => {
        const i = current.findIndex(a => 
          (o.cdt_id && a.cdt_id === o.cdt_id) || 
          (o.ticker && a.ticker === o.ticker)
        );
        current[i].weight_percentage -= diffPerOther;
      });
    } else {
      others.forEach(o => {
        const i = current.findIndex(a => 
          (o.cdt_id && a.cdt_id === o.cdt_id) || 
          (o.ticker && a.ticker === o.ticker)
        );
        const proportion = o.weight_percentage / sumOthers;
        current[i].weight_percentage -= difference * proportion;
      });
    }

    current = current.map(a => ({ ...a, weight_percentage: Math.round(a.weight_percentage) }));
    const roundedSum = current.reduce((acc, a) => acc + a.weight_percentage, 0);
    if (roundedSum !== 100) {
      const diff = 100 - roundedSum;
      const otherIndex = index === 0 ? 1 : 0;
      current[otherIndex].weight_percentage += diff;
    }

    current = current.map(a => ({ ...a, weight_percentage: Math.max(0, Math.min(100, a.weight_percentage)) }));
    onChange(current);
  };

  const handleBalanceWeights = () => {
    const count = allocations.length;
    if (count === 0) return;
    const evenly = Math.floor(100 / count);
    const remainder = 100 - (evenly * count);

    const distributed = allocations.map((a, i) => ({
      ...a,
      weight_percentage: evenly + (i < remainder ? 1 : 0)
    }));

    onChange(distributed);
  };

  return (
    <div className='relative z-20'>
      <div className='flex justify-between items-center mb-2'>
        <label className='block text-xs font-bold text-slate-400 uppercase'>Activos (Total: 100%)</label>
        {allocations.length > 0 && (
          <button
            onClick={handleBalanceWeights}
            className='text-[9px] font-bold text-primary uppercase bg-slate-50 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors flex items-center gap-1 shadow-sm'
          >
            <Scale size={10} /> Equilibrar Pesos
          </button>
        )}
      </div>
      <input
        type="text"
        placeholder="+ Buscar activo (SPY, Bancolombia, CDT...)"
        value={assetSearch}
        onFocus={() => setIsAssetDropdownOpen(true)}
        onBlur={() => setTimeout(() => setIsAssetDropdownOpen(false), 200)}
        onChange={e => {
          setAssetSearch(e.target.value);
          setIsAssetDropdownOpen(true);
        }}
        className='w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-primary transition-colors'
      />

      <AnimatePresence>
        {isAssetDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className='absolute z-30 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto'
          >
            {filteredAssets.map(asset => (
              <div
                key={`asset-dropdown-${asset.asset.id}`}
                onMouseDown={() => {
                  addAllocation({ asset_id: asset.asset.id, ticker: asset.asset.ticker });
                  setAssetSearch('');
                }}
                className='px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center'
              >
                <div>
                  <p className='text-sm font-bold text-primary'>{asset.asset.ticker}</p>
                  <p className='text-xs text-slate-500 truncate'>{asset.asset.name}</p>
                </div>
                <span className='px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold uppercase tracking-wider'>RV</span>
              </div>
            ))}
            {filteredCDTs.map(item => (
              <div
                key={`cdt-dropdown-${item.cdt.id}`}
                onMouseDown={() => {
                  addAllocation({ cdt_id: item.cdt.id });
                  setAssetSearch('');
                }}
                className='px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center'
              >
                <div>
                  <p className='text-sm font-bold text-primary'>CDT {item.cdt.institution.name} ({item.cdt.plazo_dias}D)</p>
                  <p className='text-xs text-slate-500 truncate'>Tasa: {item.cdt.tasa_ea}% E.A. • Mín: {formatCurrency(item.cdt.monto_min)}</p>
                </div>
                <span className='px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[8px] font-bold uppercase tracking-wider'>CDT</span>
              </div>
            ))}
            {filteredAssets.length === 0 && filteredCDTs.length === 0 && (
              <div className='p-4 text-sm text-center text-slate-400'>No se encontraron activos o CDTs</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className='space-y-2 mt-4'>
        {allocations.map((alloc, idx) => {
          const isCDT = !!alloc.cdt_id;
          const cdtInfo = cdts.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
          const assetInfo = assets.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
          const displayName = isCDT 
            ? `CDT ${cdtInfo?.institution?.name || 'Bancario'} (${cdtInfo?.plazo_dias || '---'}D)`
            : (assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || idx + 1}`);

          return (
            <div key={alloc.cdt_id ? `alloc-cdt-${alloc.cdt_id}` : `alloc-asset-${alloc.ticker || alloc.asset_id || idx}`} className='flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 shadow-sm'>
              <span className='text-xs font-bold w-32 text-primary truncate' title={displayName}>{displayName}</span>
              <input 
                type='range' 
                min='0' 
                max='100' 
                value={alloc.weight_percentage} 
                onChange={e => handleAllocationChange({ ticker: alloc.ticker, cdt_id: alloc.cdt_id }, Number(e.target.value))} 
                className='flex-1 accent-primary' 
              />
              <span className='text-xs font-mono w-10 text-right'>{alloc.weight_percentage}%</span>
              <button onClick={() => removeAllocation(alloc)} className='text-slate-300 hover:text-rose-500 transition-colors' type='button'><X size={14} /></button>
            </div>
          );
        })}
        {allocations.length === 0 && (
          <div className='text-center p-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed'>
            <p className='text-xs text-slate-400'>No has agregado activos aún.</p>
          </div>
        )}
      </div>
    </div>
  );
};
