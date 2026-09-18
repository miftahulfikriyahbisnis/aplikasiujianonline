import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Key,
  User,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  ChevronLeft,
  AlertCircle,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ListOrdered
} from 'lucide-react';
import { StudentExamRoom } from './StudentExamRoom.tsx';
import type { ExamRunItem } from '../../types/index.ts';

interface StudentPortalProps {
  onBackToLanding: () => void;
}

type StudentStage = 'login' | 'instructions' | 'exam' | 'completed';

export const StudentPortal: React.FC<StudentPortalProps> = ({ onBackToLanding }) => {
  const [stage, setStage] = useState<StudentStage>('login');
  const [nim, setNim] = useState('');
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('Kelas A');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeRuns, setActiveRuns] = useState<ExamRunItem[]>([]);
  const [examSessionData, setExamSessionData] = useState<any | null>(null);

  useEffect(() => {
    // Fetch active runs so student can check available codes or auto-complete
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

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nim.trim() || !fullName.trim() || !accessCode.trim()) {
      setErrorMsg('Semua kolom identitas dan Kode Akses Ujian wajib diisi.');
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
        if (res.status === 'success' && res.data) {
          if (res.data.token) {
            sessionStorage.setItem('student_token', res.data.token);
            localStorage.setItem('student_token', res.data.token);
          }
          setExamSessionData(res.data);
          // Move to Instructions screen first
          setStage('instructions');
        } else {
          setErrorMsg(res.message || 'Kode Ujian tidak valid atau sesi belum dibuka oleh dosen.');
        }
      })
      .catch(err => {
        setErrorMsg('Terjadi kesalahan koneksi server: ' + err.message);
      })
      .finally(() => setLoading(false));
  };

  const handleStartExam = () => {
    setStage('exam');
  };

  const handleExamFinished = () => {
    setStage('completed');
  };

  const handleResetToPortal = () => {
    setStage('login');
    setExamSessionData(null);
    setNim('');
    setFullName('');
  };

  // 1. Stage: LOGIN FORM
  if (stage === 'login') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 selection:bg-sky-200">
        <div className="max-w-md w-full mb-3">
          <button
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Awal</span>
          </button>
        </div>

        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-7 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-sky-50 text-sky-800 rounded-2xl flex items-center justify-center mx-auto border border-sky-200 shadow-xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Portal Masuk Ujian Mahasiswa</h1>
            <p className="text-xs text-slate-500">
              Silakan lengkapi data identitas dan masukkan Kode Ujian (Password Sesi) dari pengawas.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Mahasiswa
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="misal: Ahmad Fauzi Pratama"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-sky-700 focus:ring-1 focus:ring-sky-700 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nomor Induk Mahasiswa (NIM)
              </label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Ujian / Password Sesi
                </label>
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
              id="btn-student-submit-login"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-sky-800 hover:bg-sky-900 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Memverifikasi Kode & Memuat Ujian...</span>
              ) : (
                <>
                  <span>MASUK UJIAN MAHASISWA</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Preset Selector for available sessions */}
          {activeRuns.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Sesi Ujian yang Sedang Dibuka Dosen:
              </span>
              <div className="space-y-1.5">
                {activeRuns.map(r => (
                  <button
                    key={r.Run_ID}
                    type="button"
                    onClick={() => {
                      setAccessCode(r.Access_Code);
                      setClassName(r.Class_Name || 'Kelas A');
                      if (!fullName) setFullName('Mahasiswa Ujian');
                      if (!nim) setNim('230101001');
                    }}
                    className="w-full text-left p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50/70 hover:border-sky-300 text-xs flex items-center justify-between transition cursor-pointer"
                  >
                    <div>
                      <strong className="text-slate-800 block font-semibold">{r.Run_Name}</strong>
                      <span className="text-slate-500 text-[11px]">Kelas: {r.Class_Name}</span>
                    </div>
                    <span className="font-mono font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded text-[11px]">
                      {r.Access_Code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistem Ujian Terkunci Anti-Cheat & Autosave Otomatis</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Stage: INSTRUKSI UJIAN
  if (stage === 'instructions' && examSessionData) {
    const { student, exam, run, questions } = examSessionData;
    const durationMinutes = run?.Duration_Minutes || exam?.Duration_Minutes || 60;

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden space-y-6">
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight tracking-tight">Instruksi & Tata Tertib Ujian</h1>
                <p className="text-xs text-slate-300 mt-0.5">Harap baca petunjuk berikut sebelum memulai</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">
              SIAP DIKERJAKAN
            </span>
          </div>

          <div className="px-6 space-y-5">
            {/* Student & Exam Info */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Nama Mahasiswa:</span>
                <strong className="text-slate-800 text-sm">{student?.Full_Name || fullName}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NIM / Kelas:</span>
                <strong className="text-slate-800 text-sm font-mono">{student?.NIM || nim} ({student?.Class_Name || className})</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Mata Kuliah / Ujian:</span>
                <strong className="text-slate-800">{exam?.Exam_Name || run?.Run_Name}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Durasi & Jumlah Soal:</span>
                <strong className="text-sky-800">{durationMinutes} Menit ({questions?.length || 0} Soal)</strong>
              </div>
            </div>

            {/* Rules list */}
            <div className="space-y-2.5 text-xs text-slate-700">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Ketentuan Pengerjaan Ujian CBT:
              </h3>
              <ul className="space-y-2 list-disc pl-4 leading-relaxed text-slate-600">
                <li>
                  Waktu ujian berjalan mundur otomatis sejak tombol <strong>Mulai Kerjakan Ujian</strong> ditekan.
                </li>
                <li>
                  <strong>Autosave:</strong> Seluruh pilihan jawaban ganda dan teks essay akan disimpan secara otomatis ke server.
                </li>
                <li>
                  <strong>Anti-Cheat:</strong> Sistem memantau perpindahan jendela/tab dan mode layar penuh (fullscreen). Meninggalkan ruang ujian akan dicatat sebagai pelanggaran dan dapat membunyikan alarm pengawas.
                </li>
                <li>
                  Jika terjadi kendala listrik atau perangkat mati, Anda dapat login kembali dengan NIM dan Kode Ujian yang sama selama waktu sesi masih tersisa.
                </li>
                <li>
                  Pastikan menekan tombol <strong>Kumpulkan / Selesai</strong> sebelum waktu habis.
                </li>
              </ul>
            </div>

            {/* Warning Box */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                Dengan menekan tombol di bawah, Anda menyatakan bersedia mengikuti ujian secara jujur dan mematuhi seluruh tata tertib yang berlaku.
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetToPortal}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              id="btn-start-exam-now"
              type="button"
              onClick={handleStartExam}
              className="flex-1 py-3 px-5 bg-sky-800 hover:bg-sky-900 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <span>MULAI KERJAKAN UJIAN SEKARANG</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Stage: RUANG UJIAN
  if (stage === 'exam' && examSessionData) {
    return (
      <StudentExamRoom
        examData={examSessionData}
        onExamFinished={handleExamFinished}
      />
    );
  }

  // 4. Stage: COMPLETED SCREEN
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-800">Ujian Telah Selesai</h1>
          <p className="text-xs text-slate-500">
            Jawaban Anda telah berhasil dikirim dan diarsipkan dengan aman ke server ujian.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-2.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Mahasiswa:</span>
            <strong className="text-slate-800">{examSessionData?.student?.Full_Name || fullName}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">NIM / Kelas:</span>
            <strong className="font-mono text-slate-800">{examSessionData?.student?.NIM || nim} ({className})</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Ujian:</span>
            <strong className="text-slate-800">{examSessionData?.exam?.Exam_Name || examSessionData?.run?.Run_Name}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status Pengiriman:</span>
            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
              TERKIRIM (SUBMITTED)
            </span>
          </div>
        </div>

        <button
          onClick={handleResetToPortal}
          className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
        >
          Kembali ke Portal Ujian
        </button>
      </div>
    </div>
  );
};
