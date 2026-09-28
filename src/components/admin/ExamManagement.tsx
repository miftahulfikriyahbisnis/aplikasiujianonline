import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  PlayCircle,
  CheckCircle2,
  Lock,
  Calendar,
  Clock,
  Shield,
  Key,
  ListFilter,
  Check
} from 'lucide-react';
import type { ExamItem, ExamRunItem, CourseItem } from '../../types/index.ts';

export const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [runs, setRuns] = useState<ExamRunItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [showSelectQuestionsModal, setShowSelectQuestionsModal] = useState(false);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);

  // Available questions for selection
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<string, { points: number; selected: boolean }>>({});

  // Form Create Exam
  const [newExamName, setNewExamName] = useState('');
  const [newCourseId, setNewCourseId] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newInstructions, setNewInstructions] = useState('Kerjakan dengan jujur dan teliti. Dilarang berpindah tab atau keluar fullscreen.');
  const [newAntiCheat, setNewAntiCheat] = useState(true);
  const [newFullscreen, setNewFullscreen] = useState(true);
  const [newShuffleQuestions, setNewShuffleQuestions] = useState(false);
  const [newShuffleOptions, setNewShuffleOptions] = useState(false);
  const [newRetentionDays, setNewRetentionDays] = useState(14);

  // Form Create Run
  const [newRunName, setNewRunName] = useState('');
  const [newRunClass, setNewRunClass] = useState('Kelas A');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [newStartAt, setNewStartAt] = useState('');
  const [newEndAt, setNewEndAt] = useState('');

  const fetchExamsAndRuns = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listExams', data: {} })
      }).then(r => r.json()),
      fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listRuns', data: {} })
      }).then(r => r.json()),
      fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listCourses', data: {} })
      }).then(r => r.json())
    ]).then(([examsRes, runsRes, coursesRes]) => {
      if (examsRes.status === 'success' || examsRes.ok) {
        setExams(Array.isArray(examsRes.data) ? examsRes.data : []);
        if (examsRes.data && examsRes.data.length > 0 && !selectedExam) {
          setSelectedExam(examsRes.data[0]);
        }
      }
      if (runsRes.status === 'success' || runsRes.ok) setRuns(Array.isArray(runsRes.data) ? runsRes.data : []);
      if (coursesRes.status === 'success' || coursesRes.ok) {
        const cList = Array.isArray(coursesRes.data) ? coursesRes.data : [];
        setCourses(cList);
        if (cList.length > 0 && !newCourseId) {
          setNewCourseId(cList[0].Course_ID);
        }
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExamsAndRuns();
  }, []);

  // Open question selector modal
  const openQuestionSelector = (exam: any) => {
    setSelectedExam(exam);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listQuestions',
        data: { courseId: exam.Course_ID, Course_ID: exam.Course_ID }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          const list = Array.isArray(r.data) ? r.data : [];
          setAvailableQuestions(list);
          const initialSelection: Record<string, { points: number; selected: boolean }> = {};
          list.forEach((q: any) => {
            const verId = q.Current_Version_ID || q.Version_ID || q.Question_ID;
            if (verId) {
              initialSelection[verId] = {
                points: q.Default_Points || 2,
                selected: true
              };
            }
          });
          setSelectedVersionIds(initialSelection);
          setShowSelectQuestionsModal(true);
        }
      });
  };

  const handleSaveExamQuestions = () => {
    if (!selectedExam) return;
    const items = Object.entries(selectedVersionIds)
      .filter(([_, v]) => (v as { points: number; selected: boolean }).selected)
      .map(([vId, v], idx) => ({
        Version_ID: vId,
        Question_Number: idx + 1,
        Points: (v as { points: number; selected: boolean }).points,
        Is_Required: true
      }));

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setExamQuestions',
        data: {
          examId: selectedExam.Exam_ID,
          Exam_ID: selectedExam.Exam_ID,
          questions: items
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setShowSelectQuestionsModal(false);
          fetchExamsAndRuns();
        }
      });
  };

  const handlePublishExam = (examId: string) => {
    if (!confirm('Publikasikan ujian ini? Soal akan dikunci ke versi yang dipilih.')) return;
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateExam',
        data: {
          examId,
          Exam_ID: examId,
          Status: 'PUBLISHED',
          status: 'PUBLISHED'
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          fetchExamsAndRuns();
        } else {
          alert('Gagal mempublikasikan: ' + (r.message || r.error));
        }
      });
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createExam',
        data: {
          Exam_Name: newExamName,
          Course_ID: newCourseId,
          Duration_Minutes: newDuration,
          Instructions: newInstructions,
          Anti_Cheat_Enabled: newAntiCheat,
          Fullscreen_Required: newFullscreen,
          Shuffle_Questions: newShuffleQuestions,
          Shuffle_Options: newShuffleOptions,
          Response_Retention_Days: newRetentionDays
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setShowCreateExamModal(false);
          setNewExamName('');
          fetchExamsAndRuns();
        }
      });
  };

  const handleCreateRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createRun',
        data: {
          Exam_ID: selectedExam.Exam_ID,
          examId: selectedExam.Exam_ID,
          Run_Name: newRunName || `Sesi Ujian ${selectedExam.Exam_Name}`,
          Class_Name: newRunClass,
          Access_Code: newAccessCode || undefined,
          Start_At: newStartAt || new Date().toISOString(),
          End_At: newEndAt || new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
          Status: 'OPEN'
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setShowCreateRunModal(false);
          setNewRunName('');
          setNewAccessCode('');
          fetchExamsAndRuns();
        }
      });
  };

  const handleUpdateRunStatus = (runId: string, status: 'OPEN' | 'CLOSED') => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateRun',
        data: {
          runId,
          Run_ID: runId,
          status,
          Status: status
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) fetchExamsAndRuns();
      });
  };

  const filteredRuns = selectedExam ? runs.filter(r => r.Exam_ID === selectedExam.Exam_ID) : runs;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Blueprint & Sesi Ujian</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Penyusunan blueprint ujian, penguncian butir soal spesifik (Version_ID), dan aktivasi sesi ujian (Run).
          </p>
        </div>
        <button
          onClick={() => setShowCreateExamModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Buat Blueprint Ujian Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exam Blueprint List (Left) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Daftar Ujian ({exams.length})
            </h2>
            <div className="space-y-2.5">
              {exams.map(e => {
                const isSelected = selectedExam?.Exam_ID === e.Exam_ID;
                return (
                  <div
                    key={e.Exam_ID}
                    onClick={() => setSelectedExam(e)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {e.Exam_ID}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        e.Status === 'PUBLISHED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {e.Status}
                      </span>
                    </div>

                    <div className="font-bold text-slate-800 text-sm">{e.Exam_Name}</div>
                    <div className="text-xs text-slate-500">{e.Course_Name}</div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                      <span>{e.Total_Questions} Soal ({e.Total_Points} Poin)</span>
                      <span>{e.Duration_Minutes} Menit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Selected Exam Runs & Actions (Right) */}
        <div className="lg:col-span-7 space-y-6">
          {selectedExam ? (
            <>
              {/* Selected Exam Card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-sky-700 uppercase">
                      {selectedExam.Exam_ID} • {selectedExam.Course_Name}
                    </span>
                    <h2 className="text-xl font-bold text-slate-800 mt-0.5">{selectedExam.Exam_Name}</h2>
                    <p className="text-xs text-slate-500 mt-1">{selectedExam.Instructions}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedExam.Status === 'DRAFT' && (
                      <button
                        onClick={() => handlePublishExam(selectedExam.Exam_ID)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Publish Ujian
                      </button>
                    )}
                    <button
                      onClick={() => openQuestionSelector(selectedExam)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 text-xs font-semibold transition cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Pilih & Kunci Soal ({selectedExam.Total_Questions})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[11px] text-slate-400">Durasi</span>
                    <strong className="text-slate-800 font-mono">{selectedExam.Duration_Minutes} Menit</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[11px] text-slate-400">Anti-Cheat</span>
                    <strong className="text-slate-800">{selectedExam.Anti_Cheat_Enabled ? 'Aktif' : 'Nonaktif'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[11px] text-slate-400">Fullscreen</span>
                    <strong className="text-slate-800">{selectedExam.Fullscreen_Required ? 'Wajib' : 'Opsional'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[11px] text-slate-400">Retensi</span>
                    <strong className="text-slate-800">{selectedExam.Response_Retention_Days} Hari</strong>
                  </div>
                </div>
              </div>

              {/* Sesi Ujian (Exam Runs) List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Sesi Ujian Aktif (Exam Runs) ({filteredRuns.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setNewRunName(`Sesi Ujian ${selectedExam.Exam_Name}`);
                      setShowCreateRunModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Buka Sesi Ujian Baru
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredRuns.length > 0 ? (
                    filteredRuns.map(run => (
                      <div key={run.Run_ID} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm">{run.Run_Name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              run.Status === 'OPEN'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {run.Status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-3">
                            <span>Kelas: <strong>{run.Class_Name}</strong></span>
                            <span>•</span>
                            <span>Kode Akses: <strong className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">{run.Access_Code}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {run.Status === 'OPEN' ? (
                            <button
                              onClick={() => handleUpdateRunStatus(run.Run_ID, 'CLOSED')}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                            >
                              Tutup Sesi (CLOSE)
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateRunStatus(run.Run_ID, 'OPEN')}
                              className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                            >
                              Buka Kembali (OPEN)
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      Belum ada sesi ujian untuk ujian ini. Klik "Buka Sesi Ujian Baru" di atas.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
              Pilih blueprint ujian di sebelah kiri untuk melihat rincian dan sesi ujian.
            </div>
          )}
        </div>
      </div>

      {/* Modal Create Exam Blueprint */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <form onSubmit={handleCreateExam} className="bg-white rounded-xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-800">Buat Blueprint Ujian Baru</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Kuliah</label>
              <select
                value={newCourseId}
                onChange={e => setNewCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                {courses.map(c => <option key={c.Course_ID} value={c.Course_ID}>{c.Course_Name} ({c.Course_Code})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ujian</label>
              <input
                type="text"
                required
                value={newExamName}
                onChange={e => setNewExamName(e.target.value)}
                placeholder="UTS Biokimia Teori Genap 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi Ujian (Menit)</label>
                <input
                  type="number"
                  min={5}
                  value={newDuration}
                  onChange={e => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Retensi Respons (Hari)</label>
                <input
                  type="number"
                  min={1}
                  value={newRetentionDays}
                  onChange={e => setNewRetentionDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Petunjuk Pengerjaan Ujian</label>
              <textarea
                rows={2}
                value={newInstructions}
                onChange={e => setNewInstructions(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAntiCheat}
                  onChange={e => setNewAntiCheat(e.target.checked)}
                  className="w-4 h-4 text-sky-700 rounded"
                />
                <span className="font-semibold text-slate-800">Aktifkan Anti-Cheat (Deteksi Blur Window & Tab Berpindah)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newFullscreen}
                  onChange={e => setNewFullscreen(e.target.checked)}
                  className="w-4 h-4 text-sky-700 rounded"
                />
                <span className="font-semibold text-slate-800">Wajibkan Layar Penuh (Fullscreen Required)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateExamModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs"
              >
                Simpan Blueprint
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Lock & Select Questions */}
      {showSelectQuestionsModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Pilih & Kunci Butir Soal untuk Ujian</h3>
                <p className="text-xs text-slate-500">
                  Soal yang dipilih akan dikunci permanen pada versi terkini (<code>Version_ID</code>).
                </p>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 space-y-2">
              {availableQuestions.map((q, idx) => {
                const isChecked = selectedVersionIds[q.Current_Version_ID]?.selected ?? true;
                const pts = selectedVersionIds[q.Current_Version_ID]?.points ?? q.Default_Points;
                return (
                  <div key={q.Question_ID} className="p-3 flex items-start gap-3 hover:bg-slate-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        setSelectedVersionIds(prev => ({
                          ...prev,
                          [q.Current_Version_ID]: {
                            points: pts,
                            selected: e.target.checked
                          }
                        }));
                      }}
                      className="w-4 h-4 mt-1 text-sky-700 rounded"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-slate-700">#{idx + 1}</span>
                        <span className="font-mono text-slate-500">{q.Question_ID}</span>
                        <span className="font-semibold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">
                          {q.Question_Type} (v{q.Version_Number})
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{q.Topic_Name}</span>
                      </div>
                      <p className="text-xs text-slate-800 line-clamp-2">{q.Question_Text}</p>
                    </div>
                    <div className="w-24">
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Poin</label>
                      <input
                        type="number"
                        min={1}
                        value={pts}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setSelectedVersionIds(prev => ({
                            ...prev,
                            [q.Current_Version_ID]: {
                              points: val,
                              selected: isChecked
                            }
                          }));
                        }}
                        className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">
                Total Terpilih: {Object.values(selectedVersionIds).filter((x: any) => x.selected).length} Soal
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSelectQuestionsModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveExamQuestions}
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs"
                >
                  Simpan & Kunci Butir Soal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Create Run */}
      {showCreateRunModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateRun} className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Buka Sesi Ujian Baru (Exam Run)</h3>
            <p className="text-xs text-slate-500">
              Ujian: <strong>{selectedExam.Exam_Name}</strong>
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sesi Ujian</label>
              <input
                type="text"
                required
                value={newRunName}
                onChange={e => setNewRunName(e.target.value)}
                placeholder="Sesi Ujian Kelas A - Pagi"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas / Rombel</label>
              <input
                type="text"
                required
                value={newRunClass}
                onChange={e => setNewRunClass(e.target.value)}
                placeholder="Kelas A"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Akses Mahasiswa (Opsional, kosongkan untuk auto-generate)
              </label>
              <input
                type="text"
                value={newAccessCode}
                onChange={e => setNewAccessCode(e.target.value.toUpperCase())}
                placeholder="misal: BIO2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateRunModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer shadow-xs"
              >
                Buka Sesi Ujian Sekarang
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
