import React from 'react';
import { LayoutDashboard, Wallet, BarChart3, ArrowLeftRight, TrendingUp, PieChart, Menu, X, ShieldCheck, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const [isOpen, setIsOpen] = React.useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Panorama General', icon: LayoutDashboard },
    { id: 'cdts', label: 'CDTs & Renta Fija', icon: Wallet },
    { id: 'assets', label: 'Acciones & ETFs', icon: BarChart3 },
    { id: 'portfolios', label: 'Simulador Portafolios', icon: Briefcase },
    { id: 'compare', label: 'Comparativa Real', icon: ArrowLeftRight },
    { id: 'correlations', label: 'Correlaciones', icon: PieChart },
    { id: 'metrics', label: 'Métricas de Mercado', icon: TrendingUp },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-primary text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[45]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col shadow-xl lg:shadow-none"
          >
            <div className="p-8 flex-1 flex flex-col overflow-y-auto">
              <div className="flex items-center gap-3 mb-12">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <div className="w-5 h-5 border-2 border-white rounded-sm rotate-45" />
                </div>
                <div>
                  <h1 className="text-xl font-serif text-primary leading-none tracking-tight font-bold">FinCompare</h1>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold mt-1">Sistemas v1.2</p>
                </div>
              </div>

              <div className="space-y-8">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onViewChange(item.id);
                          if (window.innerWidth < 1024) setIsOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                          isActive 
                            ? 'bg-primary text-white shadow-lg shadow-primary/10' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                        )}
                      >
                        <Icon size={18} className={cn(isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                        <span className="text-sm font-medium tracking-tight">{item.label}</span>
                        {isActive && (
                          <motion.div 
                            layoutId="active-pill"
                            className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full"
                          />
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="pt-8 border-t border-slate-50">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-4">Recursos</p>
                   <div className="space-y-1">
                     <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-primary transition-all">
                       <ShieldCheck size={18} className="text-slate-400" />
                       <span className="text-sm font-medium">Seguridad de Datos</span>
                     </button>
                   </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Servidor Activo</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Todos los sistemas están operativos y sincronizados con la BVC y NYSE.
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
