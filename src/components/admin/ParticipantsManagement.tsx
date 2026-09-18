import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { getAdminAuthHeaders } from '../../lib/auth.ts';

export const ParticipantsManagement: React.FC = () => {
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);

  const fetchParticipants = () => {
    setLoading(true);
    let url = '/api/participants?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (selectedClass && selectedClass !== 'ALL') url += `class=${encodeURIComponent(selectedClass)}&`;

    fetch(url, {
      headers: {
        ...getAdminAuthHeaders()
      }
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success') {
          setParticipants(r.data || []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchParticipants();
  }, [selectedClass]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchParticipants();
  };

  // Get unique classes for filter
  const classList = Array.from(new Set(participants.map(p => p.Class_Name).filter(Boolean)));

  const totalParticipants = participants.length;
  const activeExamTakers = participants.filter(p => p.Total_Attempts > 0).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Data Peserta Ujian</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Daftar mahasiswa terdaftar, riwayat partisipasi sesi ujian, dan rekapitulasi nilai.
          </p>
        </div>
        <button
          onClick={fetchParticipants}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Mahasiswa Terdaftar</span>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{totalParticipants}</div>
          </div>
          <div className="p-3 bg-sky-50 text-sky-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Mahasiswa Pernah Ujian</span>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">{activeExamTakers}</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Tingkat Partisipasi</span>
            <div className="text-2xl font-bold text-indigo-700 mt-0.5">
              {totalParticipants > 0 ? Math.round((activeExamTakers / totalParticipants) * 100) : 0}%
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari berdasarkan NIM, nama mahasiswa, atau email..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-semibold focus:border-sky-500 outline-hidden"
          >
            <option value="ALL">Semua Kelas</option>
            {classList.map(cls => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4 text-center">Jumlah Ujian</th>
                <th className="py-3 px-4">Ujian Terakhir Diikuti</th>
                <th className="py-3 px-4 text-center">Status Terakhir</th>
                <th className="py-3 px-4 text-center">Rata-rata Nilai</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Memuat data mahasiswa peserta...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada data mahasiswa yang ditemukan.
                  </td>
                </tr>
              ) : (
                participants.map(p => (
                  <tr key={p.User_ID} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      {p.NIM}
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block font-semibold">{p.Full_Name}</strong>
                      <span className="text-[11px] text-slate-400">{p.Email || '-'}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {p.Class_Name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {p.Total_Attempts}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-600">
                      {p.Last_Exam_Name}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {p.Last_Exam_Status === 'SUBMITTED' || p.Last_Exam_Status === 'GRADED' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          Selesai
                        </span>
                      ) : p.Last_Exam_Status === 'IN_PROGRESS' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[11px] animate-pulse">
                          Sedang Mengerjakan
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {p.Average_Score !== null ? (
                        <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono text-[11px]">
                          {p.Average_Score}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedStudent(p)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 transition cursor-pointer"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center font-bold">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedStudent.Full_Name}</h3>
                  <span className="text-xs font-mono text-slate-500">NIM: {selectedStudent.NIM}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Kelas:</span>
                <strong className="text-slate-800">{selectedStudent.Class_Name}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Email:</span>
                <span className="text-slate-800">{selectedStudent.Email || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Total Sesi Ujian Diikuti:</span>
                <strong className="text-slate-800">{selectedStudent.Total_Attempts} kali</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Ujian Terakhir:</span>
                <span className="text-slate-800">{selectedStudent.Last_Exam_Name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Status Ujian Terakhir:</span>
                <span className="font-semibold text-slate-800">{selectedStudent.Last_Exam_Status}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span>Rata-rata Nilai:</span>
                <strong className="text-sky-800 font-mono text-sm">{selectedStudent.Average_Score ?? 'Belum ada nilai'}</strong>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
