import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  RotateCcw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Loader2,
  Check
} from 'lucide-react';
import type { ExamRunItem } from '../../types/index.ts';

export const ExamResults: React.FC = () => {
  const [runs, setRuns] = useState<ExamRunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Student paper detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Grading states inside detail modal
  const [gradingScores, setGradingScores] = useState<Record<string, number | string>>({});
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<string, string>>({});
  const [gradingSaving, setGradingSaving] = useState<Record<string, boolean>>({});
  const [gradingSavedSuccess, setGradingSavedSuccess] = useState<Record<string, boolean>>({});

  // Export states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<{ fileId?: string; fileName: string; url: string } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Reset modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetting, setResetting] = useState(false);

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
          if (list.length > 0 && !selectedRunId) {
            setSelectedRunId(list[0].Run_ID);
          }
        }
      });
  };

  const fetchResults = () => {
    if (!selectedRunId) return;
    setLoading(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getRunResults',
        data: { runId: selectedRunId, Run_ID: selectedRunId }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setResults(r.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    fetchResults();
  }, [selectedRunId]);

  const handleOpenDetail = (attemptId: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'getStudentAnswers',
        data: { attemptId, Attempt_ID: attemptId }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setDetailData(r.data);
          const initialScores: Record<string, number | string> = {};
          const initialFeedbacks: Record<string, string> = {};
          if (r.data?.questions) {
            r.data.questions.forEach((q: any) => {
              if (q.Question_Type === 'ESSAY') {
                initialScores[q.Exam_Question_ID] = q.Manual_Score !== null && q.Manual_Score !== undefined ? q.Manual_Score : '';
                initialFeedbacks[q.Exam_Question_ID] = q.Lecturer_Feedback || '';
              }
            });
          }
          setGradingScores(initialScores);
          setGradingFeedbacks(initialFeedbacks);
        }
      })
      .finally(() => setDetailLoading(false));
  };

  const handleSaveEssayGrade = async (q: any) => {
    const qId = q.Exam_Question_ID;
    const scoreVal = gradingScores[qId];
    if (scoreVal === '' || scoreVal === undefined || isNaN(Number(scoreVal))) {
      alert('Harap masukkan nilai angka yang valid.');
      return;
    }
    const numScore = Number(scoreVal);
    if (numScore < 0 || numScore > q.Max_Points) {
      alert(`Nilai harus antara 0 dan ${q.Max_Points}.`);
      return;
    }

    setGradingSaving(prev => ({ ...prev, [qId]: true }));
    try {
      const res = await fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gradeEssay',
          data: {
            answerId: q.Answer_ID,
            Answer_ID: q.Answer_ID,
            attemptId: detailData?.attempt?.Attempt_ID,
            Attempt_ID: detailData?.attempt?.Attempt_ID,
            examQuestionId: q.Exam_Question_ID,
            manualScore: numScore,
            Manual_Score: numScore,
            feedback: gradingFeedbacks[qId] || ''
          }
        })
      });
      const json = await res.json();
      if (json.status === 'success' || json.ok) {
        setGradingSavedSuccess(prev => ({ ...prev, [qId]: true }));
        setTimeout(() => {
          setGradingSavedSuccess(prev => ({ ...prev, [qId]: false }));
        }, 3000);
        fetchResults();
        setDetailData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: prev.questions.map((item: any) =>
              item.Exam_Question_ID === qId
                ? { ...item, Manual_Score: numScore, Lecturer_Feedback: gradingFeedbacks[qId] }
                : item
            )
          };
        });
      } else {
        alert('Gagal menyimpan nilai: ' + (json.message || json.error || 'Error backend'));
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + err.message);
    } finally {
      setGradingSaving(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleDownloadXlsx = async () => {
    if (!selectedRunId) return;
    setExportLoading(true);
    setExportError(null);
    setExportResult(null);
    setShowExportModal(true);

    try {
      const res = await fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'exportRunXlsx',
          data: { runId: selectedRunId, Run_ID: selectedRunId }
        })
      });
      const json = await res.json();
      if ((json.status === 'success' || json.ok) && (json.data?.url || json.data?.fileUrl || json.data?.data)) {
        setExportResult(json.data);
      } else {
        setExportError(json.message || json.error || 'Gagal mengekspor file dari Google Apps Script.');
      }
    } catch (err: any) {
      setExportError(err.message || 'Gagal menghubungi server untuk memproses ekspor.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleResetRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunId) return;
    setResetting(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resetRun',
        data: {
          runId: selectedRunId,
          Run_ID: selectedRunId,
          confirmation: resetConfirmInput
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          alert(`Berhasil mereset respons ujian dari Google Sheets.`);
          setShowResetModal(false);
          setResetConfirmInput('');
          fetchResults();
        } else {
          alert('Gagal mereset: ' + (r.message || r.error));
        }
      })
      .finally(() => setResetting(false));
  };

  const selectedRun = runs.find(r => r.Run_ID === selectedRunId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Hasil Ujian, Ekspor XLSX & Reset</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Rekap perolehan skor mahasiswa, unduh laporan komprehensif 4 sheet Excel, serta opsi reset respons aman per sesi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadXlsx}
            disabled={exportLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition cursor-pointer shadow-xs"
          >
            {exportLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengekspor ke Drive...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download XLSX (4 Sheet)
              </>
            )}
          </button>
          <button
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Respons Sesi Ini
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
            {runs.map(r => (
              <option key={r.Run_ID} value={r.Run_ID}>
                {r.Run_Name} ({r.Class_Name}) [Kode: {r.Access_Code}]
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-3">
          <span>Status Sesi: <strong className="text-slate-800">{selectedRun?.Status}</strong></span>
          <span>•</span>
          <span>Status Data: <strong className="text-slate-800">{selectedRun?.Data_Status || 'ACTIVE'}</strong></span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">NIM</th>
                <th className="py-3 px-4">Nama Mahasiswa</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">Nilai PG</th>
                <th className="py-3 px-4">Nilai Essay</th>
                <th className="py-3 px-4">Nilai Akhir</th>
                <th className="py-3 px-4">Status Penilaian</th>
                <th className="py-3 px-4">Pelanggaran</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.length > 0 ? (
                results.map(row => (
                  <tr key={row.Attempt_ID} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{row.NIM}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-sm">{row.Full_Name}</td>
                    <td className="py-3 px-4 text-slate-600">{row.Class_Name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{row.Objective_Score}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">{row.Essay_Score}</td>
                    <td className="py-3 px-4 font-mono font-bold text-base text-sky-800">
                      {row.Final_Score}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        row.Grading_Status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.Grading_Status === 'COMPLETED' ? 'SELESAI' : 'PENDING ESSAY'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {row.Violation_Count > 0 ? (
                        <span className="font-semibold text-rose-700">{row.Violation_Count} Kali</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(row.Attempt_ID)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-semibold transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail Lembar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                    Belum ada data pengerjaan ujian yang tersimpan untuk sesi ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Student Detail Paper */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Lembar Jawaban: {detailData?.student?.Full_Name} ({detailData?.student?.NIM})
                </h3>
                <p className="text-xs text-slate-500">
                  Total Skor: <strong>{detailData?.attempt?.Final_Score}</strong> (PG: {detailData?.attempt?.Objective_Score}, Essay: {detailData?.attempt?.Essay_Score})
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 space-y-4 py-4 pr-1">
              {detailLoading ? (
                <div className="p-12 text-center text-sm text-slate-500">Memuat detail lembar jawaban...</div>
              ) : detailData?.questions ? (
                detailData.questions.map((q: any) => (
                  <div key={q.Exam_Question_ID} className="p-4 rounded-xl bg-slate-50 space-y-3">
                    {q.Question_Type === 'MCQ' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-sm">Soal {q.Question_Number}</span>
                          <span className="text-xs font-bold text-slate-600">
                            Nilai: <strong className="text-sky-800">{q.Auto_Score ?? (q.Is_Correct ? q.Max_Points : 0)}</strong> / {q.Max_Points}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{q.Question_Text}</p>

                        <div>
                          <span className="text-xs text-slate-500 font-semibold block mb-1">Jawaban mahasiswa:</span>
                          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800">
                            {(() => {
                              if (q.Selected_Option_Key && q.Selected_Option_Text) {
                                return `${q.Selected_Option_Key}. ${q.Selected_Option_Text}`;
                              }
                              if (q.Selected_Option_ID && q.Options?.length > 0) {
                                const found = q.Options.find((o: any) => o.Option_ID === q.Selected_Option_ID);
                                if (found) {
                                  return `${found.Option_Key}. ${found.Option_Text}`;
                                }
                              }
                              return <span className="text-slate-400 font-normal italic">Tidak dijawab / Kosong</span>;
                            })()}
                          </div>
                        </div>

                        <div className="pt-0.5">
                          {q.Is_Correct ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ✓ Benar
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                                <X className="w-3.5 h-3.5 text-rose-600" />
                                ✗ Salah
                              </span>
                              {q.Correct_Option_Key && (
                                <span className="text-xs text-slate-600">
                                  (Kunci Benar: <strong className="text-emerald-700">{q.Correct_Option_Key}. {q.Correct_Option_Text}</strong>)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 text-sm">Soal {q.Question_Number} — Essay</span>
                          <span className="text-xs text-slate-500">Maks. {q.Max_Points} Poin</span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{q.Question_Text}</p>

                        <div>
                          <span className="text-xs text-slate-500 font-semibold block mb-1">Jawaban mahasiswa:</span>
                          <div className="p-3.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-900 leading-relaxed whitespace-pre-wrap font-sans">
                            {q.Answer_Text ? (
                              `"${q.Answer_Text}"`
                            ) : (
                              <span className="text-slate-400 italic">Tidak dijawab / Kosong</span>
                            )}
                          </div>
                        </div>

                        {q.Answer_Guide && (
                          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                            <strong className="font-semibold block mb-0.5">Rubrik / Panduan Penilaian:</strong>
                            {q.Answer_Guide}
                          </div>
                        )}

                        <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-slate-700">Nilai:</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={q.Max_Points}
                                value={gradingScores[q.Exam_Question_ID] ?? ''}
                                onChange={e => setGradingScores(prev => ({ ...prev, [q.Exam_Question_ID]: e.target.value }))}
                                placeholder="0"
                                className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-center bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                              />
                              <span className="text-xs font-bold text-slate-500">/ {q.Max_Points}</span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Feedback:</label>
                            <textarea
                              rows={2}
                              value={gradingFeedbacks[q.Exam_Question_ID] ?? ''}
                              onChange={e => setGradingFeedbacks(prev => ({ ...prev, [q.Exam_Question_ID]: e.target.value }))}
                              placeholder="Tulis feedback untuk mahasiswa..."
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500">
                              {q.Graded_At ? `Terakhir dinilai: ${new Date(q.Graded_At).toLocaleString('id-ID')}` : 'Belum dinilai dosen'}
                            </span>
                            <button
                              type="button"
                              disabled={gradingSaving[q.Exam_Question_ID]}
                              onClick={() => handleSaveEssayGrade(q)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-800 hover:bg-sky-900 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
                            >
                              {gradingSaving[q.Exam_Question_ID] ? (
                                'Menyimpan...'
                              ) : gradingSavedSuccess[q.Exam_Question_ID] ? (
                                '✓ Nilai Tersimpan'
                              ) : (
                                'SIMPAN NILAI'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : null}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Result / Progress Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                Ekspor Hasil Ujian (Google Drive)
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {exportLoading ? (
              <div className="py-8 px-4 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Sedang Mengekspor ke Google Drive...</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                    Google Apps Script sedang mengompilasi data dan membuat file spreadsheet 4-Sheet (Rekap Nilai, Jawaban PG, Jawaban Essay, dan Pelanggaran). Harap tunggu...
                  </p>
                </div>
              </div>
            ) : exportError ? (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-950 space-y-1 w-full">
                    <strong className="block text-sm text-rose-900 font-bold">Gagal Melakukan Ekspor</strong>
                    <p className="text-slate-600">Terjadi kesalahan pada backend Google Apps Script:</p>
                    <div className="p-2.5 bg-white rounded border border-rose-200 font-mono text-[11px] text-rose-800 whitespace-pre-wrap break-all mt-1">
                      {exportError}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={handleDownloadXlsx}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer shadow-xs"
                  >
                    Coba Lagi
                  </button>
                </div>
              </div>
            ) : exportResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-950 space-y-1.5 w-full">
                    <strong className="block text-base text-emerald-900 font-bold">Export berhasil!</strong>
                    <p className="text-slate-700 text-xs">
                      File Excel 4-Sheet telah berhasil dibuat di Google Drive Anda.
                    </p>
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-emerald-200">
                      <span className="text-[11px] text-slate-500 font-semibold block">Nama File:</span>
                      <span className="font-mono text-xs font-bold text-slate-800 break-all">
                        {exportResult.fileName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    Tutup
                  </button>
                  <a
                    href={exportResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition cursor-pointer shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    BUKA / DOWNLOAD EXCEL
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Safe Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleResetRun} className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-950 space-y-1">
                <strong className="block text-sm text-rose-900">Konfirmasi Reset Respons Ujian</strong>
                <p>
                  Tindakan ini akan <strong>menghapus permanen</strong> data respons pada sesi ini:
                </p>
                <ul className="list-disc list-inside pl-1 text-slate-700 space-y-0.5">
                  <li>Data pengerjaan mahasiswa (<code>ATTEMPTS</code>)</li>
                  <li>Semua jawaban PG & Essay (<code>ANSWERS</code>)</li>
                  <li>Log pelanggaran anti-cheat (<code>VIOLATIONS</code>)</li>
                  <li>Izin pengawas (<code>PERMISSIONS</code>)</li>
                </ul>
                <p className="font-semibold text-emerald-800 pt-1">
                  Bank soal, versi soal, mata kuliah, blueprint ujian, dan riwayat audit log TETAP AMAN dan tidak akan terhapus.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ketik <strong>{selectedRunId}</strong> atau <strong>RESET</strong> untuk melanjutkan:
              </label>
              <input
                type="text"
                required
                value={resetConfirmInput}
                onChange={e => setResetConfirmInput(e.target.value)}
                placeholder={selectedRunId}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={resetting || (resetConfirmInput !== selectedRunId && resetConfirmInput.toUpperCase() !== 'RESET')}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                {resetting ? 'Mereset...' : 'Ya, Hapus Respons Sesi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
