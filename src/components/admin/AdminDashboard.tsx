import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  FileQuestion,
  PlayCircle,
  Users,
  PenTool,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Eye,
  Calendar
} from 'lucide-react';

interface DashboardStats {
  activeCoursesCount: number;
  activeQuestionsCount: number;
  openRunsCount: number;
  inProgressStudentsCount: number;
  pendingEssaysCount: number;
  activeViolationsCount: number;
  openRuns: Array<{
    Run_ID: string;
    Run_Name: string;
    Class_Name: string;
    Access_Code: string;
    Status: string;
    Start_At: string;
  }>;
}

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch('/api/dashboard-stats')
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          setStats(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Mata Kuliah Aktif',
      value: stats?.activeCoursesCount ?? 0,
      icon: BookOpen,
      color: 'text-sky-700 bg-sky-50 border-sky-200',
      actionTab: 'courses',
      actionLabel: 'Kelola MK'
    },
    {
      title: 'Butir Soal Aktif',
      value: stats?.activeQuestionsCount ?? 0,
      icon: FileQuestion,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      actionTab: 'questions',
      actionLabel: 'Bank Soal'
    },
    {
      title: 'Sesi Ujian Terbuka',
      value: stats?.openRunsCount ?? 0,
      icon: PlayCircle,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      actionTab: 'exams',
      actionLabel: 'Sesi Ujian'
    },
    {
      title: 'Mahasiswa Sedang Ujian',
      value: stats?.inProgressStudentsCount ?? 0,
      icon: Users,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      actionTab: 'monitoring',
      actionLabel: 'Pantau Live'
    },
    {
      title: 'Essay Menunggu Dinilai',
      value: stats?.pendingEssaysCount ?? 0,
      icon: PenTool,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
      actionTab: 'grading',
      actionLabel: 'Beri Nilai'
    },
    {
      title: 'Alarm Pelanggaran Aktif',
      value: stats?.activeViolationsCount ?? 0,
      icon: AlertTriangle,
      color: (stats?.activeViolationsCount ?? 0) > 0 ? 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse' : 'text-slate-700 bg-slate-50 border-slate-200',
      actionTab: 'monitoring',
      actionLabel: 'Cek Pelanggaran'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard Ringkasan Ujian</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ringkasan status pelaksanaan ujian online, mata kuliah, bank soal, dan aktivitas peserta.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan
          </button>
          <button
            onClick={() => onNavigate('exams')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Buat Sesi Ujian Baru
          </button>
        </div>
      </div>

      {/* 6 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-xl border bg-white shadow-xs flex flex-col justify-between transition hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {card.title}
                  </span>
                  <div className="text-3xl font-bold text-slate-800 mt-2 font-mono">
                    {loading ? '...' : card.value}
                  </div>
                </div>
                <div className={`p-3 rounded-xl border ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <button
                onClick={() => onNavigate(card.actionTab)}
                className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-800 hover:text-sky-950 transition cursor-pointer"
              >
                <span>{card.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Exam Runs Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-slate-800">Sesi Ujian yang Sedang Dibuka (OPEN)</h3>
          </div>
          <button
            onClick={() => onNavigate('exams')}
            className="text-xs text-sky-800 hover:underline font-semibold"
          >
            Lihat Semua Sesi &rarr;
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Memuat data sesi...</div>
        ) : stats?.openRuns && stats.openRuns.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {stats.openRuns.map(run => (
              <div
                key={run.Run_ID}
                className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{run.Run_Name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      OPEN
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Kelas: <strong>{run.Class_Name}</strong></span>
                    <span>•</span>
                    <span>Kode Akses: <strong className="font-mono text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">{run.Access_Code}</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('monitoring')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Monitoring Live
                  </button>
                  <button
                    onClick={() => onNavigate('results')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition cursor-pointer"
                  >
                    Rekap Hasil
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">Saat ini tidak ada sesi ujian yang berstatus OPEN.</p>
            <button
              onClick={() => onNavigate('exams')}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition cursor-pointer"
            >
              Buka Sesi Ujian di Menu Ujian
            </button>
          </div>
        )}
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('questions')}
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition cursor-pointer flex items-center gap-4"
        >
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
            <FileQuestion className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-800">Manajemen Bank Soal</div>
            <div className="text-xs text-slate-500">Tambah soal PG/Essay & buat versi revisi</div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('grading')}
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition cursor-pointer flex items-center gap-4"
        >
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-800">Koreksi Manual Essay</div>
            <div className="text-xs text-slate-500">Beri nilai dengan rubrik & feedback dosen</div>
          </div>
        </div>

        <div
          onClick={() => onNavigate('results')}
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition cursor-pointer flex items-center gap-4"
        >
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-sm text-slate-800">Ekspor Nilai & Reset</div>
            <div className="text-xs text-slate-500">Unduh XLSX 4 sheet & reset respons aman</div>
          </div>
        </div>
      </div>
    </div>
  );
};
