import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { authApi } from '../services/api';

export function ForgotPassword() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Une erreur s\'est produite. Veuillez réessayer.');
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
          {sent ? (
            <div className="text-center space-y-5">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 border border-blue-500/25 rounded-2xl">
                <Icon name="mail" size={26} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100 mb-1">Vérifiez votre messagerie</h2>
                <p className="text-sm text-slate-400">
                  Si un compte est associé à <span className="text-slate-200">{email}</span>,
                  vous recevrez un lien de réinitialisation dans quelques instants.
                </p>
              </div>
              <Link to="/login"
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white text-center font-semibold
                  py-3 rounded-xl transition-colors text-sm">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">Mot de passe oublié</h2>
              <p className="text-sm text-slate-500 mb-6">
                Saisissez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

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
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi…</>
                    : <><Icon name="mail" size={15} />Envoyer le lien</>
                  }
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  <Icon name="arrow_back" size={12} />
                  Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
