import React, { useState, useEffect } from 'react';
import { GraduationCap, Key, User, BookOpen, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import type { ExamRunItem } from '../../types/index.ts';

interface StudentLoginProps {
  onExamStarted: (data: { attempt: any; exam: any; student: any; questions: any[] }) => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({ onExamStarted }) => {
  const [nim, setNim] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('Kelas A');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeRuns, setActiveRuns] = useState<ExamRunItem[]>([]);

  useEffect(() => {
    // Fetch active runs so students or testers can easily see available access codes
    fetch('/api/runs')
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success') {
          const openRuns = r.data.filter((x: any) => x.Status === 'OPEN');
          setActiveRuns(openRuns);
          if (openRuns.length > 0 && !accessCode) {
            setAccessCode(openRuns[0].Access_Code);
            setClassName(openRuns[0].Class_Name || 'Kelas A');
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nim || !fullName || !accessCode) {
      setErrorMsg('Semua kolom wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    fetch('/api/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        NIM: nim.trim(),
        Full_Name: fullName.trim(),
        Class_Name: className.trim(),
        Access_Code: accessCode.trim().toUpperCase()
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          if (res.data?.token) {
            sessionStorage.setItem('student_token', res.data.token);
            localStorage.setItem('student_token', res.data.token);
          }
          onExamStarted(res.data);
        } else {
          setErrorMsg(res.message || 'Gagal login mahasiswa ke Google Sheets.');
        }
      })
      .catch(err => {
        setErrorMsg('Terjadi kesalahan jaringan: ' + err.message);
      })
      .finally(() => setLoading(false));
  };

  // Quick fill sample for testers
  const fillSample = (sampleNim: string, sampleName: string, code: string, cName: string) => {
    setNim(sampleNim);
    setFullName(sampleName);
    setAccessCode(code);
    setClassName(cName);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-sky-50 text-sky-800 rounded-2xl flex items-center justify-center mx-auto border border-sky-200 shadow-xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Portal Masuk Ujian Mahasiswa</h1>
          <p className="text-xs text-slate-500">
            Silakan masukkan identitas mahasiswa dan Kode Akses sesi ujian yang diberikan oleh dosen/pengawas.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleStartExam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Induk Mahasiswa (NIM)</label>
            <div className="relative">
              <input
                type="text"
                required
                value={nim}
                onChange={e => setNim(e.target.value)}
                placeholder="misal: 23030244001"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:border-sky-700 focus:ring-1 focus:ring-sky-700 outline-hidden"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Mahasiswa</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="misal: Ahmad Fauzi Pratama"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-sky-700 focus:ring-1 focus:ring-sky-700 outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas / Rombel</label>
              <input
                type="text"
                required
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="Kelas A"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:border-sky-700 focus:ring-1 focus:ring-sky-700 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Akses Ujian</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="BIOKIM2026"
                  className="w-full pl-8 pr-2.5 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:border-sky-700 focus:ring-1 focus:ring-sky-700 outline-hidden"
                />
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <button
            id="btn-student-login"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-sky-800 hover:bg-sky-900 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Memverifikasi Token & Memuat Soal...</span>
            ) : (
              <>
                <span>MASUK / Mulai Kerjakan Ujian</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Sample Presets */}
        {activeRuns.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Sesi Ujian Aktif Tersedia (Klik Cepat):
            </span>
            <div className="space-y-1.5">
              {activeRuns.map(r => (
                <button
                  key={r.Run_ID}
                  type="button"
                  onClick={() => fillSample('TEST001', 'Miftah', r.Access_Code, r.Class_Name || 'A')}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50/60 hover:border-sky-300 text-xs flex items-center justify-between transition cursor-pointer"
                >
                  <div>
                    <strong className="text-slate-800 block">{r.Run_Name}</strong>
                    <span className="text-slate-500 text-[11px]">{r.Class_Name}</span>
                  </div>
                  <span className="font-mono font-bold text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded text-[11px]">
                    {r.Access_Code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Ujian Terkunci Anti-Cheat & Autosave Realtime</span>
        </div>
      </div>
    </div>
  );
};
