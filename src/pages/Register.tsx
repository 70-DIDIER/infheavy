import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { authApi } from '../services/api';

export function Register() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const sentTo = email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.register(name, email, password);
      setDone(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl mb-4">
              <Icon name="mark_email_read" size={28} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Compte créé !</h1>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-card p-8 shadow-2xl space-y-5">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">
              <p className="text-emerald-400 text-sm font-semibold mb-1">Vérifiez votre email</p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Un lien de confirmation a été envoyé à{' '}
                <span className="text-slate-200 font-medium">{sentTo}</span>.
                Cliquez sur ce lien pour activer votre compte avant de vous connecter.
              </p>
            </div>
            <p className="text-xs text-slate-500 text-center">
              Votre clé API est disponible dans les <strong className="text-slate-400">Paramètres</strong> après connexion.
            </p>
            <Link to="/login"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold
                py-3 rounded-xl transition-colors text-sm">
              Aller à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <Icon name="developer_board" size={30} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-slate-100">SmartHome</h1>
          <p className="text-slate-500 mt-1 text-sm">Créer un compte administrateur</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-card p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Inscription</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Nom complet</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Jean Dupont" required
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-100
                  placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1
                  focus:ring-blue-500/50 transition-colors"
              />
            </div>

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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mot de passe (min. 8 caractères)</label>
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
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm">
                <span>⚠️</span> <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-semibold
                py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Création…</>
                : <><Icon name="person_add" size={16} />Créer mon compte</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
