import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldAlert, CheckCircle2, MailCheck } from 'lucide-react';
import { motion } from 'motion/react';
import brandLogo from '@/assets/cifra-logo-white.webp';

export const LoginPage: React.FC = () => {
  const { login, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);

  const validateEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic Validations
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (activeTab === 'register' && password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      if (activeTab === 'login') {
        await login(email, password);
      } else {
        await signUp(email, password);
        setPassword('');
        setConfirmPassword('');
        setEmailConfirmationSent(true);
      }
    } catch (err: any) {
      console.error('[Auth Error]', err);
      // Clean and translate error messages
      const msg = err.message || err.error_description || 'Ocurrió un error inesperado.';
      if (msg.includes('Invalid login credentials') || msg.includes('credentials')) {
        setError('Credenciales inválidas. Verifica tu correo y contraseña.');
      } else if (msg.includes('User already registered') || msg.includes('already exists')) {
        setError('El correo electrónico ya está registrado.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailConfirmationSent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-slate-500/5 blur-[120px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-900/5 overflow-hidden z-10 p-10 flex flex-col items-center text-center gap-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Revisá tu correo</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Enviamos un enlace de confirmación a{' '}
              <span className="font-semibold text-slate-700">{email}</span>.
            </p>
            <p className="text-sm text-slate-400 mt-3">
              Hacé click en el enlace del correo para activar tu cuenta. Si no lo ves, revisá tu carpeta de spam.
            </p>
          </div>
          <button
            onClick={() => {
              setEmailConfirmationSent(false);
              setActiveTab('login');
              setEmail('');
            }}
            className="w-full py-3 bg-primary hover:bg-slate-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-lg shadow-primary/10 cursor-pointer"
          >
            Ir a Iniciar Sesión
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 p-4 relative overflow-hidden">
      {/* Decorative background grid and shapes */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />
      
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-slate-500/5 blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-900/5 overflow-hidden z-10 glass-effect"
      >
        {/* Logo and Brand Header */}
        <div className="p-8 pb-4 text-center flex flex-col items-center">
          <div className="h-20 flex items-center justify-center overflow-hidden mb-2">
            <img
              src={brandLogo}
              alt="Cifra Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">
            Terminal de Inteligencia Financiera
          </p>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Bienvenido a Cifra
          </h2>
        </div>

        {/* Tab Selection */}
        <div className="px-8 flex border-b border-slate-100">
          <button
            onClick={() => {
              setActiveTab('login');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider relative transition-colors ${
              activeTab === 'login' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Ingresar
            {activeTab === 'login' && (
              <motion.div
                layoutId="auth-tab-bar"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('register');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider relative transition-colors ${
              activeTab === 'register' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Registrarse
            {activeTab === 'register' && (
              <motion.div
                layoutId="auth-tab-bar"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        </div>

        {/* Form area */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {/* Alerts */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-xs font-medium text-red-600"
            >
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-xs font-medium text-emerald-600"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@cifra.co"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only for register) */}
          {activeTab === 'register' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-1.5 overflow-hidden"
            >
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200/80 rounded-xl text-sm outline-none transition-all placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 font-medium text-slate-800"
                />
              </div>
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-primary hover:bg-slate-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : (
              <span>{activeTab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
            )}
          </button>
        </form>

        {/* Footer legal/disclaimer */}
        <div className="px-8 pb-8 pt-2 text-center text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
          Grado Institucional • Conexión Cifrada
        </div>
      </motion.div>
    </div>
  );
};
