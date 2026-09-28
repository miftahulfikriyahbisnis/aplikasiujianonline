import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Eye,
  CheckCircle2,
  BellOff,
  UserCheck
} from 'lucide-react';
import type { ExamRunItem } from '../../types/index.ts';

export const ExamMonitoring: React.FC = () => {
  const [monitorData, setMonitorData] = useState<any[]>([]);
  const [runs, setRuns] = useState<ExamRunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Permission
  const [showPermModal, setShowPermModal] = useState(false);
  const [permAttemptId, setPermAttemptId] = useState('');
  const [permType, setPermType] = useState<'LEAVE_EXAM' | 'MUTE_ALARM'>('LEAVE_EXAM');
  const [permDuration, setPermDuration] = useState(5);
  const [permReason, setPermReason] = useState('Izin ke toilet/kamar mandi');

  // Modal Violation Details
  const [showVioModal, setShowVioModal] = useState(false);
  const [selectedStudentVio, setSelectedStudentVio] = useState<any | null>(null);

  const timerRef = useRef<any>(null);

  const fetchRuns = () => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listRuns', data: {} })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          const list = Array.isArray(r.data) ? r.data : [];
          setRuns(list);
          const openRun = list.find((x: any) => x.Status === 'OPEN');
          if (openRun && !selectedRunId) {
            setSelectedRunId(openRun.Run_ID);
          } else if (list.length > 0 && !selectedRunId) {
            setSelectedRunId(list[0].Run_ID);
          } else if (list.length === 0) {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  };

  const fetchMonitoring = () => {
    if (!selectedRunId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'monitorRun',
        data: { runId: selectedRunId, Run_ID: selectedRunId }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setMonitorData(Array.isArray(r.data) ? r.data : []);
        } else {
          setError(r.message || 'Gagal memuat status pengawasan sesi.');
        }
      })
      .catch(err => {
        console.error(err);
        setError('Terjadi kendala saat menghubungkan ke database Google Sheets.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    fetchMonitoring();
  }, [selectedRunId]);

  // Auto-refresh interval (5s)
  useEffect(() => {
    if (autoRefresh && selectedRunId) {
      timerRef.current = setInterval(() => {
        fetch('/api/admin/backend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'monitorRun',
            data: { runId: selectedRunId, Run_ID: selectedRunId }
          })
        })
          .then(r => r.json())
          .then(r => {
            if (r.status === 'success' || r.ok) setMonitorData(r.data);
          })
          .catch(console.error);
      }, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, selectedRunId]);

  const handleGrantPermission = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'grantPermission',
        data: {
          attemptId: permAttemptId,
          Attempt_ID: permAttemptId,
          type: permType,
          expiryMinutes: permDuration,
          reason: permReason
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setShowPermModal(false);
          fetchMonitoring();
        }
      });
  };

  const handleViolationAction = (violationId: string, actionType: 'MUTE' | 'RESOLVE') => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resolveViolation',
        data: { violationId, Violation_ID: violationId, actionType }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          fetchMonitoring();
          if (selectedStudentVio) {
            setSelectedStudentVio({
              ...selectedStudentVio,
              Violations: selectedStudentVio.Violations.map((v: any) =>
                v.Violation_ID === violationId ? { ...v, Alarm_Status: actionType === 'RESOLVE' ? 'RESOLVED' : 'MUTED' } : v
              )
            });
          }
        }
      });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Monitoring Realtime Ujian</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau kehadiran, progres pengerjaan, deteksi anti-cheat berpindah tab, serta kontrol alarm dan izin pengawas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-xs cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 text-sky-700 rounded"
            />
            <span>Auto-Refresh (5s)</span>
          </label>

          <button
            onClick={fetchMonitoring}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Sekarang
          </button>
        </div>
      </div>

      {/* Select Run bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Sesi Ujian:</span>
          <select
            value={selectedRunId}
            onChange={e => setSelectedRunId(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
          >
            <option value="">Semua Sesi Ujian</option>
            {runs.map(r => (
              <option key={r.Run_ID} value={r.Run_ID}>
                {r.Run_Name} ({r.Class_Name}) - {r.Status} [Kode: {r.Access_Code}]
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-slate-600">Total Mahasiswa: <strong className="text-slate-800">{monitorData.length}</strong></span>
          <span className="text-emerald-700">Sedang Ujian: <strong>{monitorData.filter(m => m.Status === 'IN_PROGRESS').length}</strong></span>
          <span className="text-rose-700">Alarm Aktif: <strong>{monitorData.filter(m => m.Alarm_Status === 'ACTIVE').length}</strong></span>
        </div>
      </div>

      {/* Monitoring Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Mahasiswa</th>
                <th className="py-3 px-4">Kelas / Sesi</th>
                <th className="py-3 px-4">Progress Soal</th>
                <th className="py-3 px-4">Status Ujian</th>
                <th className="py-3 px-4">Pelanggaran / Alarm</th>
                <th className="py-3 px-4">Izin Pengawas</th>
                <th className="py-3 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monitorData.length > 0 ? (
                monitorData.map(item => {
                  const hasActiveAlarm = item.Alarm_Status === 'ACTIVE';
                  const percent = item.Total_Questions > 0 ? Math.round((item.Answered_Count / item.Total_Questions) * 100) : 0;
                  return (
                    <tr
                      key={item.Attempt_ID}
                      className={`hover:bg-slate-50 transition ${
                        hasActiveAlarm ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-sm">{item.Full_Name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">NIM: {item.NIM}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700">{item.Class_Name}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[140px]">{item.Run_Name}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-sky-700 h-2 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-700 font-mono">
                            {item.Answered_Count}/{item.Total_Questions}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.Status === 'SUBMITTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.Status === 'IN_PROGRESS'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.Status}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {hasActiveAlarm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <ShieldAlert className="w-3 h-3" />
                              ALARM AKTIF ({item.Violation_Count})
                            </span>
                          ) : item.Violation_Count > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800">
                              {item.Violation_Count} Riwayat
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Bersih
                            </span>
                          )}

                          {item.Violations && item.Violations.length > 0 && (
                            <button
                              onClick={() => {
                                setSelectedStudentVio(item);
                                setShowVioModal(true);
                              }}
                              className="text-[11px] text-sky-700 hover:underline font-semibold ml-1 cursor-pointer"
                            >
                              Detail
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.Active_Permissions && item.Active_Permissions.length > 0 ? (
                          <div className="space-y-1">
                            {item.Active_Permissions.map((p: any) => (
                              <span
                                key={p.Permission_ID}
                                className="block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200"
                              >
                                {p.Permission_Type === 'LEAVE_EXAM' ? 'Izin Keluar' : 'Mute Alarm'} ({p.Reason})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPermAttemptId(item.Attempt_ID);
                              setShowPermModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3" />
                            Beri Izin
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    Belum ada data pengerjaan ujian. Mahasiswa yang memasukkan Kode Akses akan muncul secara realtime di sini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Grant Permission */}
      {showPermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleGrantPermission} className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Beri Izin Resmi Pengawas</h3>
            <p className="text-xs text-slate-500">
              Izin resmi membebaskan mahasiswa dari peringatan alarm anti-cheat selama durasi yang ditentukan.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Izin</label>
              <select
                value={permType}
                onChange={e => setPermType(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              >
                <option value="LEAVE_EXAM">Izin Keluar Ruangan / Toilet (LEAVE_EXAM)</option>
                <option value="MUTE_ALARM">Mute Alarm Saja (MUTE_ALARM)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi Izin (Menit)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={permDuration}
                onChange={e => setPermDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Izin</label>
              <input
                type="text"
                required
                value={permReason}
                onChange={e => setPermReason(e.target.value)}
                placeholder="misal: Izin ke toilet / kendala teknis perangkat"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPermModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs"
              >
                Aktifkan Izin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Violation Details & Actions */}
      {showVioModal && selectedStudentVio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Riwayat Pelanggaran: {selectedStudentVio.Full_Name} ({selectedStudentVio.NIM})
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar insiden perpindahan tab / keluar jendela ujian yang dicatat oleh sistem anti-cheat.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 space-y-2">
              {selectedStudentVio.Violations.map((v: any) => (
                <div key={v.Violation_ID} className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{v.Event_Type}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      v.Alarm_Status === 'ACTIVE'
                        ? 'bg-rose-100 text-rose-800 animate-pulse'
                        : v.Alarm_Status === 'MUTED'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {v.Alarm_Status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span>Waktu: {new Date(v.Detected_At).toLocaleTimeString('id-ID')}</span>
                    <span>Durasi: {v.Duration_Seconds} Detik</span>
                    <span>Status Izin: {v.Is_Authorized ? 'Berizin' : 'Tanpa Izin'}</span>
                  </div>

                  {v.Admin_Note && (
                    <div className="text-[11px] text-slate-500 italic">
                      Catatan: {v.Admin_Note}
                    </div>
                  )}

                  {v.Alarm_Status === 'ACTIVE' && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleViolationAction(v.Violation_ID, 'MUTE')}
                        className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-xs transition cursor-pointer"
                      >
                        Mute Alarm
                      </button>
                      <button
                        onClick={() => handleViolationAction(v.Violation_ID, 'RESOLVE')}
                        className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition cursor-pointer"
                      >
                        Selesaikan (Resolve)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setShowVioModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
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
