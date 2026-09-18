import React, { useState, useEffect } from 'react';
import { PenTool, CheckCircle2, HelpCircle, Save, Filter, Clock } from 'lucide-react';
import type { ExamRunItem } from '../../types/index.ts';

export const EssayGrading: React.FC = () => {
  const [runs, setRuns] = useState<ExamRunItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [essays, setEssays] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Editing state
  const [gradingState, setGradingState] = useState<Record<string, { score: number | string; feedback: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const fetchRuns = () => {
    fetch('/api/runs')
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success') {
          setRuns(r.data);
          if (r.data.length > 0 && !selectedRunId) {
            setSelectedRunId(r.data[0].Run_ID);
          }
        }
      });
  };

  const fetchEssays = () => {
    if (!selectedRunId) return;
    setLoading(true);
    fetch(`/api/grading/essays?runId=${selectedRunId}`)
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success') {
          setEssays(r.data);
          const initial: Record<string, { score: number | string; feedback: string }> = {};
          r.data.forEach((e: any) => {
            initial[e.Answer_ID] = {
              score: e.Manual_Score !== null && e.Manual_Score !== undefined ? e.Manual_Score : '',
              feedback: e.Lecturer_Feedback || ''
            };
          });
          setGradingState(initial);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  useEffect(() => {
    fetchEssays();
  }, [selectedRunId]);

  const handleSaveGrade = (answerId: string, maxPoints: number) => {
    const item = gradingState[answerId];
    if (!item) return;
    const scoreNum = Number(item.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxPoints) {
      alert(`Nilai harus berupa angka antara 0 dan ${maxPoints}`);
      return;
    }

    setSavingId(answerId);
    fetch('/api/grading/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answerId,
        manualScore: scoreNum,
        feedback: item.feedback
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success') {
          setSavedSuccessId(answerId);
          setTimeout(() => setSavedSuccessId(null), 2000);
          fetchEssays();
        } else {
          alert('Gagal menyimpan nilai: ' + r.message);
        }
      })
      .finally(() => setSavingId(null));
  };

  const pendingCount = essays.filter(e => e.Manual_Score === null || e.Manual_Score === undefined || e.Manual_Score === '').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Koreksi & Penilaian Essay Manual</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Evaluasi jawaban uraian mahasiswa secara manual berdasarkan rubrik penilaian dosen dengan rekalkulasi skor otomatis.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
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
                {r.Run_Name} ({r.Class_Name})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="text-slate-600">Total Jawaban Essay: <strong className="text-slate-800">{essays.length}</strong></span>
          <span className="text-amber-700">Belum Dinilai: <strong>{pendingCount}</strong></span>
          <span className="text-emerald-700">Selesai Dinilai: <strong>{essays.length - pendingCount}</strong></span>
        </div>
      </div>

      {/* Essays List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            Memuat jawaban essay...
          </div>
        ) : essays.length > 0 ? (
          essays.map((ans, idx) => {
            const isGraded = ans.Manual_Score !== null && ans.Manual_Score !== undefined && ans.Manual_Score !== '';
            const isSaving = savingId === ans.Answer_ID;
            const isSaved = savedSuccessId === ans.Answer_ID;
            const curState = gradingState[ans.Answer_ID] || { score: '', feedback: '' };

            return (
              <div
                key={ans.Answer_ID}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4"
              >
                {/* Header: Student and Question Info */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      No #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">{ans.Student_Name}</span>
                    <span className="font-mono text-slate-500">NIM: {ans.NIM}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500">
                      Poin Maks: <strong className="text-slate-800">{ans.Max_Points}</strong>
                    </span>
                    {isGraded ? (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Sudah Dinilai ({ans.Manual_Score}/{ans.Max_Points})
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Menunggu Penilaian
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pertanyaan Soal:</div>
                  <div className="text-sm font-semibold text-slate-800 leading-relaxed">
                    {ans.Question_Text}
                  </div>
                </div>

                {/* Answer Guide (Rubrik) */}
                {ans.Answer_Guide && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Rubrik / Panduan Penilaian Dosen:
                    </div>
                    <div className="text-slate-700 whitespace-pre-line pl-5 leading-relaxed">
                      {ans.Answer_Guide}
                    </div>
                  </div>
                )}

                {/* Student Answer */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jawaban Mahasiswa:</div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                    {ans.Answer_Text || '(Tidak ada jawaban tertulis)'}
                  </div>
                </div>

                {/* Grading Controls */}
                <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-sky-950 mb-1">
                      Nilai Diberikan (0 - {ans.Max_Points}):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={ans.Max_Points}
                      step={0.5}
                      value={curState.score}
                      onChange={e => {
                        const val = e.target.value;
                        setGradingState(prev => ({
                          ...prev,
                          [ans.Answer_ID]: { ...curState, score: val }
                        }));
                      }}
                      placeholder={`0 - ${ans.Max_Points}`}
                      className="w-full px-3 py-2 border border-sky-300 rounded-lg text-sm font-bold bg-white"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xs font-bold text-sky-950 mb-1">
                      Catatan / Feedback untuk Mahasiswa:
                    </label>
                    <input
                      type="text"
                      value={curState.feedback}
                      onChange={e => {
                        const val = e.target.value;
                        setGradingState(prev => ({
                          ...prev,
                          [ans.Answer_ID]: { ...curState, feedback: val }
                        }));
                      }}
                      placeholder="Ulasan dosen mengenai jawaban..."
                      className="w-full px-3 py-2 border border-sky-300 rounded-lg text-xs bg-white"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      onClick={() => handleSaveGrade(ans.Answer_ID, ans.Max_Points)}
                      disabled={isSaving}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-sky-800 hover:bg-sky-900 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isSaved ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                          <span>Tersimpan!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>{isSaving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            Tidak ada jawaban essay pada sesi ujian ini atau belum ada mahasiswa yang mengerjakan.
          </div>
        )}
      </div>
    </div>
  );
};
