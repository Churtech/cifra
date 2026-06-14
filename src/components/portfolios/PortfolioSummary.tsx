import React, { useState } from 'react';
import { Zap, AlertTriangle, ChevronRight, Lightbulb, CheckCircle2, Shield, Info, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portfolio } from '../../types';
import { usePortfolioAnalysis as useAnalysis } from '../../hooks/useFinance';
import { formatCurrency, cn } from '../../lib/utils';

const classificationTranslations: Record<string, string> = {
  conservative: 'Conservador',
  balanced: 'Moderado',
  aggressive: 'Agresivo',
  speculative: 'Especulativo',
  comparison: 'Comparación',
};

export const PortfolioSummary: React.FC<{ portfolio: Portfolio; isRealReturnMode: boolean }> = ({ portfolio, isRealReturnMode }) => {
  const { data: analysisReport, isLoading } = useAnalysis(portfolio.id);
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);

  const rec = portfolio.recommendation;

  const fogafinLimit = 50000000;
  const singleBankCdts: Record<string, number> = {};
  portfolio.allocations?.forEach(alloc => {
    if (alloc.cdt_id && alloc.cdt) {
      const bank = alloc.cdt.institution.name;
      const amount = (alloc.weight_percentage / 100) * portfolio.total_investment_cop;
      singleBankCdts[bank] = (singleBankCdts[bank] || 0) + amount;
    }
  });

  const fogafinAlerts = Object.entries(singleBankCdts)
    .filter(([_, amount]) => amount > fogafinLimit)
    .map(([bank, amount]) => ({ bank, amount }));

  return (
    <div className='mt-8 pt-8 border-t border-slate-50 space-y-8'>
      {/* Analysis Details Segment */}
      {isLoading ? (
        <div className='py-4 text-center text-slate-400 text-xs'>Cargando auditoría cuantitativa...</div>
      ) : analysisReport ? (
        <div className='flex flex-wrap gap-4'>
          {analysisReport.data_quality && (
            <div className='relative'>
              <div className='flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500 shadow-sm'>
                <Info size={12} className={cn(analysisReport.data_quality.score >= 90 ? 'text-emerald-500' : 'text-amber-500')} />
                <span>Fidelidad de Datos: {analysisReport.data_quality.score}/100</span>
                {analysisReport.data_quality.warnings?.length > 0 && (
                  <button 
                    onClick={() => setShowAlertsPopover(!showAlertsPopover)}
                    className='text-amber-500 hover:text-amber-600 cursor-pointer underline ml-1 font-mono outline-none'
                  >
                    ({analysisReport.data_quality.warnings.length} alerts)
                  </button>
                )}
              </div>
              {analysisReport.data_quality.warnings?.length > 0 && (
                <AnimatePresence>
                  {showAlertsPopover && (
                    <>
                      <div className='fixed inset-0 z-30' onClick={() => setShowAlertsPopover(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className='absolute bottom-full left-0 mb-2 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl p-5 z-40 text-left'
                      >
                        <div className='flex items-center gap-2 mb-3 pb-2 border-b border-slate-100'>
                          <AlertTriangle size={14} className='text-amber-500' />
                          <h5 className='text-[10px] font-bold text-slate-700 uppercase tracking-wider'>Advertencias</h5>
                        </div>
                        <ul className='space-y-2 mb-4 max-h-48 overflow-y-auto pr-1'>
                          {analysisReport.data_quality.warnings.map((warn, i) => (
                            <li key={i} className='flex items-start gap-2 text-[10px] text-slate-600 font-normal'>{warn}</li>
                          ))}
                        </ul>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              )}
            </div>
          )}
          {fogafinAlerts.map(alert => (
            <div key={alert.bank} className='flex items-start gap-2 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-2xl text-[11px] text-amber-700 font-medium w-full'>
              <AlertTriangle size={16} className='mt-0.5 shrink-0 text-amber-500' />
              <span>
                <strong>Límite Fogafín Superado en {alert.bank}:</strong> Tienes proyectado {formatCurrency(alert.amount)}.
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* IA Insights Segment */}
      {rec && (
        <>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Zap size={16} className='text-amber-500' fill='currentColor' />
              <h4 className='text-xs font-bold text-primary uppercase tracking-widest'>Reporte de Inteligencia IA</h4>
            </div>
            <div className='flex items-center gap-2'>
              {rec.classification && (
                <span className='px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold uppercase tracking-widest'>
                  Perfil: {classificationTranslations[rec.classification.toLowerCase()] || rec.classification}
                </span>
              )}
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='space-y-4'>
              <h5 className='text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2'>
                <AlertTriangle size={12} /> Riesgos Detectados
              </h5>
              <div className='space-y-2'>
                {rec.risks?.map((risk, i) => (
                  <div key={i} className='flex items-start gap-2 p-3 bg-rose-50/50 rounded-xl border border-rose-100/50'>
                    <ChevronRight size={12} className='text-rose-400 mt-0.5 shrink-0' />
                    <p className='text-[11px] text-rose-700 leading-relaxed'>{risk}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className='space-y-4'>
              <h5 className='text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2'>
                <Lightbulb size={12} /> Acciones Sugeridas
              </h5>
              <div className='space-y-2'>
                {rec.actions?.map((action, i) => (
                  <div key={i} className='flex items-start gap-2 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50'>
                    <CheckCircle2 size={12} className='text-emerald-500 mt-0.5 shrink-0' />
                    <p className='text-[11px] text-emerald-800 leading-relaxed'>{action}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {analysisReport?.human_analysis && (
        <div className='p-6 bg-slate-900 rounded-[32px] text-white shadow-xl relative overflow-hidden group hover:bg-slate-800 transition-all'>
          <div className='absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-bl-full -mr-16 -mt-16 pointer-events-none' />
          <div className='relative z-10 space-y-4'>
            <p className='text-[10px] text-emerald-400 uppercase tracking-widest font-bold'>Análisis Humano de IA</p>
            <p className='text-xs leading-relaxed text-slate-300 italic'>"{analysisReport.human_analysis.summary}"</p>
          </div>
        </div>
      )}
    </div>
  );
};
