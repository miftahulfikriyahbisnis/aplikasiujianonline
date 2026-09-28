import React, { useState, useEffect } from 'react';
import { BookOpen, FolderTree, Library, Plus, Search, CheckCircle2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import type { CourseItem, TopicItem, QuestionBankItem } from '../../types/index.ts';

export const CoursesManagement: React.FC = () => {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseItem | null>(null);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [banks, setBanks] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [submittingCourse, setSubmittingCourse] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicOrder, setNewTopicOrder] = useState<number>(1);

  const [newBankName, setNewBankName] = useState('');
  const [newBankDesc, setNewBankDesc] = useState('');

  const fetchCourses = () => {
    setLoading(true);
    setError(null);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listCourses',
        data: {}
      })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server status ${res.status}`);
        }
        return res.json();
      })
      .then(res => {
        if (res.status === 'success' || res.ok) {
          const list = Array.isArray(res.data) ? res.data : [];
          setCourses(list);
          if (list.length > 0) {
            // Keep selected or pick first from database
            setSelectedCourse(prev => {
              if (prev) {
                const found = list.find((c: CourseItem) => c.Course_ID === prev.Course_ID);
                return found || list[0];
              }
              return list[0];
            });
          } else {
            setSelectedCourse(null);
          }
        } else {
          setError(res.message || 'Gagal memuat mata kuliah dari database Google Sheets.');
        }
      })
      .catch(err => {
        console.error('Fetch courses error:', err);
        setError(err.message || 'Gagal terhubung ke database Google Sheets');
      })
      .finally(() => setLoading(false));
  };

  const fetchCourseDetails = (courseId: string) => {
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listTopics',
        data: { courseId, Course_ID: courseId }
      })
    })
      .then(res => res.json())
      .then(res => { if (res.status === 'success' || res.ok) setTopics(Array.isArray(res.data) ? res.data : []); })
      .catch(console.error);

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listQuestionBanks',
        data: { courseId, Course_ID: courseId }
      })
    })
      .then(res => res.json())
      .then(res => { if (res.status === 'success' || res.ok) setBanks(Array.isArray(res.data) ? res.data : []); })
      .catch(console.error);
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchCourseDetails(selectedCourse.Course_ID);
    }
  }, [selectedCourse]);

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode || !newCourseName) return;
    setSubmittingCourse(true);
    setModalError(null);

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createCourse',
        data: {
          Course_Code: newCourseCode.trim(),
          Course_Name: newCourseName.trim(),
          Description: newCourseDesc.trim()
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          // Tutup modal dan bersihkan form
          setShowCourseModal(false);
          setNewCourseCode('');
          setNewCourseName('');
          setNewCourseDesc('');
          // MANDAT UTAMA: jangan hanya menambahkan course ke React state; panggil listCourses lagi; render ulang dari hasil Google Sheets
          fetchCourses();
        } else {
          setModalError(res.message || res.error || 'Gagal menambahkan mata kuliah ke Google Sheets.');
        }
      })
      .catch(err => {
        console.error(err);
        setModalError(err.message || 'Terjadi kesalahan jaringan saat menyimpan ke Google Sheets.');
      })
      .finally(() => {
        setSubmittingCourse(false);
      });
  };

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newTopicName) return;
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createTopic',
        data: {
          Course_ID: selectedCourse.Course_ID,
          courseId: selectedCourse.Course_ID,
          Topic_Name: newTopicName,
          Description: newTopicDesc,
          Sort_Order: newTopicOrder
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          if (selectedCourse) {
            fetchCourseDetails(selectedCourse.Course_ID);
          }
          setShowTopicModal(false);
          setNewTopicName('');
          setNewTopicDesc('');
        }
      })
      .catch(console.error);
  };

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newBankName) return;
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createQuestionBank',
        data: {
          Course_ID: selectedCourse.Course_ID,
          courseId: selectedCourse.Course_ID,
          Bank_Name: newBankName,
          Description: newBankDesc
        }
      })
    })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success' || res.ok) {
          if (selectedCourse) {
            fetchCourseDetails(selectedCourse.Course_ID);
          }
          setShowBankModal(false);
          setNewBankName('');
          setNewBankDesc('');
        }
      })
      .catch(console.error);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mata Kuliah, Topik & Bank Soal</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola struktur kurikulum mata kuliah, pembagian topik/materi, dan wadah bank soal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchCourses}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Muat ulang dari Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
          <button
            onClick={() => {
              setModalError(null);
              setShowCourseModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Tambah Mata Kuliah
          </button>
        </div>
      </div>

      {/* Database Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold text-xs">Gagal Mengambil Data dari Google Sheets</div>
              <div className="text-xs text-rose-700">{error}</div>
            </div>
          </div>
          <button
            onClick={fetchCourses}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Main Grid: Left Courses List, Right Topics & Banks */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Course Sidebar */}
        <div className="md:col-span-4 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Daftar Mata Kuliah ({courses.length})</span>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-800" />}
            </h2>
            <div className="space-y-2">
              {courses.length === 0 && !loading && (
                <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  Belum ada mata kuliah di sheet COURSES. Klik &ldquo;Tambah Mata Kuliah&rdquo; untuk menambahkan.
                </div>
              )}
              {courses.map(c => {
                const isSelected = selectedCourse?.Course_ID === c.Course_ID;
                return (
                  <button
                    key={c.Course_ID}
                    onClick={() => setSelectedCourse(c)}
                    className={`w-full text-left p-3 rounded-lg border transition cursor-pointer flex flex-col gap-1 ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white text-sky-800 border border-sky-200">
                        {c.Course_Code}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {c.Status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-800 text-sm mt-1">{c.Course_Name}</div>
                    {c.Description && (
                      <div className="text-xs text-slate-500 line-clamp-1">{c.Description}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Course Details (Topics + Banks) */}
        <div className="md:col-span-8 space-y-6">
          {selectedCourse ? (
            <>
              {/* Selected Course Banner */}
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono font-bold text-sky-700 uppercase">
                    {selectedCourse.Course_ID} • {selectedCourse.Course_Code}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mt-0.5">{selectedCourse.Course_Name}</h2>
                  <p className="text-xs text-slate-500 mt-1">{selectedCourse.Description || 'Tidak ada keterangan tambahan.'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTopicModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Topik
                  </button>
                  <button
                    onClick={() => setShowBankModal(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah Bank Soal
                  </button>
                </div>
              </div>

              {/* Topics Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-sky-700" />
                    <h3 className="text-sm font-bold text-slate-800">Daftar Topik / Materi Pembelajaran ({topics.length})</h3>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {topics.length > 0 ? (
                    topics.map(t => (
                      <div key={t.Topic_ID} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-400">#{t.Sort_Order}</span>
                            <span className="text-sm font-semibold text-slate-800">{t.Topic_Name}</span>
                          </div>
                          {t.Description && <p className="text-xs text-slate-500 mt-0.5">{t.Description}</p>}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {t.Topic_ID}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Belum ada topik untuk mata kuliah ini. Klik "Tambah Topik" di atas.
                    </div>
                  )}
                </div>
              </div>

              {/* Question Banks Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-indigo-700" />
                    <h3 className="text-sm font-bold text-slate-800">Daftar Bank Soal ({banks.length})</h3>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {banks.length > 0 ? (
                    banks.map(b => (
                      <div key={b.Bank_ID} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                        <div>
                          <span className="text-sm font-semibold text-slate-800">{b.Bank_Name}</span>
                          {b.Description && <p className="text-xs text-slate-500 mt-0.5">{b.Description}</p>}
                        </div>
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {b.Bank_ID}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Belum ada bank soal untuk mata kuliah ini. Klik "Tambah Bank Soal" di atas.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200">
              Pilih mata kuliah di sebelah kiri untuk melihat rincian topik dan bank soal.
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleCreateCourse} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Tambah Mata Kuliah Baru</h3>
              <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Google Sheets
              </span>
            </div>

            {modalError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Gagal Menyimpan:</div>
                  <div>{modalError}</div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Mata Kuliah (misal: MT2, BIOKIM)</label>
              <input
                type="text"
                required
                disabled={submittingCourse}
                value={newCourseCode}
                onChange={e => setNewCourseCode(e.target.value.toUpperCase())}
                placeholder="MT2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Mata Kuliah</label>
              <input
                type="text"
                required
                disabled={submittingCourse}
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                placeholder="MT Microteaching 2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Mata Kuliah (Opsional)</label>
              <textarea
                disabled={submittingCourse}
                value={newCourseDesc}
                onChange={e => setNewCourseDesc(e.target.value)}
                rows={2}
                placeholder="Deskripsi atau keterangan mata kuliah..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:bg-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={submittingCourse}
                onClick={() => setShowCourseModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submittingCourse}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer disabled:opacity-50"
              >
                {submittingCourse && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{submittingCourse ? 'Menyimpan ke Google Sheets...' : 'Simpan Mata Kuliah'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleCreateTopic} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Tambah Topik Pembelajaran</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Topik / Materi</label>
              <input
                type="text"
                required
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                placeholder="Kinetika Enzim"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Urutan (Sort Order)</label>
              <input
                type="number"
                value={newTopicOrder}
                onChange={e => setNewTopicOrder(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                value={newTopicDesc}
                onChange={e => setNewTopicDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTopicModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer"
              >
                Simpan Topik
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bank Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleCreateBank} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Tambah Bank Soal Baru</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank Soal</label>
              <input
                type="text"
                required
                value={newBankName}
                onChange={e => setNewBankName(e.target.value)}
                placeholder="Bank Soal UTS Biokimia 2026"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                value={newBankDesc}
                onChange={e => setNewBankDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-800 hover:bg-indigo-900 rounded-lg cursor-pointer"
              >
                Simpan Bank Soal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
