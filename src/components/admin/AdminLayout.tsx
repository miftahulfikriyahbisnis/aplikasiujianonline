import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  PlayCircle,
  Activity,
  PenTool,
  FileSpreadsheet,
  ShieldAlert,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ChevronRight,
  ExternalLink,
  Clock
} from 'lucide-react';
import { AdminDashboard } from './AdminDashboard.tsx';
import { CoursesManagement } from './CoursesManagement.tsx';
import { QuestionBankManagement } from './QuestionBankManagement.tsx';
import { ExamManagement } from './ExamManagement.tsx';
import { ExamMonitoring } from './ExamMonitoring.tsx';
import { EssayGrading } from './EssayGrading.tsx';
import { ExamResults } from './ExamResults.tsx';
import { ViolationsManagement } from './ViolationsManagement.tsx';
import { ParticipantsManagement } from './ParticipantsManagement.tsx';
import { GeneralSettings } from './GeneralSettings.tsx';
import { clearAdminSession } from '../../lib/auth.ts';

export type AdminTab =
  | 'dashboard'
  | 'courses'
  | 'questions'
  | 'exams'
  | 'monitoring'
  | 'grading'
  | 'results'
  | 'violations'
  | 'participants'
  | 'settings';

interface AdminLayoutProps {
  adminUser?: any;
  onLogout: () => void;
  onSwitchToStudentPortal: () => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  description: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Ringkasan & statistik ujian',
    icon: LayoutDashboard
  },
  {
    id: 'courses',
    label: 'Mata Kuliah & Topik',
    description: 'Manajemen kurikulum & topik',
    icon: BookOpen
  },
  {
    id: 'questions',
    label: 'Bank Soal',
    description: 'Kelola butir soal & template',
    icon: FileQuestion
  },
  {
    id: 'exams',
    label: 'Ujian & Sesi',
    description: 'Sesi ujian & kode akses',
    icon: PlayCircle
  },
  {
    id: 'monitoring',
    label: 'Monitor Ujian',
    description: 'Status peserta real-time',
    icon: Activity
  },
  {
    id: 'grading',
    label: 'Penilaian Essay',
    description: 'Koreksi & input nilai essay',
    icon: PenTool
  },
  {
    id: 'results',
    label: 'Hasil Ujian',
    description: 'Rekap & unduh laporan Excel',
    icon: FileSpreadsheet
  },
  {
    id: 'violations',
    label: 'Pelanggaran',
    description: 'Log insiden anti-cheat',
    icon: ShieldAlert
  },
  {
    id: 'participants',
    label: 'Peserta',
    description: 'Daftar mahasiswa terdaftar',
    icon: Users
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    description: 'Parameter sistem aplikasi',
    icon: Settings
  }
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  adminUser,
  onLogout,
  onSwitchToStudentPortal
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    clearAdminSession();
    onLogout();
  };

  const currentNav = NAV_ITEMS.find(n => n.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm leading-tight block">CBT DOSEN</span>
            <span className="text-[10px] text-slate-400 block">{currentNav.label}</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay on Mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar (±240px, Sticky) */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-md shadow-sky-950">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight block leading-none">
              CBT DOSEN
            </span>
            <span className="text-[11px] font-medium text-slate-400 block mt-1">
              Panel Pengawas Ujian
            </span>
          </div>
        </div>

        {/* Navigation Items (1 to 10) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 custom-scrollbar">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition group cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-950/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile & Footer in Sidebar */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">
              D
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-white text-xs block truncate leading-tight">
                {adminUser?.name || 'Dosen / Pengawas'}
              </span>
              <span className="text-[10px] text-emerald-400 block truncate">
                Role: Administrator
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            id="btn-admin-logout"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-950/70 border border-rose-900/30 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi Dosen</span>
          </button>
        </div>
      </aside>

      {/* Main Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                <span>Panel CBT</span>
                <span>/</span>
                <span className="text-sky-800">{currentNav.label}</span>
              </div>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                {currentNav.label}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onSwitchToStudentPortal}
              title="Buka tampilan simulasi ruang ujian mahasiswa"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-sky-800 bg-slate-50 hover:bg-sky-50 border border-slate-300 hover:border-sky-300 rounded-lg transition cursor-pointer shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Portal Mahasiswa</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-white border border-slate-300 hover:border-rose-300 rounded-lg transition cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <AdminDashboard onNavigate={tab => setActiveTab(tab as AdminTab)} />
          )}
          {activeTab === 'courses' && <CoursesManagement />}
          {activeTab === 'questions' && <QuestionBankManagement />}
          {activeTab === 'exams' && <ExamManagement />}
          {activeTab === 'monitoring' && <ExamMonitoring />}
          {activeTab === 'grading' && <EssayGrading />}
          {activeTab === 'results' && <ExamResults />}
          {activeTab === 'violations' && <ViolationsManagement />}
          {activeTab === 'participants' && <ParticipantsManagement />}
          {activeTab === 'settings' && <GeneralSettings />}
        </main>
      </div>
    </div>
  );
};
