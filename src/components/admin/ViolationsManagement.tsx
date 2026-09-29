import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  BellOff,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  Clock,
  User,
  ExternalLink
} from 'lucide-react';
import type { ExamRunItem } from '../../types/index.ts';
import { getAdminAuthHeaders } from '../../lib/auth.ts';

export const ViolationsManagement: React.FC = () => {
  const [violations, setViolations] = useState<any[]>([]);
  const [runs, setRuns] = useState<ExamRunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal note for resolve/mute
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'RESOLVE' | 'MUTE'>('RESOLVE');
  const [adminNote, setAdminNote] = useState('');

  const fetchRuns = () => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listRuns', data: {} })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setRuns(Array.isArray(r.data) ? r.data : []);
        }
      })
      .catch(console.error);
  };

  const fetchViolations = () => {
    setLoading(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'monitorRun',
        data: { runId: selectedRunId, Run_ID: selectedRunId, status: filterStatus }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          const raw = r.data || [];
          if (Array.isArray(raw)) {
            // Flatten violations from attempts if returned nested
            const allVios: any[] = [];
            raw.forEach((item: any) => {
              if (item.violations && Array.isArray(item.violations)) {
                item.violations.forEach((v: any) => allVios.push({ ...v, Full_Name: item.Full_Name, NIM: item.NIM }));
              } else if (item.Violation_ID || item.Event_Type) {
                allVios.push(item);
              }
            });
            setViolations(allVios);
          } else {
            setViolations([]);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
    fetchViolations();
  }, [selectedRunId, filterStatus]);

  const handleAction = async () => {
    if (!selectedViolation) return;
    setActionLoading(selectedViolation.Violation_ID);

    try {
      const res = await fetch('/api/admin/backend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resolveViolation',
          data: {
            violationId: selectedViolation.Violation_ID,
            Violation_ID: selectedViolation.Violation_ID,
            actionType,
            note: adminNote.trim() || (actionType === 'RESOLVE' ? 'Diverifikasi selesai oleh dosen' : 'Alarm di-mute oleh pengawas')
          }
        })
      });
      const data = await res.json();
      if (data.status === 'success' || data.ok) {
        fetchViolations();
        setShowNoteModal(false);
        setAdminNote('');
      } else {
        alert('Gagal memproses aksi: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredViolations = violations.filter(v => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      v.Student_Name?.toLowerCase().includes(q) ||
      v.NIM?.toLowerCase().includes(q) ||
      v.Event_Type?.toLowerCase().includes(q) ||
      v.Run_Name?.toLowerCase().includes(q)
    );
  });

  const activeAlarmsCount = violations.filter(v => v.Alarm_Status === 'ACTIVE').length;
  const unauthorizedCount = violations.filter(v => v.Is_Authorized === false).length;
  const authorizedCount = violations.filter(v => v.Is_Authorized === true).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pelanggaran & Anti-Cheat</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log rekaman perpindahan tab, window blur, dan aktivitas di luar ruang ujian secara komprehensif.
          </p>
        </div>
        <button
          onClick={fetchViolations}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Insiden</span>
            <div className="text-2xl font-bold text-slate-800 mt-0.5">{violations.length}</div>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-xl border shadow-xs flex items-center justify-between transition ${
          activeAlarmsCount > 0 ? 'bg-rose-50 border-rose-200 text-rose-950 animate-pulse' : 'bg-white border-slate-200 text-slate-800'
        }`}>
          <div>
            <span className="text-xs font-medium text-slate-500">Alarm Sirene Aktif</span>
            <div className="text-2xl font-bold mt-0.5 text-rose-700">{activeAlarmsCount}</div>
          </div>
          <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Tanpa Izin (Unauthorized)</span>
            <div className="text-2xl font-bold text-amber-700 mt-0.5">{unauthorizedCount}</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Berizin (Authorized)</span>
            <div className="text-2xl font-bold text-emerald-700 mt-0.5">{authorizedCount}</div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama mahasiswa, NIM, atau event..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-hidden"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Sesi Ujian Filter */}
          <select
            value={selectedRunId}
            onChange={e => setSelectedRunId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-semibold focus:border-sky-500 outline-hidden"
          >
            <option value="">Semua Sesi Ujian</option>
            {runs.map(r => (
              <option key={r.Run_ID} value={r.Run_ID}>
                {r.Run_Name} ({r.Access_Code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 font-semibold focus:border-sky-500 outline-hidden"
          >
            <option value="ALL">Semua Status Pelanggaran</option>
            <option value="ALARM_ACTIVE">🚨 Alarm Aktif</option>
            <option value="UNAUTHORIZED">⚠️ Tidak Berizin (Unauthorized)</option>
            <option value="AUTHORIZED">✓ Berizin (Authorized)</option>
            <option value="RESOLVED">Selesai (Resolved)</option>
          </select>
        </div>
      </div>

      {/* Violations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Mahasiswa</th>
                <th className="py-3 px-4">Sesi Ujian</th>
                <th className="py-3 px-4">Jenis Insiden</th>
                <th className="py-3 px-4">Durasi Keluar</th>
                <th className="py-3 px-4">Status Izin</th>
                <th className="py-3 px-4">Status Alarm</th>
                <th className="py-3 px-4 text-right">Tindakan Pengawas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    Memuat data log pelanggaran...
                  </td>
                </tr>
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tidak ada insiden pelanggaran yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v: any) => (
                  <tr key={v.Violation_ID} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono">
                      {new Date(v.Detected_At).toLocaleTimeString('id-ID')}
                      <span className="block text-[10px] text-slate-400">
                        {new Date(v.Detected_At).toLocaleDateString('id-ID')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <strong className="text-slate-900 block font-semibold">{v.Student_Name}</strong>
                      <span className="text-[11px] font-mono text-slate-500">
                        NIM: {v.NIM} • {v.Class_Name}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[160px] truncate text-slate-700">
                      {v.Run_Name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">
                        {v.Event_Type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {v.Duration_Seconds ? `${v.Duration_Seconds} detik` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {v.Is_Authorized ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          ✓ Berizin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                          ✗ Tanpa Izin
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {v.Alarm_Status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded text-[11px] animate-pulse">
                          🚨 Sirene Aktif
                        </span>
                      ) : v.Alarm_Status === 'MUTED' ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          🔇 Di-mute
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          ✓ Selesai
                        </span>
                      )}
                      {v.Admin_Note && (
                        <span className="block text-[10px] text-slate-400 italic mt-0.5 max-w-[140px] truncate">
                          "{v.Admin_Note}"
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                      {v.Alarm_Status === 'ACTIVE' && (
                        <button
                          onClick={() => {
                            setSelectedViolation(v);
                            setActionType('MUTE');
                            setAdminNote('Di-mute oleh pengawas');
                            setShowNoteModal(true);
                          }}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          Mute Alarm
                        </button>
                      )}
                      {v.Alarm_Status !== 'RESOLVED' && (
                        <button
                          onClick={() => {
                            setSelectedViolation(v);
                            setActionType('RESOLVE');
                            setAdminNote('Pelanggaran telah diklarifikasi dan ditangani');
                            setShowNoteModal(true);
                          }}
                          className="px-2.5 py-1 bg-sky-800 hover:bg-sky-900 text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          Tandai Selesai
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note & Action Modal */}
      {showNoteModal && selectedViolation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              {actionType === 'RESOLVE' ? 'Tandai Pelanggaran Selesai' : 'Matikan Alarm Pelanggaran'}
            </h3>
            <p className="text-xs text-slate-500">
              Mahasiswa: <strong>{selectedViolation.Student_Name}</strong> (NIM: {selectedViolation.NIM})
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Pengawas / Dosen:
              </label>
              <textarea
                rows={3}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Tuliskan catatan pengawas atau alasan tindak lanjut..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading === selectedViolation.Violation_ID}
                onClick={handleAction}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition cursor-pointer"
              >
                {actionLoading === selectedViolation.Violation_ID ? 'Memproses...' : 'Simpan Tindakan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
