import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { authApi } from '../services/api';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 p-4">
        <p className="text-red-400 text-sm">Lien de réinitialisation invalide ou manquant.</p>
        <Link to="/forgot-password" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 8)  { setError('Le mot de passe doit contenir au moins 8 caractères'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <Icon name="developer_board" size={30} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">SmartHome</h1>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-card p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-5">
              <Icon name="check_circle" size={52} className="text-emerald-400 mx-auto" />
              <div>
                <h2 className="text-lg font-semibold text-slate-100 mb-1">Mot de passe mis à jour</h2>
                <p className="text-sm text-slate-400">
                  Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
              </div>
              <Link to="/login"
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold
                  py-3 rounded-xl transition-colors text-sm text-center">
                Se connecter
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Réinitialiser le mot de passe</h2>
              <p className="text-sm text-slate-500 mb-6">Choisissez un nouveau mot de passe pour votre compte.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Nouveau mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required minLength={8}
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

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmer le mot de passe</label>
                  <input
                    type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-100
                      placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1
                      focus:ring-blue-500/50 transition-colors"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold
                    py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enregistrement…</>
                    : <><Icon name="key" size={15} />Mettre à jour</>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
