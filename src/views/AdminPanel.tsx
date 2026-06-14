import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { ShieldAlert, Plus, Search, Check, RefreshCw, Database, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface Asset {
  id: number;
  ticker: string;
  name: string;
  type: string;
  exchange: string;
  currency: string;
  active: boolean;
}

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [newTicker, setNewTicker] = useState('');
  const [newType, setNewType] = useState('stock');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const isAdmin = user?.email === 'juanesteban.paezalbarracin@gmail.com';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const res = await api.get('/sys-ops/assets');
      setAssets(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch assets', err);
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message;
      setFetchError(`Error ${status ?? ''}: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAssets();
    else setLoading(false);
  }, [isAdmin]);

  // Security check client-side — MUST come after all hooks
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <ShieldAlert className="w-16 h-16 text-slate-700 mx-auto" />
          <h1 className="text-2xl font-bold text-slate-100">404 - Not Found</h1>
          <p className="text-slate-400">The page you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker) return;
    
    setAdding(true);
    setAddError('');
    setAddSuccess(false);

    try {
      await api.post('/sys-ops/assets', {
        ticker: newTicker.toUpperCase(),
        type: newType,
        exchange: newType === 'stock' ? 'NASDAQ' : 'NYSE',
        currency: 'USD'
      });
      setAddSuccess(true);
      setNewTicker('');
      fetchAssets();
      
      setTimeout(() => setAddSuccess(false), 3000);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setAddError('No tienes permisos de administrador.');
      } else {
        setAddError(err.response?.data?.error || 'Error al agregar el activo.');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRunJobs = async () => {
    try {
      await api.get('/sys-ops/run-jobs');
      showToast('Sincronización iniciada en segundo plano. Puede tardar varios minutos.', 'success');
    } catch (err) {
      showToast('Error al iniciar la sincronización. Revisá los logs del servidor.', 'error');
    }
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / ITEMS_PER_PAGE));
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className='space-y-6 pb-20 relative'>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-5 py-4 rounded-2xl shadow-xl border max-w-sm animate-fade-in ${
          toast.type === 'success'
            ? 'bg-white border-emerald-100 text-emerald-700'
            : 'bg-white border-rose-100 text-rose-600'
        }`}>
          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            {toast.type === 'success'
              ? <Check className='w-3 h-3 text-emerald-600' />
              : <ShieldAlert className='w-3 h-3 text-rose-500' />}
          </div>
          <div className='flex-1'>
            <p className='text-[11px] font-bold uppercase tracking-widest mb-0.5'>
              {toast.type === 'success' ? 'Sistema' : 'Error'}
            </p>
            <p className='text-xs leading-relaxed text-slate-600'>{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className='text-slate-300 hover:text-slate-500 transition-colors ml-1'>
            <X className='w-4 h-4' />
          </button>
        </div>
      )}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <h2 className='text-3xl md:text-4xl font-serif text-primary tracking-tight'>SysOps Panel</h2>
          <div className='flex items-center gap-2 mt-1'>
             <div className='flex items-center gap-1.5 px-2 py-0.5 bg-rose-50 border border-rose-100 rounded text-[9px] font-bold text-rose-700 uppercase tracking-widest'>
               <ShieldAlert size={12} /> Acceso Restringido
             </div>
             <div className='flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-bold uppercase tracking-widest'>
               <Database size={12} /> Gestión de Whitelist
             </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Formulario de Adición y Controles */}
        <div className='col-span-1 space-y-6'>
          <div className='bg-white rounded-2xl border border-slate-100 p-6 shadow-sm'>
            <h2 className='text-lg font-serif font-bold text-primary mb-4 flex items-center gap-2'>
              <Plus className="w-5 h-5 text-emerald-500" />
              Añadir a Whitelist
            </h2>

            <form onSubmit={handleAddAsset} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ticker (ej. SPCX, AAPL)</label>
                <input 
                  type="text" 
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value)}
                  placeholder="TICKER..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Activo</label>
                <select 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm text-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                >
                  <option value="stock">Acción (Stock)</option>
                  <option value="etf">ETF</option>
                </select>
              </div>

              {addError && <div className="text-rose-500 text-xs font-medium">{addError}</div>}
              {addSuccess && <div className="text-emerald-500 text-xs font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Añadido a la base de datos</div>}

              <button 
                type="submit" 
                disabled={adding || !newTicker}
                className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
              >
                {adding ? 'Añadiendo...' : 'Guardar Activo'}
              </button>
            </form>
          </div>

          <div className='bg-white rounded-2xl border border-slate-100 p-6 shadow-sm'>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Mantenimiento del Sistema</h3>
            <button 
              onClick={handleRunJobs}
              className="w-full bg-slate-100 hover:bg-slate-200 text-primary text-[10px] font-bold uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Forzar Sincronización
            </button>
            <p className="text-[9px] text-slate-400 mt-3 text-center leading-relaxed">
              Al añadir un ticker, usa este botón para iniciar la descarga del historial.
            </p>
          </div>
        </div>

        {/* Tabla de Whitelist */}
        <div className='col-span-1 lg:col-span-2'>
          <div className='bg-white rounded-2xl border border-slate-100 flex flex-col h-full shadow-sm overflow-hidden'>
            <div className='p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50'>
              <h2 className='text-lg font-serif font-bold text-primary'>Activos Monitoreados <span className="text-slate-400 text-sm font-sans font-normal ml-1">({assets.length})</span></h2>
              <div className='relative w-full sm:w-64'>
                <Search className='w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2' />
                <input 
                  type="text" 
                  placeholder="Buscar ticker..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className='w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all'
                />
              </div>
            </div>
            
            <div className='flex-1 overflow-x-auto'>
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className='w-8 h-8 border-2 border-slate-200 border-t-primary rounded-full animate-spin' />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargando whitelist...</span>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-3 px-6">
                  <ShieldAlert className="w-10 h-10 text-rose-400" />
                  <p className="text-xs font-bold text-rose-500 text-center">Error al cargar la whitelist</p>
                  <p className="text-[10px] text-slate-400 text-center font-mono bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">{fetchError}</p>
                  <button onClick={fetchAssets} className="text-[10px] font-bold uppercase tracking-widest text-primary border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">Reintentar</button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="py-4 px-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ticker</th>
                      <th className="py-4 px-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nombre</th>
                      <th className="py-4 px-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="py-4 px-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedAssets.length > 0 ? paginatedAssets.map(asset => (
                      <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 text-sm font-bold text-primary font-mono">{asset.ticker}</td>
                        <td className="py-4 px-6 text-sm text-slate-600 truncate max-w-[200px]">{asset.name}</td>
                        <td className="py-4 px-6 text-[10px] text-slate-500 font-bold tracking-widest uppercase">{asset.type}</td>
                        <td className="py-4 px-6 text-right">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded text-[9px] font-bold uppercase tracking-widest",
                            asset.active ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                          )}>
                            {asset.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-xs text-slate-400 font-medium">No se encontraron activos</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {!loading && filteredAssets.length > 0 && (
              <div className='p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between'>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className='px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all'
                >
                  Anterior
                </button>
                <div className='flex flex-col items-center gap-1'>
                  <span className='text-[10px] font-bold font-mono text-primary bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm'>
                    {currentPage} / {totalPages}
                  </span>
                  <p className='text-[8px] text-slate-400 font-bold uppercase tracking-wider text-center'>
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)} de {filteredAssets.length}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className='px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all'
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
