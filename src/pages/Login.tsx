import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const demos = [
  { email: 'admin@smarthome.io', pass: 'admin123', role: 'ADMIN' },
  { email: 'user@smarthome.io',  pass: 'user123',  role: 'USER'  },
  { email: 'guest@smarthome.io', pass: 'guest123', role: 'GUEST' },
];

export function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <Cpu size={30} className="text-blue-400" />
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
                placeholder="admin@smarthome.io" required
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-slate-100
                  placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1
                  focus:ring-blue-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Mot de passe</label>
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
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
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
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion…</>
                : <><LogIn size={16} />Se connecter</>
              }
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-5 border-t border-slate-700">
            <p className="text-xs text-slate-500 mb-2.5">Comptes de démonstration :</p>
            <div className="space-y-1.5">
              {demos.map(({ email: e, pass, role }) => (
                <button key={role} type="button"
                  onClick={() => { setEmail(e); setPassword(pass); }}
                  className="w-full text-left text-xs bg-slate-700/50 hover:bg-slate-700 px-3 py-2 rounded-lg
                    transition-colors text-slate-400 flex items-center gap-2"
                >
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                    ${role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : role === 'USER' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-600 text-slate-400'}`}>
                    {role}
                  </span>
                  <span>{e}</span>
                  <span className="text-slate-600 ml-auto">{pass}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
