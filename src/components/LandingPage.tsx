import React from 'react';
import {
  GraduationCap,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  BookOpen,
  Lock,
  Clock,
  Laptop
} from 'lucide-react';

interface LandingPageProps {
  onSelectStudent: () => void;
  onSelectAdmin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectStudent, onSelectAdmin }) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-900/40">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-white text-base leading-none tracking-tight block">
                CBT MAHASISWA
              </span>
              <span className="text-[11px] font-medium text-slate-400 block mt-1">
                Portal Pelaksanaan Ujian Online Kampus
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Sistem Aktif & Siap
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-4xl w-full text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-800 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Computer Based Testing System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            CBT MAHASISWA
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Ujian Online Mahasiswa yang Terstandar, Aman, dan Real-time.
            Silakan pilih jalur akses di bawah sesuai peran Anda.
          </p>
        </div>

        {/* Two Main Cards: Student Exam & Lecturer/Admin Login */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Card 1: Masuk Ujian Mahasiswa */}
          <div className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/80 rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-sky-950/50">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <Laptop className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
                  Area Peserta Ujian
                </span>
                <h2 className="text-2xl font-bold text-white group-hover:text-sky-300 transition-colors">
                  Masuk Ujian Mahasiswa
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Khusus mahasiswa yang akan menempuh sesi ujian aktif.
                  Siapkan <strong>Nama</strong>, <strong>NIM</strong>, dan <strong>Kode Akses Sesi Ujian</strong> yang diberikan oleh dosen pengampu.
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <span>Pengerjaan Soal PG & Essay Terintegrasi</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  <span>Autosave Otomatis & Proteksi Anti-Curang</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700/60">
              <button
                id="btn-enter-student"
                onClick={onSelectStudent}
                className="w-full py-3.5 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition shadow-lg shadow-sky-900/30 cursor-pointer"
              >
                <span>MASUK UJIAN MAHASISWA</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Login Dosen / Admin */}
          <div className="group relative bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/80 rounded-2xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-emerald-950/50">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Area Dosen & Pengawas
                </span>
                <h2 className="text-2xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Login Dosen / Admin
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Akses terotentikasi untuk Dosen Pengampu dan Pengawas Ujian.
                  Kelola mata kuliah, bank soal, sesi ujian, live monitoring, dan penilaian essay.
                </p>
              </div>

              <div className="pt-2 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Monitoring Realtime Peserta & Alarm Pelanggaran</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Penilaian Essay & Rekap Hasil Ujian</span>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700/60">
              <button
                id="btn-enter-admin"
                onClick={onSelectAdmin}
                className="w-full py-3.5 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white hover:text-emerald-300 font-bold text-sm border border-slate-600 hover:border-emerald-500/60 flex items-center justify-center gap-2.5 transition cursor-pointer"
              >
                <span>LOGIN DOSEN / ADMIN</span>
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Feature badges footer */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Anti-Cheat Fullscreen & Tab Tracking</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Sinkronisasi Jawaban Otomatis</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Verifikasi Kode Akses Sesi Ujian</span>
          </div>
        </div>
      </main>

      {/* Simplified Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400">
        <p>Aplikasi Ujian Online Mahasiswa (CBT) • Hak Cipta Dilindungi</p>
      </footer>
    </div>
  );
};
