import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, Shield, Calculator, PieChart, ArrowRight, Copy, Check } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { ComparisonItem } from '../types';
import { useMarketMetrics } from '../hooks/useFinance';

interface ProjectionDrawerProps {
  comparisonItem: ComparisonItem | null;
  isOpen: boolean;
  onClose: () => void;
  initialInvestment?: number;
}

const ProjectionDrawer: React.FC<ProjectionDrawerProps> = ({ comparisonItem, isOpen, onClose, initialInvestment = 5000000 }) => {
  const [amount, setAmount] = useState<number>(initialInvestment);
  const [displayValue, setDisplayValue] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && initialInvestment) {
      setDisplayValue(initialInvestment.toLocaleString('es-CO'));
      setAmount(initialInvestment);
    }
  }, [isOpen, initialInvestment]);

  // ── Hooks (siempre antes de cualquier return condicional) ─────────────────
  const { data: metricsData } = useMarketMetrics();

  if (!comparisonItem) return null;

  const item           = comparisonItem;
  const isCDT          = item.type === 'CDT';
  const entityName     = isCDT ? (item.institution ?? item.product) : item.product;
  const ticker         = item.ticker;

  // Data del Backend (Source of Truth)
  const gainNet        = item.gain;
  const netReturn      = item.net_return;                          // tasa neta E.A.
  const nominalReturn  = item.rate_ea || item.annual_return || 0; // tasa bruta

  // Rendimiento Real = Fisher: ((1 + neto) / (1 + ipc) - 1)
  const ipc = metricsData?.data?.inflation_rate ?? 0;
  const realReturn = (item.real_return && item.real_return > 0)
    ? item.real_return
    : ipc > 0
      ? ((1 + netReturn / 100) / (1 + ipc / 100) - 1) * 100
      : 0;

  const handleCopySummary = () => {
    const text = `Análisis FinCompare:\nActivo: ${entityName} ${ticker ? `(${ticker})` : ''}\nInversión: ${formatCurrency(initialInvestment)}\nRetorno Neto: ${netReturn}%\nGanancia Proyectada: ${formatCurrency(gainNet)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAction = () => {
    const query = encodeURIComponent(`${entityName} ${isCDT ? 'CDT online' : 'invertir desde Colombia'}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-[101] flex flex-col border-l border-slate-100"
          >
            {/* Header Institucional */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-serif font-bold text-white">Análisis de Inversión</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-bold">{item.type}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold">{entityName}</p>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Resumen de Ganancia */}
              <div className="bg-slate-50 rounded-[40px] p-10 border border-slate-100 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Utilidad Neta Proyectada</p>
                  <h2 className="text-5xl font-mono font-bold text-primary mb-4 tracking-tighter">
                    {formatCurrency(gainNet)}
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {netReturn.toFixed(2)}% E.A. NETO
                    </div>
                    <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      Oficial Backend
                    </div>
                  </div>
                </div>
                <div className="absolute top-1/2 right-10 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                  <Calculator size={180} />
                </div>
              </div>

              {/* Justificación de Decisión (El "Peso") */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Peso de la Decisión</h4>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                    <Shield size={12} /> Datos Verificados
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {/* Card: Rendimiento Real */}
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Rendimiento Real (vs IPC)</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {ipc > 0 ? `IPC referencia: ${ipc.toFixed(2)}%` : 'Tasa neta ajustada por inflación'}
                          </p>
                        </div>
                      </div>
                      {realReturn > 0 ? (
                        <span className="text-xl font-mono font-bold text-emerald-600">+{realReturn.toFixed(2)}%</span>
                      ) : (
                        <span className="text-sm font-mono font-bold text-slate-400">N/D</span>
                      )}
                    </div>
                    {realReturn > 0 ? (
                      <>
                        <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (realReturn / 8) * 100)}%` }} />
                        </div>
                        {ipc > 0 && (
                          <p className="text-[10px] text-slate-400">
                            Tu dinero crece <span className="font-bold text-emerald-600">{realReturn.toFixed(2)}%</span> por encima de la inflación
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-slate-400">Sin datos de IPC disponibles en el servidor</p>
                    )}
                  </div>

                  {/* Card: Impuestos y Retención */}
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                          <PieChart size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Eficiencia Tributaria</p>
                          <p className="text-[10px] text-slate-400 font-medium">Tasa Bruta: {nominalReturn}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Impacto Fiscal</p>
                        <p className="text-xs font-mono font-bold text-slate-900">Retención Aplicada</p>
                      </div>
                    </div>
                  </div>

                  {/* Card: Liquidez y Riesgo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-3xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Liquidez</p>
                      <p className="text-xs font-bold text-primary">{item.liquidity}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nivel de Riesgo</p>
                      <div className="flex items-center gap-2">
                        <Shield size={14} className="text-emerald-500" />
                        <p className="text-xs font-bold text-primary">{item.risk}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota de Garantía */}
              {item.guarantee && (
                <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                    <Shield size={20} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-tight mb-1">Garantía Institucional</p>
                    <p className="text-[11px] leading-relaxed text-emerald-700/80 font-medium">
                      Este producto cuenta con respaldo de <span className="font-bold">{item.guarantee}</span>. 
                      Tu inversión está protegida bajo los términos vigentes del sistema financiero.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de Acción */}
            <div className="p-8 border-t border-slate-100 bg-white space-y-4">
              <button 
                onClick={handleAction}
                className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-bold text-sm hover:bg-primary hover:shadow-2xl hover:shadow-primary/20 transition-all flex items-center justify-center gap-3 group active:scale-95"
              >
                Ejecutar Inversión en {entityName}
                <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </button>
              <button 
                onClick={handleCopySummary}
                className="w-full py-4 bg-white text-slate-400 border border-slate-100 rounded-[24px] font-bold text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                {copied ? 'Análisis Copiado' : 'Copiar Ficha Técnica para Comité'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProjectionDrawer;
