import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { authApi } from '../services/api';

export function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status,  setStatus]  = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) { setStatus('error'); setMessage('Token manquant.'); return; }
    authApi.verifyEmail(token)
      .then(res => {
        setStatus('success');
        setMessage(res.data.message ?? 'Email vérifié avec succès.');
      })
      .catch(err => {
        setStatus('error');
        setMessage(
          err.response?.data?.error ?? err.response?.data?.message ?? 'Lien invalide ou expiré.'
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl mb-8">
          <Icon name="developer_board" size={30} className="text-blue-400" />
        </div>

        {status === 'loading' && (
          <div className="bg-slate-800 border border-slate-700 rounded-card p-10 space-y-4">
            <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm">Vérification en cours…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-slate-800 border border-slate-700 rounded-card p-10 space-y-5">
            <Icon name="check_circle" size={52} className="text-emerald-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Email vérifié !</h2>
              <p className="text-slate-400 text-sm">{message}</p>
            </div>
            <Link to="/login"
              className="block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold
                py-3 rounded-xl transition-colors text-sm">
              Se connecter
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-slate-800 border border-slate-700 rounded-card p-10 space-y-5">
            <Icon name="cancel" size={52} className="text-red-400 mx-auto" />
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Échec de vérification</h2>
              <p className="text-slate-400 text-sm">{message}</p>
            </div>
            <Link to="/login"
              className="block w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold
                py-3 rounded-xl transition-colors text-sm">
              Retour à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
