import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Plus,
  Filter,
  Copy,
  Archive,
  History,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { QuestionItem, CourseItem, TopicItem, QuestionBankItem } from '../../types/index.ts';

export const QuestionBankManagement: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded cards state
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (questionId: string) => {
    setExpandedQuestionIds(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Helper functions for robust data binding
  const getQuestionText = (q: any): string => {
    return q.Question_Text || q.Current_Version?.Question_Text || q.question_text || q.text || '';
  };

  const getQuestionPoints = (q: any): number | null => {
    const pts = q.Default_Points ?? q.Current_Version?.Default_Points ?? q.points ?? null;
    if (pts === null || pts === undefined || isNaN(Number(pts))) return null;
    return Number(pts);
  };

  const getQuestionVersion = (q: any): number => {
    return Number(q.Version_Number || q.Current_Version?.Version_Number) || 1;
  };

  const getQuestionImage = (q: any): string => {
    return q.Image_URL || q.Current_Version?.Image_URL || '';
  };

  const getQuestionGuide = (q: any): string => {
    return q.Answer_Guide || q.Current_Version?.Answer_Guide || '';
  };

  const getQuestionExplanation = (q: any): string => {
    return q.Explanation || q.Current_Version?.Explanation || '';
  };

  const getBankName = (q: any): string => {
    if (q.Bank_Name) return q.Bank_Name;
    const b = banks.find(x => x.Bank_ID === q.Bank_ID);
    return b?.Bank_Name || q.Bank_ID || 'Bank Soal';
  };

  const getTopicName = (q: any): string => {
    if (q.Topic_Name) return q.Topic_Name;
    if (!q.Topic_ID) return '';
    const t = topics.find(x => x.Topic_ID === q.Topic_ID);
    return t?.Topic_Name || q.Topic_ID || '';
  };

  // Filters
  const [filterBank, setFilterBank] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');

  // Modals
  const [showMCQModal, setShowMCQModal] = useState(false);
  const [showEssayModal, setShowEssayModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [targetQuestion, setTargetQuestion] = useState<any | null>(null);

  // Form MCQ
  const [mcqBankId, setMcqBankId] = useState('');
  const [mcqTopicId, setMcqTopicId] = useState('');
  const [mcqDifficulty, setMcqDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [mcqText, setMcqText] = useState('');
  const [mcqImageUrl, setMcqImageUrl] = useState('');
  const [mcqPoints, setMcqPoints] = useState(2);
  const [mcqExplanation, setMcqExplanation] = useState('');
  const [mcqOptions, setMcqOptions] = useState([
    { Option_Key: 'A', Option_Text: '', Is_Correct: true },
    { Option_Key: 'B', Option_Text: '', Is_Correct: false },
    { Option_Key: 'C', Option_Text: '', Is_Correct: false },
    { Option_Key: 'D', Option_Text: '', Is_Correct: false }
  ]);

  // Form Essay
  const [essayBankId, setEssayBankId] = useState('');
  const [essayTopicId, setEssayTopicId] = useState('');
  const [essayDifficulty, setEssayDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [essayText, setEssayText] = useState('');
  const [essayImageUrl, setEssayImageUrl] = useState('');
  const [essayPoints, setEssayPoints] = useState(10);
  const [essayGuide, setEssayGuide] = useState('');
  const [essayExplanation, setEssayExplanation] = useState('');

  // Form Revision
  const [revText, setRevText] = useState('');
  const [revImageUrl, setRevImageUrl] = useState('');
  const [revPoints, setRevPoints] = useState(2);
  const [revGuide, setRevGuide] = useState('');
  const [revExplanation, setRevExplanation] = useState('');
  const [revOptions, setRevOptions] = useState<any[]>([]);

  const fetchQuestions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterBank) params.set('bankId', filterBank);
    if (filterTopic) params.set('topicId', filterTopic);
    if (filterType) params.set('questionType', filterType);
    if (filterDifficulty) params.set('difficulty', filterDifficulty);
    if (filterStatus) params.set('status', filterStatus);

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listQuestions',
        data: {
          bankId: filterBank,
          Bank_ID: filterBank,
          topicId: filterTopic,
          Topic_ID: filterTopic,
          questionType: filterType,
          difficulty: filterDifficulty,
          status: filterStatus
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          setQuestions(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listCourses', data: {} })
    }).then(r => r.json()).then(r => { if (r.status === 'success' || r.ok) setCourses(r.data || []); });

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listQuestionBanks', data: {} })
    }).then(r => r.json()).then(r => {
      if (r.status === 'success' || r.ok) {
        const list = Array.isArray(r.data) ? r.data : [];
        setBanks(list);
        if (list.length > 0) {
          setMcqBankId(list[0].Bank_ID);
          setEssayBankId(list[0].Bank_ID);
        }
      }
    });

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listTopics', data: {} })
    }).then(r => r.json()).then(r => {
      if (r.status === 'success' || r.ok) {
        const list = Array.isArray(r.data) ? r.data : [];
        setTopics(list);
        // Topic is optional by default
        setMcqTopicId('');
        setEssayTopicId('');
      }
    });
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [filterBank, filterTopic, filterType, filterDifficulty, filterStatus]);

  // Handlers
  const handleCreateMCQ = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createQuestion',
        data: {
          Bank_ID: mcqBankId,
          bankId: mcqBankId,
          Topic_ID: mcqTopicId,
          topicId: mcqTopicId,
          Question_Type: 'MCQ',
          Difficulty: mcqDifficulty,
          Question_Text: mcqText,
          Image_URL: mcqImageUrl,
          Default_Points: mcqPoints,
          Explanation: mcqExplanation,
          Options: mcqOptions
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          setShowMCQModal(false);
          setMcqText('');
          setMcqImageUrl('');
          setMcqExplanation('');
          fetchQuestions();
        }
      })
      .catch(console.error);
  };

  const handleCreateEssay = (e: React.FormEvent) => {
    e.preventDefault();
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createQuestion',
        data: {
          Bank_ID: essayBankId,
          bankId: essayBankId,
          Topic_ID: essayTopicId,
          topicId: essayTopicId,
          Question_Type: 'ESSAY',
          Difficulty: essayDifficulty,
          Question_Text: essayText,
          Image_URL: essayImageUrl,
          Default_Points: essayPoints,
          Answer_Guide: essayGuide,
          Explanation: essayExplanation
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') {
          setShowEssayModal(false);
          setEssayText('');
          setEssayImageUrl('');
          setEssayGuide('');
          setEssayExplanation('');
          fetchQuestions();
        }
      })
      .catch(console.error);
  };

  const openRevision = (q: any) => {
    setTargetQuestion(q);
    setRevText(getQuestionText(q));
    setRevImageUrl(getQuestionImage(q));
    setRevPoints(getQuestionPoints(q) ?? 2);
    setRevGuide(getQuestionGuide(q));
    setRevExplanation(getQuestionExplanation(q));
    if (q.Question_Type === 'MCQ' && q.Options) {
      setRevOptions(q.Options.map((o: any) => ({
        Option_Key: o.Option_Key,
        Option_Text: o.Option_Text,
        Is_Correct: Boolean(o.Is_Correct)
      })));
    } else {
      setRevOptions([]);
    }
    setShowRevisionModal(true);
  };

  const handleSaveRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetQuestion) return;
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateQuestion',
        data: {
          Question_ID: targetQuestion.Question_ID,
          questionId: targetQuestion.Question_ID,
          changes: {
            Question_Text: revText,
            Image_URL: revImageUrl,
            Default_Points: revPoints,
            Answer_Guide: revGuide,
            Explanation: revExplanation,
            Options: revOptions
          },
          Question_Text: revText,
          Image_URL: revImageUrl,
          Default_Points: revPoints,
          Answer_Guide: revGuide,
          Explanation: revExplanation,
          Options: revOptions
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          setShowRevisionModal(false);
          fetchQuestions();
        }
      })
      .catch(console.error);
  };

  const handleDuplicate = (questionId: string) => {
    if (!confirm('Duplikasi soal ini menjadi soal baru?')) return;
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createQuestion',
        data: {
          Question_ID: questionId,
          questionId: questionId,
          duplicateFrom: questionId
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          fetchQuestions();
        }
      })
      .catch(console.error);
  };

  const handleArchive = (questionId: string) => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'archiveQuestion',
        data: {
          Question_ID: questionId,
          questionId: questionId
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          fetchQuestions();
        }
      })
      .catch(console.error);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Bank Soal & Versi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Penyusunan butir soal PG dan Essay dengan versioning immutable untuk menjamin konsistensi riwayat ujian.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMCQModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Buat Soal PG (MCQ)
          </button>
          <button
            onClick={() => setShowEssayModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Buat Soal Essay
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1 font-semibold text-slate-500">
          <Filter className="w-3.5 h-3.5" />
          Filter:
        </div>

        <select
          value={filterBank}
          onChange={e => setFilterBank(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Semua Bank Soal</option>
          {banks.map(b => (
            <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>
          ))}
        </select>

        <select
          value={filterTopic}
          onChange={e => setFilterTopic(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Semua Topik</option>
          {topics
            .filter(t => t.Status !== 'ARCHIVED' || filterStatus === 'ARCHIVED' || !filterStatus)
            .map(t => (
              <option key={t.Topic_ID} value={t.Topic_ID}>
                {t.Topic_Name} {t.Status === 'ARCHIVED' ? '(Arsip)' : ''}
              </option>
            ))}
        </select>

        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Semua Tipe</option>
          <option value="MCQ">Pilihan Ganda (MCQ)</option>
          <option value="ESSAY">Essay / Uraian</option>
        </select>

        <select
          value={filterDifficulty}
          onChange={e => setFilterDifficulty(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Semua Tingkat Kesulitan</option>
          <option value="EASY">Mudah (EASY)</option>
          <option value="MEDIUM">Sedang (MEDIUM)</option>
          <option value="HARD">Sulit (HARD)</option>
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white ml-auto"
        >
          <option value="ACTIVE">Aktif Saja</option>
          <option value="ARCHIVED">Diarsipkan</option>
          <option value="">Semua Status</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            Memuat daftar soal...
          </div>
        ) : questions.length > 0 ? (
          questions.map((q, idx) => (
            <div
              key={q.Question_ID}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3 hover:border-sky-300 transition"
            >
              {/* Header tags */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    #{idx + 1} • {q.Question_ID}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                    q.Question_Type === 'MCQ'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {q.Question_Type === 'MCQ' ? 'PILIHAN GANDA' : 'ESSAY'}
                  </span>
                  <span className="px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                    Versi: <strong className="text-sky-700 font-mono">v{q.Version_Number}</strong> ({q.Current_Version_ID})
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    q.Difficulty === 'EASY' ? 'text-emerald-700 bg-emerald-50' :
                    q.Difficulty === 'HARD' ? 'text-rose-700 bg-rose-50' : 'text-amber-700 bg-amber-50'
                  }`}>
                    {q.Difficulty}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{q.Bank_Name} ({q.Topic_Name})</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-600 text-xs px-2 py-1 bg-slate-50 rounded border border-slate-200">
                    Poin Default: {q.Default_Points}
                  </span>
                  <button
                    onClick={() => openRevision(q)}
                    title="Buat versi revisi baru dari soal ini"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition cursor-pointer"
                  >
                    <History className="w-3 h-3" />
                    Revisi Redaksi (v{q.Version_Number + 1})
                  </button>
                  <button
                    onClick={() => handleDuplicate(q.Question_ID)}
                    title="Duplikasi menjadi soal baru"
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleArchive(q.Question_ID)}
                    title={q.Status === 'ACTIVE' ? 'Arsipkan soal' : 'Pulihkan soal'}
                    className={`p-1 rounded transition cursor-pointer ${
                      q.Status === 'ACTIVE'
                        ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-sm text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                {q.Question_Text}
              </div>

              {/* Image if any */}
              {q.Image_URL && (
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 max-w-sm">
                  <img
                    src={q.Image_URL}
                    alt="Stimulus Soal"
                    className="max-h-44 rounded object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* MCQ Options Display */}
              {q.Question_Type === 'MCQ' && q.Options && q.Options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  {q.Options.map((opt: any) => (
                    <div
                      key={opt.Option_ID}
                      className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                        opt.Is_Correct
                          ? 'border-emerald-300 bg-emerald-50/60 font-semibold text-emerald-950'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                        opt.Is_Correct ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {opt.Option_Key}
                      </span>
                      <span className="flex-1">{opt.Option_Text}</span>
                      {opt.Is_Correct && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Essay Guide Display */}
              {q.Question_Type === 'ESSAY' && q.Answer_Guide && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5" />
                      Rubrik / Panduan Penilaian Dosen:
                    </div>
                    <p className="text-slate-700 whitespace-pre-line pl-5">
                      {q.Answer_Guide}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
            Tidak ada butir soal yang sesuai dengan kriteria filter.
          </div>
        )}
      </div>

      {/* MCQ Modal */}
      {showMCQModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <form onSubmit={handleCreateMCQ} className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-800">Buat Butir Soal Pilihan Ganda (MCQ) Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Soal</label>
                <select
                  value={mcqBankId}
                  onChange={e => setMcqBankId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topik Pembelajaran (Opsional)</label>
                <select
                  value={mcqTopicId}
                  onChange={e => setMcqTopicId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Tanpa Topik (Opsional) --</option>
                  {(() => {
                    const selBank = banks.find(b => b.Bank_ID === mcqBankId);
                    return topics
                      .filter(t => t.Status !== 'ARCHIVED' && (!selBank || !t.Course_ID || t.Course_ID === selBank.Course_ID))
                      .map(t => <option key={t.Topic_ID} value={t.Topic_ID}>{t.Topic_Name}</option>);
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kesulitan</label>
                <select
                  value={mcqDifficulty}
                  onChange={e => setMcqDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="EASY">Mudah (EASY)</option>
                  <option value="MEDIUM">Sedang (MEDIUM)</option>
                  <option value="HARD">Sulit (HARD)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Pertanyaan</label>
              <textarea
                required
                rows={3}
                value={mcqText}
                onChange={e => setMcqText(e.target.value)}
                placeholder="Tuliskan butir soal pertanyaan pilihan ganda..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar Stimulus (Opsional)</label>
                <input
                  type="url"
                  value={mcqImageUrl}
                  onChange={e => setMcqImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poin Nilai Default</label>
                <input
                  type="number"
                  min={1}
                  value={mcqPoints}
                  onChange={e => setMcqPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">Pilihan Jawaban (Pilih satu sebagai kunci jawaban benar):</label>
              {mcqOptions.map((opt, idx) => (
                <div key={opt.Option_Key} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mcq-correct"
                    checked={opt.Is_Correct}
                    onChange={() => {
                      setMcqOptions(mcqOptions.map((o, i) => ({
                        ...o,
                        Is_Correct: i === idx
                      })));
                    }}
                    className="w-4 h-4 text-sky-700"
                  />
                  <span className="w-6 font-bold text-xs text-slate-700">{opt.Option_Key}.</span>
                  <input
                    type="text"
                    required
                    value={opt.Option_Text}
                    onChange={e => {
                      const updated = [...mcqOptions];
                      updated[idx].Option_Text = e.target.value;
                      setMcqOptions(updated);
                    }}
                    placeholder={`Teks jawaban pilihan ${opt.Option_Key}`}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pembahasan / Penjelasan Kunci (Opsional)</label>
              <textarea
                rows={2}
                value={mcqExplanation}
                onChange={e => setMcqExplanation(e.target.value)}
                placeholder="Penjelasan mengapa opsi tersebut benar..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMCQModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs"
              >
                Simpan Soal PG
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Essay Modal */}
      {showEssayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <form onSubmit={handleCreateEssay} className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-800">Buat Butir Soal Essay / Uraian Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Soal</label>
                <select
                  value={essayBankId}
                  onChange={e => setEssayBankId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  {banks.map(b => <option key={b.Bank_ID} value={b.Bank_ID}>{b.Bank_Name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topik Pembelajaran (Opsional)</label>
                <select
                  value={essayTopicId}
                  onChange={e => setEssayTopicId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="">-- Tanpa Topik (Opsional) --</option>
                  {(() => {
                    const selBank = banks.find(b => b.Bank_ID === essayBankId);
                    return topics
                      .filter(t => t.Status !== 'ARCHIVED' && (!selBank || !t.Course_ID || t.Course_ID === selBank.Course_ID))
                      .map(t => <option key={t.Topic_ID} value={t.Topic_ID}>{t.Topic_Name}</option>);
                  })()}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Kesulitan</label>
                <select
                  value={essayDifficulty}
                  onChange={e => setEssayDifficulty(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="EASY">Mudah (EASY)</option>
                  <option value="MEDIUM">Sedang (MEDIUM)</option>
                  <option value="HARD">Sulit (HARD)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Pertanyaan Essay</label>
              <textarea
                required
                rows={3}
                value={essayText}
                onChange={e => setEssayText(e.target.value)}
                placeholder="Tuliskan butir soal uraian/essay..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar Stimulus (Opsional)</label>
                <input
                  type="url"
                  value={essayImageUrl}
                  onChange={e => setEssayImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poin Nilai Maksimal</label>
                <input
                  type="number"
                  min={1}
                  value={essayPoints}
                  onChange={e => setEssayPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                Panduan Jawaban & Rubrik Penilaian Dosen (Kriteria Skor):
              </label>
              <textarea
                required
                rows={4}
                value={essayGuide}
                onChange={e => setEssayGuide(e.target.value)}
                placeholder="Tuliskan poin-poin yang wajib dijawab mahasiswa beserta pembagian skornya..."
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs bg-amber-50/40"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEssayModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg cursor-pointer shadow-xs"
              >
                Simpan Soal Essay
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Revision Modal (Immutable Versioning) */}
      {showRevisionModal && targetQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <form onSubmit={handleSaveRevision} className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded uppercase">
                Immutable Versioning
              </span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">
                Revisi Redaksi Soal #{targetQuestion.Question_ID} (Membuat Versi v{targetQuestion.Version_Number + 1})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Revisi ini akan membuat <strong>Version_ID baru</strong>. Ujian lama yang sudah mengunci versi v{targetQuestion.Version_Number} tidak akan berubah atau terganggu.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teks Soal Revisi</label>
              <textarea
                required
                rows={3}
                value={revText}
                onChange={e => setRevText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Gambar</label>
                <input
                  type="url"
                  value={revImageUrl}
                  onChange={e => setRevImageUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poin</label>
                <input
                  type="number"
                  min={1}
                  value={revPoints}
                  onChange={e => setRevPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {targetQuestion.Question_Type === 'MCQ' && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700">Pilihan Jawaban Revisi:</label>
                {revOptions.map((opt, idx) => (
                  <div key={opt.Option_Key} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="rev-correct"
                      checked={opt.Is_Correct}
                      onChange={() => {
                        setRevOptions(revOptions.map((o, i) => ({
                          ...o,
                          Is_Correct: i === idx
                        })));
                      }}
                      className="w-4 h-4 text-sky-700"
                    />
                    <span className="w-6 font-bold text-xs text-slate-700">{opt.Option_Key}.</span>
                    <input
                      type="text"
                      required
                      value={opt.Option_Text}
                      onChange={e => {
                        const updated = [...revOptions];
                        updated[idx].Option_Text = e.target.value;
                        setRevOptions(updated);
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            {targetQuestion.Question_Type === 'ESSAY' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rubrik / Panduan Penilaian</label>
                <textarea
                  rows={3}
                  value={revGuide}
                  onChange={e => setRevGuide(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRevisionModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs"
              >
                Simpan Versi Baru (v{targetQuestion.Version_Number + 1})
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
