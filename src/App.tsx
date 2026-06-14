import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { LoginPage } from './components/auth/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WhatsNewModal } from './components/WhatsNewModal';

const Dashboard = lazy(() => import('./views/Dashboard'));
const AssetsView = lazy(() => import('./views/Assets'));
const ComparisonView = lazy(() => import('./views/Comparison'));
const CDTsView = lazy(() => import('./views/CDTs'));
const CorrelationsView = lazy(() => import('./views/Correlations'));
const MetricsView = lazy(() => import('./views/Metrics'));
const PortfoliosView = lazy(() => import('./views/Portfolios'));
const RetrospectiveSimulator = lazy(() => import('./views/RetrospectiveSimulator'));
const ScenarioSimulator = lazy(() => import('./views/ScenarioSimulator'));
const AdminPanel = lazy(() => import('./views/AdminPanel'));

function AppContent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleViewChange = (view: string) => {
    navigate(`/${view}`);
  };

  const currentView = location.pathname.replace('/', '') || 'dashboard';

  return (
    <div className="flex min-h-screen bg-slate-50/50 overflow-x-hidden">
      <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      
      <main className="flex-1 lg:pl-72 flex flex-col min-h-screen max-w-full overflow-x-hidden relative">
        <Header />
        
        <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full flex-1 overflow-x-hidden">
          <ErrorBoundary fallbackMessage="Failed to load application view. No default data is shown.">
            <Suspense fallback={<div className="flex items-center justify-center p-8">Loading...</div>}>
              <WhatsNewModal />
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="w-full"
                >
                  <Routes location={location}>
                    <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <LoginPage />} />
                    <Route path="/dashboard" element={<Dashboard onViewChange={handleViewChange} />} />
                    <Route path="/assets" element={<AssetsView />} />
                    <Route path="/compare" element={<ComparisonView />} />
                    <Route path="/cdts" element={<CDTsView />} />
                    <Route path="/correlations" element={<CorrelationsView />} />
                    <Route path="/metrics" element={<MetricsView />} />
                    <Route path="/portfolios" element={<PortfoliosView onViewChange={handleViewChange} />} />
                    <Route path="/sys-ops" element={<AdminPanel />} />
                    <Route path="/retrospective" element={<RetrospectiveSimulator />} />
                    <Route path="/scenarios" element={<ScenarioSimulator />} />
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </div>

        <footer className="px-8 lg:px-12 py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 bg-white/50">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">© 2026 Cifra Intelligence Terminal</p>
            <p className="text-[9px] text-slate-300 uppercase tracking-widest font-medium italic">Grado Institucional • Conectividad de Baja Latencia</p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-8">
            <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Protocolos</a>
            <a href="#" className="text-[10px] font-bold text-slate-400 hover:text-primary transition-colors uppercase tracking-widest">Soberanía de Datos</a>
            <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              v1.1.0 - Red
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}
