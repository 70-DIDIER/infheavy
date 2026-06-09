import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon }    from '../components/ui/Icon';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [error,      setError]      = useState('');
  const [unverified, setUnverified] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setUnverified(false); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Identifiants incorrects';
      if (msg.toLowerCase().includes('vérifier votre email') || msg.toLowerCase().includes('verify')) {
        setUnverified(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <Icon name="developer_board" size={30} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">SmartHome</h1>
          <p className="text-slate-500 mt-1 text-sm">Système de domotique IoT · ESP32</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-card p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Connexion au tableau de bord</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Adresse e-mail</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="jean@exemple.com" required
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-100
                  placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1
                  focus:ring-blue-500/50 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">Mot de passe</label>
                <Link to="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 pr-11 text-slate-100
                    placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1
                    focus:ring-blue-500/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  <Icon name={showPwd ? 'visibility_off' : 'visibility'} size={17} />
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
                <span>⚠️</span> <span>{error}</span>
              </div>
            )}

            {unverified && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                  <Icon name="mail" size={15} />
                  Email non vérifié
                </div>
                <p className="text-amber-300/70 text-xs">
                  Vérifiez votre boîte mail et cliquez sur le lien de confirmation avant de vous connecter.
                </p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold
                py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion…</>
                : <><Icon name="login" size={16} />Se connecter</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
