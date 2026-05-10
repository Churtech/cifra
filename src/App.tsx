import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './views/Dashboard';
import AssetsView from './views/Assets';
import ComparisonView from './views/Comparison';
import CDTsView from './views/CDTs';
import CorrelationsView from './views/Correlations';
import MetricsView from './views/Metrics';
import PortfoliosView from './views/Portfolios';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [currentView, setCurrentView] = React.useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onViewChange={setCurrentView} />;
      case 'assets': return <AssetsView />;
      case 'compare': return <ComparisonView />;
      case 'cdts': return <CDTsView />;
      case 'correlations': return <CorrelationsView />;
      case 'metrics': return <MetricsView />;
      case 'portfolios': return <PortfoliosView />;
      default: return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50 overflow-x-hidden">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen max-w-full overflow-x-hidden relative">
        <Header />
        
        <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full flex-1 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="w-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="px-8 lg:px-12 py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 bg-white/50">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">© 2026 FinCompare Intelligence Terminal</p>
            <p className="text-[9px] text-slate-300 uppercase tracking-widest font-medium italic">Grado Institucional • Conectividad de Baja Latencia</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8">
            <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Protocolos</a>
            <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Soberanía de Datos</a>
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Build 05.09 - Institutional
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
