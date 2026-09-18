import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Clock,
  Lock,
  Building,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { getAdminAuthHeaders } from '../../lib/auth.ts';

export const GeneralSettings: React.FC = () => {
  const [institutionName, setInstitutionName] = useState('Fakultas Sains dan Teknologi');
  const [defaultDuration, setDefaultDuration] = useState('60');
  const [autosaveInterval, setAutosaveInterval] = useState('10');
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [fullscreenRequired, setFullscreenRequired] = useState(true);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    // Load existing settings from /api/settings
    fetch('/api/settings')
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' && Array.isArray(r.data)) {
          const inst = r.data.find((s: any) => s.Setting_Key === 'INSTITUTION_NAME');
          if (inst) setInstitutionName(inst.Setting_Value);
          const dur = r.data.find((s: any) => s.Setting_Key === 'DEFAULT_EXAM_DURATION');
          if (dur) setDefaultDuration(dur.Setting_Value);
          const auto = r.data.find((s: any) => s.Setting_Key === 'AUTOSAVE_INTERVAL');
          if (auto) setAutosaveInterval(auto.Setting_Value);
          const ac = r.data.find((s: any) => s.Setting_Key === 'ANTI_CHEAT_ENABLED');
          if (ac) setAntiCheatEnabled(ac.Setting_Value === 'true');
        }
      })
      .catch(console.error);
  }, []);

  const handleSaveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess('');

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { Setting_Key: 'INSTITUTION_NAME', Setting_Value: institutionName, Description: 'Nama Institusi Kampus' },
            { Setting_Key: 'DEFAULT_EXAM_DURATION', Setting_Value: defaultDuration, Description: 'Durasi Default Ujian (Menit)' },
            { Setting_Key: 'AUTOSAVE_INTERVAL', Setting_Value: autosaveInterval, Description: 'Interval Autosave (Detik)' },
            { Setting_Key: 'ANTI_CHEAT_ENABLED', Setting_Value: String(antiCheatEnabled), Description: 'Anti-cheat Aktif' }
          ]
        })
      });
      setSettingsSuccess('Pengaturan sistem ujian berhasil disimpan.');
      setTimeout(() => setSettingsSuccess(''), 3000);
    } catch (err: any) {
      alert('Gagal menyimpan pengaturan: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('Password baru minimal 4 karakter.');
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch('/api/admin/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders()
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setPasswordSuccess('Password Dosen / Admin berhasil diperbarui.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 4000);
      } else {
        setPasswordError(data.message || 'Gagal mengubah password.');
      }
    } catch (err: any) {
      setPasswordError('Error: ' + err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pengaturan Aplikasi</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Kelola konfigurasi institusi, parameter ujian, kebijakan anti-cheat, dan keamanan akun dosen.
        </p>
      </div>

      {/* Section 1: Konfigurasi Ujian & Institusi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Identitas & Parameter Ujian</h2>
              <span className="text-[11px] text-slate-500">Konfigurasi nama institusi dan waktu sistem</span>
            </div>
          </div>
          {settingsSuccess && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {settingsSuccess}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveGeneralSettings} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Institusi / Fakultas / Jurusan
            </label>
            <input
              type="text"
              required
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-hidden"
              placeholder="Contoh: Fakultas Sains dan Teknologi"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ditampilkan pada kop lembar ujian mahasiswa dan laporan hasil.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Durasi Standar Sesi Ujian (Menit)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                required
                value={defaultDuration}
                onChange={e => setDefaultDuration(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:border-sky-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Interval Autosave Jawaban (Detik)
              </label>
              <input
                type="number"
                min={3}
                max={60}
                required
                value={autosaveInterval}
                onChange={e => setAutosaveInterval(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:border-sky-500 outline-hidden"
              />
            </div>
          </div>

          {/* Anti-cheat toggles */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Kebijakan Anti-Cheat & Keamanan Ujian
            </h3>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <strong className="text-xs text-slate-800 block">Deteksi Perpindahan Tab / Window Blur</strong>
                <span className="text-[11px] text-slate-500">
                  Mencatat log pelanggaran dan membunyikan alarm jika mahasiswa keluar dari jendela ujian.
                </span>
              </div>
              <input
                type="checkbox"
                checked={antiCheatEnabled}
                onChange={e => setAntiCheatEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-sky-800 focus:ring-sky-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <strong className="text-xs text-slate-800 block">Mode Layar Penuh (Fullscreen) Wajib</strong>
                <span className="text-[11px] text-slate-500">
                  Mencegah peserta membuka aplikasi lain saat pengerjaan berlangsung.
                </span>
              </div>
              <input
                type="checkbox"
                checked={fullscreenRequired}
                onChange={e => setFullscreenRequired(e.target.checked)}
                className="w-4 h-4 rounded text-sky-800 focus:ring-sky-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Keamanan Akun Dosen / Admin */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Keamanan Akun Dosen / Admin</h2>
              <span className="text-[11px] text-slate-500">Perbarui password masuk dashboard pengawas ujian</span>
            </div>
          </div>
          {passwordSuccess && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {passwordSuccess}
            </span>
          )}
        </div>

        <form onSubmit={handleUpdatePassword} className="p-5 space-y-4">
          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password / PIN Saat Ini
            </label>
            <div className="relative max-w-sm">
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password saat ini (default: 123456)"
                className="w-full px-3 pr-9 py-2 border border-slate-300 rounded-lg text-xs focus:border-emerald-500 outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password Baru
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ulangi Password Baru
              </label>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-emerald-500 outline-hidden"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'Memperbarui...' : 'Perbarui Password Dosen'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
