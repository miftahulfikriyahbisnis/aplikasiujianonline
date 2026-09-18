import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap
} from 'lucide-react';
import { setAdminSession } from '../../lib/auth.ts';

interface AdminLoginProps {
  onLoginSuccess: (adminData: any) => void;
  onBackToLanding: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onBackToLanding }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username/Email dan Password wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (res.ok && data.status === 'success' && data.data?.token) {
        setAdminSession(data.data.token, {
          username: data.data.username || username.trim(),
          name: data.data.name || 'Dosen / Admin Ujian',
          email: data.data.email || 'dosen@kampus.ac.id',
          role: 'ADMIN'
        });
        onLoginSuccess(data.data);
      } else {
        setErrorMsg(data.message || 'Login gagal. Periksa username dan password Anda.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8 selection:bg-emerald-500 selection:text-white">
      {/* Back button */}
      <div className="max-w-md w-full mb-4">
        <button
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Halaman Utama</span>
        </button>
      </div>

      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/90 rounded-2xl p-7 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Login Dosen / Admin</h1>
          <p className="text-xs text-slate-400">
            Masukkan akun kredensial Anda untuk mengakses panel administrasi ujian CBT.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username atau Email Dosen
            </label>
            <div className="relative">
              <input
                id="input-admin-username"
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="misal: admin atau dosen@kampus.ac.id"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password / PIN
              </label>
            </div>
            <div className="relative">
              <input
                id="input-admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                className="w-full pl-9 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-admin-submit-login"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40 cursor-pointer mt-2"
          >
            {loading ? (
              <span>Memverifikasi Sesi Server...</span>
            ) : (
              <>
                <span>MASUK PANEL DOSEN</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Default Credential helper for test evaluation */}
        <div className="pt-3 border-t border-slate-700/60 text-center">
          <p className="text-[11px] text-slate-500">
            Akun Default: <code className="text-emerald-400 font-mono">admin</code> / Password:{' '}
            <code className="text-emerald-400 font-mono">123456</code>
          </p>
        </div>
      </div>
    </div>
  );
};
