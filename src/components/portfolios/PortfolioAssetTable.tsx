import React from 'react';
import { Portfolio, AssetDetail, CDTDetail } from '../../types';

interface PortfolioAssetTableProps {
  portfolio: Portfolio;
  assets: AssetDetail[];
  cdts: CDTDetail[];
}

export const PortfolioAssetTable: React.FC<PortfolioAssetTableProps> = ({ portfolio, assets, cdts }) => {
  const colors = ['#0F172A', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#14B8A6'];

  return (
    <div className='space-y-4 mb-8 pl-8 lg:pl-10'>
      <div className='flex justify-between items-center'>
        <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Asignación Táctica de Activos</span>
        <span className='text-[10px] font-bold text-primary uppercase tracking-widest'>{portfolio.metrics?.diversification_score || 0}/100 Diversificación</span>
      </div>
      <div className='h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner'>
        {portfolio.allocations?.map((alloc, i) => {
          const assetInfo = assets?.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
          const cdtInfo = cdts?.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
          const name = alloc.cdt_id
            ? `CDT ${cdtInfo?.institution?.name || 'Bancario'} (${cdtInfo?.plazo_dias || '---'}D)`
            : (assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || i + 1}`);

          return (
            <div
              key={i}
              title={`${name} - ${alloc.weight_percentage}%`}
              style={{ width: `${alloc.weight_percentage}%`, backgroundColor: colors[i % colors.length] }}
              className='h-full relative group/alloc cursor-pointer'
            >
              <div className='absolute inset-0 bg-white/10 opacity-0 group-hover/alloc:opacity-100 transition-opacity' />
            </div>
          );
        })}
      </div>

      <div className='flex flex-wrap gap-4 mt-3 bg-slate-50 p-4 rounded-2xl border border-slate-100'>
        {portfolio.allocations?.map((alloc, i) => {
          const assetInfo = assets?.find(a => a.asset.ticker === alloc.ticker || a.asset.id === alloc.asset_id)?.asset;
          const cdtInfo = cdts?.find(c => c.cdt.id === alloc.cdt_id)?.cdt;
          const displayName = alloc.cdt_id
            ? `CDT ${cdtInfo?.institution?.name || 'Bancario'} (${cdtInfo?.plazo_dias || '---'}D)`
            : (assetInfo?.ticker || alloc.ticker || `Asset ${alloc.asset_id || i + 1}`);
          const detailName = alloc.cdt_id
            ? `Tasa E.A: ${cdtInfo?.tasa_ea}%`
            : (assetInfo?.name || '');

          return (
            <div key={i} className='flex items-center gap-2 min-w-[120px] group/legend' title={detailName}>
              <div className='w-3 h-3 rounded-full shadow-sm' style={{ backgroundColor: colors[i % colors.length] }} />
              <span className='text-xs font-bold text-slate-700'>{displayName}</span>
              {detailName && <span className='text-[10px] text-slate-400 hidden md:inline-block max-w-[150px] truncate'>{detailName}</span>}
              <span className='text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-100'>{alloc.weight_percentage.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
