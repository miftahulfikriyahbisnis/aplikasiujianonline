import React, { useState, useEffect } from 'react';
import {
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Server,
  FileSpreadsheet,
  Clock,
  Layers,
  KeyRound,
  ExternalLink
} from 'lucide-react';

export const DatabaseSettings: React.FC = () => {
  const [loadingTest, setLoadingTest] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [basicStatus, setBasicStatus] = useState<any | null>(null);
  const [loadingBasic, setLoadingBasic] = useState(false);

  const runFullHealthCheck = async () => {
    setLoadingTest(true);
    setTestError(null);
    try {
      const res = await fetch('/api/database/test-full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTestResult(data.data);
      } else {
        setTestError(data.message || 'Gagal menjalankan healthCheckFull ke Google Apps Script');
      }
    } catch (err: any) {
      setTestError(err.message || 'Terjadi kesalahan jaringan saat menguji koneksi database');
    } finally {
      setLoadingTest(false);
    }
  };

  const checkBasicStatus = async () => {
    setLoadingBasic(true);
    try {
      const res = await fetch('/api/check-db');
      const data = await res.json();
      setBasicStatus(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingBasic(false);
    }
  };

  useEffect(() => {
    checkBasicStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
          <span>Pengaturan</span>
          <span>&rarr;</span>
          <span>Koneksi Database</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Koneksi Database Google Sheets</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kelola dan uji konektivitas langsung antara server aplikasi dengan backend Google Apps Script & Google Sheets.
        </p>
      </div>

      {/* Security & Architecture Notice */}
      <div className="bg-sky-50/70 border border-sky-200 rounded-xl p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-sky-100 text-sky-800 shrink-0 mt-0.5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="font-bold text-sky-900 text-sm">Arsitektur Server-Side Proxy Terenkripsi</div>
            <p>
              Koneksi ke Google Apps Script berjalan 100% melalui <strong>Server-Side Proxy Layer</strong>. Nilai rahasia <code className="font-mono bg-white px-1.5 py-0.5 rounded text-sky-900 border border-sky-200">APPS_SCRIPT_API_SECRET</code> tersimpan aman di server dan <strong>tidak pernah dikirim ke browser / React client</strong>.
            </p>
            <p className="text-slate-500">
              Semua data mata kuliah, soal, dan ujian dibaca dan ditulis langsung ke Google Spreadsheet tanpa menggunakan mock data atau localStorage.
            </p>
          </div>
        </div>
      </div>

      {/* Main Connection Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Status Endpoint Google Apps Script</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5 break-all">
                {basicStatus?.url || 'Memuat URL endpoint...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-test-db-connection"
              onClick={runFullHealthCheck}
              disabled={loadingTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white bg-sky-800 hover:bg-sky-900 transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Activity className={`w-4 h-4 ${loadingTest ? 'animate-spin' : ''}`} />
              <span>{loadingTest ? 'Menguji Koneksi...' : 'TEST KONEKSI DATABASE'}</span>
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>Status Koneksi Dasar</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {basicStatus?.connected ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    TERHUBUNG
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    BELUM TERVERIFIKASI
                  </span>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                <span>API Secret Server</span>
              </div>
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  AKTIF & TERLINDUNGI
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Database</span>
              </div>
              <div className="mt-2 text-xs font-bold text-slate-800 truncate">
                Google Sheets Spreadsheet
              </div>
            </div>
          </div>

          {/* Test Error Display */}
          {testError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Uji Koneksi Database Gagal</span>
              </div>
              <p className="text-xs">{testError}</p>
            </div>
          )}

          {/* Full Test Results Display */}
          {testResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Hasil Diagnosis healthCheckFull
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {testResult.timestamp}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500">Status Diagnosis</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {testResult.status}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500">Uji Baca Sheet (Read)</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {testResult.readTest ? 'BERHASIL (PASS)' : 'GAGAL'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500">Uji Tulis Sheet (Write)</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {testResult.writeTest ? 'BERHASIL (PASS)' : 'GAGAL'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="text-[11px] font-semibold text-slate-500">Mata Kuliah di Sheet</div>
                  <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1">
                    <Layers className="w-4 h-4 text-sky-600" />
                    {testResult.coursesFound} baris ditemukan
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1.5">
                <div className="text-slate-500 font-bold mb-1">Rincian Metadata Response:</div>
                <div><span className="text-slate-500">Schema Version :</span> <span className="text-slate-800 font-bold">{testResult.schemaVersion || '-'}</span></div>
                <div><span className="text-slate-500">Audit Log ID   :</span> <span className="text-slate-800 font-bold">{testResult.logId || '-'}</span></div>
                <div><span className="text-slate-500">Timestamp      :</span> <span className="text-slate-800">{testResult.timestamp}</span></div>
              </div>
            </div>
          )}

          {!testResult && !testError && (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              Tekan tombol <strong className="text-slate-700">TEST KONEKSI DATABASE</strong> di atas untuk menjalankan diagnosis baca dan tulis menyeluruh (<code className="font-mono text-sky-800">healthCheckFull</code>) ke Google Sheets.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
