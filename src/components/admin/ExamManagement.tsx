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
  Check,
  Copy,
  Edit2,
  Trash2,
  Layers,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  X,
  BookOpen
} from 'lucide-react';
import type { ExamRunItem, CourseItem } from '../../types/index.ts';

export const ExamManagement: React.FC = () => {
  const [exams, setExams] = useState<any[]>([]);
  const [runs, setRuns] = useState<ExamRunItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [showKelolaSoalModal, setShowKelolaSoalModal] = useState(false);
  const [showCreateRunModal, setShowCreateRunModal] = useState(false);
  const [showEditRunModal, setShowEditRunModal] = useState(false);

  // Kelola Soal state
  const [kelolaTab, setKelolaTab] = useState<'assigned' | 'bank'>('assigned');
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Record<string, { points: number; selected: boolean }>>({});
  const [initialSelectedVersionIds, setInitialSelectedVersionIds] = useState<Record<string, { points: number; selected: boolean }>>({});
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [loadingModalQuestions, setLoadingModalQuestions] = useState(false);
  const [kelolaNotice, setKelolaNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null);

  // Deteksi perubahan belum disimpan di Kelola Soal
  const isSelectionDirty = React.useMemo(() => {
    if (!initialSelectedVersionIds || Object.keys(initialSelectedVersionIds).length === 0) return false;
    const curKeys = Object.keys(selectedVersionIds);
    const initKeys = Object.keys(initialSelectedVersionIds);
    if (curKeys.length !== initKeys.length) return true;
    for (const k of curKeys) {
      const cur = selectedVersionIds[k];
      const init = initialSelectedVersionIds[k];
      if (!init) return true;
      if (!!cur.selected !== !!init.selected) return true;
      if (cur.selected && cur.points !== init.points) return true;
    }
    return false;
  }, [selectedVersionIds, initialSelectedVersionIds]);

  // Tutup modal secara aman dengan konfirmasi jika ada perubahan belum disimpan
  const handleCloseKelolaSoal = () => {
    if (isSelectionDirty) {
      const confirmClose = window.confirm('Perubahan soal belum disimpan. Tutup tanpa menyimpan?');
      if (!confirmClose) return;
    }
    setShowKelolaSoalModal(false);
  };

  // Salin Access Code ke Clipboard
  const handleCopyAccessCode = (code: string, runId: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedRunId(runId);
      setTimeout(() => setCopiedRunId(null), 2500);
    });
  };

  // Filter di Kelola Soal modal
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionTypeFilter, setQuestionTypeFilter] = useState('');

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
  const [creatingExam, setCreatingExam] = useState(false);

  // Form Create Run
  const [newRunName, setNewRunName] = useState('');
  const [newRunClass, setNewRunClass] = useState('Kelas A');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [newStartAt, setNewStartAt] = useState('');
  const [newEndAt, setNewEndAt] = useState('');
  const [creatingRun, setCreatingRun] = useState(false);

  // Form Edit Run
  const [editingRun, setEditingRun] = useState<ExamRunItem | null>(null);
  const [editRunName, setEditRunName] = useState('');
  const [editRunClass, setEditRunClass] = useState('');
  const [editRunAccessCode, setEditRunAccessCode] = useState('');
  const [editRunStartAt, setEditRunStartAt] = useState('');
  const [editRunEndAt, setEditRunEndAt] = useState('');
  const [editRunStatus, setEditRunStatus] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [updatingRun, setUpdatingRun] = useState(false);

  // General notices & filters
  const [runNotice, setRunNotice] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showArchivedRuns, setShowArchivedRuns] = useState(false);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);

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
    ])
      .then(([examsRes, runsRes, coursesRes]) => {
        let loadedExams: any[] = [];
        let loadedCourses: CourseItem[] = [];

        if (coursesRes.status === 'success' || coursesRes.ok) {
          loadedCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
          setCourses(loadedCourses);
          if (loadedCourses.length > 0 && !newCourseId) {
            setNewCourseId(loadedCourses[0].Course_ID);
          }
        }

        if (examsRes.status === 'success' || examsRes.ok) {
          const rawExams = Array.isArray(examsRes.data) ? examsRes.data : [];
          // Enrich Course_Name if empty
          loadedExams = rawExams.map((e: any) => {
            const course = loadedCourses.find(c => c.Course_ID === e.Course_ID);
            return {
              ...e,
              Course_Name: e.Course_Name || course?.Course_Name || e.Course_ID
            };
          });
          setExams(loadedExams);

          // Update selected exam to latest object
          setSelectedExam((prev: any) => {
            if (prev) {
              const matched = loadedExams.find(e => e.Exam_ID === prev.Exam_ID);
              return matched || (loadedExams.length > 0 ? loadedExams[0] : null);
            }
            return loadedExams.length > 0 ? loadedExams[0] : null;
          });
        }

        if (runsRes.status === 'success' || runsRes.ok) {
          setRuns(Array.isArray(runsRes.data) ? runsRes.data : []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExamsAndRuns();
  }, []);

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // -------------------------------------------------------------
  // FITUR: KELOLA SOAL PADA UJIAN (Requirement 1: Simpan & Sinkronisasi EXAM_QUESTIONS)
  // -------------------------------------------------------------
  const openKelolaSoal = (exam: any) => {
    setSelectedExam(exam);
    setKelolaNotice(null);
    setSaveSuccessMsg(false);
    setQuestionSearch('');
    setQuestionTypeFilter('');
    setLoadingModalQuestions(true);

    // Ambil soal aktif dari Bank Soal mata kuliah tersebut DAN daftar soal aktif di EXAM_QUESTIONS
    Promise.all([
      fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'listQuestions',
          data: { courseId: exam.Course_ID, Course_ID: exam.Course_ID }
        })
      }).then(r => r.json()),
      fetch('/api/admin/backend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getExamQuestions',
          data: { Exam_ID: exam.Exam_ID, examId: exam.Exam_ID }
        })
      }).then(r => r.json())
    ])
      .then(([questionsRes, examQuestionsRes]) => {
        const bankList = (questionsRes.status === 'success' || questionsRes.ok) && Array.isArray(questionsRes.data)
          ? questionsRes.data
          : [];
        setAvailableQuestions(bankList);

        const currentEqList = (examQuestionsRes.status === 'success' || examQuestionsRes.ok) && Array.isArray(examQuestionsRes.data)
          ? examQuestionsRes.data
          : (Array.isArray(exam.questions) ? exam.questions : []);

        const initialSelection: Record<string, { points: number; selected: boolean }> = {};

        // 1. Mapping dari Bank Soal mata kuliah
        bankList.forEach((q: any) => {
          const verId = q.Current_Version_ID || q.Version_ID || q.Question_ID;
          const existing = currentEqList.find((eq: any) =>
            eq.Version_ID === verId || (eq.Question_ID && eq.Question_ID === q.Question_ID)
          );
          initialSelection[verId] = {
            points: existing ? (Number(existing.Points) || q.Default_Points || 2) : (q.Default_Points || 2),
            selected: !!existing
          };
        });

        // 2. Jika ada butir di currentEqList yang belum ada di bankList
        currentEqList.forEach((eq: any) => {
          const verId = eq.Version_ID || eq.Exam_Question_ID;
          if (verId && !initialSelection[verId]) {
            initialSelection[verId] = {
              points: Number(eq.Points) || 2,
              selected: true
            };
          }
        });

        setSelectedVersionIds(initialSelection);
        setInitialSelectedVersionIds(JSON.parse(JSON.stringify(initialSelection)));

        // Tentukan tab awal: jika sudah ada soal masuk, buka tab assigned
        const selectedCount = Object.values(initialSelection).filter(x => x.selected).length;
        if (selectedCount > 0) {
          setKelolaTab('assigned');
        } else {
          setKelolaTab('bank');
        }
        setShowKelolaSoalModal(true);
      })
      .catch(err => {
        console.error(err);
        alert('Terjadi kesalahan koneksi saat memuat soal.');
      })
      .finally(() => setLoadingModalQuestions(false));
  };

  // Simpan Soal Ujian (1 klik = 1 request ke setExamQuestions dengan seluruh daftar soal)
  const handleSaveQuestionsToExam = () => {
    if (!selectedExam) return;

    const items = Object.entries(selectedVersionIds)
      .filter(([_, v]) => (v as { points: number; selected: boolean }).selected)
      .map(([vId, v], idx) => ({
        Version_ID: vId,
        Question_Number: idx + 1,
        Points: (v as { points: number; selected: boolean }).points,
        Is_Required: true
      }));

    if (items.length === 0) {
      alert('Pilih minimal 1 butir soal dengan mencentang kotak pilihan sebelum menyimpan.');
      return;
    }

    setSavingQuestions(true);
    setKelolaNotice(null);

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setExamQuestions',
        data: {
          Exam_ID: selectedExam.Exam_ID,
          examId: selectedExam.Exam_ID,
          questions: items
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setSaveSuccessMsg(true);
          setTimeout(() => setSaveSuccessMsg(false), 3500);

          // Update initial selection snapshot agar tidak dianggap dirty
          setInitialSelectedVersionIds(JSON.parse(JSON.stringify(selectedVersionIds)));

          setKelolaNotice({
            message: `Soal ujian berhasil disimpan (${items.length} butir soal). Data tersimpan di EXAM_QUESTIONS Google Sheets.`,
            type: 'success'
          });

          // 1. Refetch data ujian dan jumlah soal dari backend agar kartu ujian terbarui
          fetchExamsAndRuns();

          // 2. Refetch EXAM_QUESTIONS untuk exam ini dan update selectedExam
          fetch('/api/admin/backend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getExamQuestions',
              data: { Exam_ID: selectedExam.Exam_ID, examId: selectedExam.Exam_ID }
            })
          })
            .then(res => res.json())
            .then(eqRes => {
              if (eqRes.status === 'success' || eqRes.ok) {
                const newQuestions = Array.isArray(eqRes.data) ? eqRes.data : items;
                setSelectedExam((prev: any) => prev ? {
                  ...prev,
                  Total_Questions: newQuestions.length,
                  questions: newQuestions
                } : null);
              }
            });

          setKelolaTab('assigned');
        } else {
          setKelolaNotice({
            message: 'Gagal menyimpan soal ujian: ' + (r.message || r.error),
            type: 'error'
          });
        }
      })
      .catch(err => {
        console.error(err);
        setKelolaNotice({ message: 'Terjadi kesalahan jaringan saat menyimpan soal.', type: 'error' });
      })
      .finally(() => setSavingQuestions(false));
  };

  // Menandai butir soal untuk dikeluarkan dari ujian (tanpa menghapus dari Bank Soal)
  // Perubahan diterapkan secara permanen saat dosen menekan "Simpan Soal Ujian"
  const handleRemoveQuestionFromExam = (versionIdToRemove: string) => {
    setSelectedVersionIds(prev => ({
      ...prev,
      [versionIdToRemove]: {
        ...prev[versionIdToRemove],
        selected: false
      }
    }));
  };

  // Publish exam
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

  // Buat Blueprint Ujian Baru
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim() || !newCourseId) return;

    setCreatingExam(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createExam',
        data: {
          Exam_Name: newExamName.trim(),
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
        } else {
          alert('Gagal membuat blueprint ujian: ' + (r.message || r.error));
        }
      })
      .catch(console.error)
      .finally(() => setCreatingExam(false));
  };

  // -------------------------------------------------------------
  // FITUR: JANGAN IZINKAN MEMBUAT SESI DARI UJIAN KOSONG (Req D & Req 2)
  // -------------------------------------------------------------
  const handleOpenCreateRunModal = () => {
    if (!selectedExam) return;
    const qCount = Number(selectedExam.Total_Questions) || (selectedExam.questions?.length) || 0;
    if (qCount === 0) {
      alert('Ujian belum memiliki soal. Tambahkan soal terlebih dahulu melalui Kelola Soal.');
      return;
    }

    const now = new Date();
    const in4Hours = new Date(now.getTime() + 4 * 3600 * 1000);

    // Format YYYY-MM-DDTHH:mm untuk input type="datetime-local"
    const toLocalISO = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    const acronym = selectedExam.Exam_Name
      ? selectedExam.Exam_Name.split(/\s+/).map((w: string) => w[0]).join('').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5)
      : 'EXAM';
    const suggestedCode = `${acronym || 'SESI'}${Math.floor(100 + Math.random() * 900)}`;

    setNewRunName(`${selectedExam.Exam_Name} – Kelas A`);
    setNewRunClass('Kelas A');
    setNewAccessCode(suggestedCode);
    setNewStartAt(toLocalISO(now));
    setNewEndAt(toLocalISO(in4Hours));
    setShowCreateRunModal(true);
  };

  const handleCreateRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;

    // Double check: cegah jika ujian belum memiliki butir soal
    const qCount = Number(selectedExam.Total_Questions) || (selectedExam.questions?.length) || 0;
    if (qCount === 0) {
      alert('Ujian belum memiliki soal. Tambahkan soal terlebih dahulu melalui Kelola Soal.');
      return;
    }

    if (!newRunClass.trim()) {
      alert('Nama Kelas target wajib diisi.');
      return;
    }

    let accessCode = newAccessCode.trim().toUpperCase();
    if (!accessCode) {
      const acronym = selectedExam.Exam_Name
        ? selectedExam.Exam_Name.split(/\s+/).map((w: string) => w[0]).join('').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5)
        : 'EXAM';
      accessCode = `${acronym || 'SESI'}${Math.floor(100 + Math.random() * 900)}`;
    }

    const startDate = newStartAt ? new Date(newStartAt).toISOString() : new Date().toISOString();
    const endDate = newEndAt ? new Date(newEndAt).toISOString() : new Date(Date.now() + 4 * 3600 * 1000).toISOString();

    setCreatingRun(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createRun',
        data: {
          Exam_ID: selectedExam.Exam_ID,
          examId: selectedExam.Exam_ID,
          Run_Name: newRunName.trim() || `${selectedExam.Exam_Name} – ${newRunClass.trim()}`,
          Class_Name: newRunClass.trim() || 'Kelas A',
          Access_Code: accessCode,
          Start_At: startDate,
          End_At: endDate,
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
          setRunNotice({
            message: `Sesi ujian "${r.data?.Run_Name || newRunName}" berhasil dibuat dan tersimpan di EXAM_RUNS Google Sheets. Access Code: ${r.data?.Access_Code || accessCode}`,
            type: 'success'
          });
          setTimeout(() => setRunNotice(null), 6000);
          fetchExamsAndRuns();
        } else {
          alert('Gagal membuka sesi ujian: ' + (r.message || r.error));
        }
      })
      .catch(err => {
        console.error(err);
        alert('Terjadi kesalahan koneksi saat membuka sesi ujian.');
      })
      .finally(() => setCreatingRun(false));
  };

  // -------------------------------------------------------------
  // FITUR: EDIT & HAPUS SESI UJIAN (Requirement E)
  // -------------------------------------------------------------
  const handleOpenEditRun = (run: ExamRunItem) => {
    setEditingRun(run);
    setEditRunName(run.Run_Name);
    setEditRunClass(run.Class_Name);
    setEditRunAccessCode(run.Access_Code);
    setEditRunStartAt(run.Start_At ? run.Start_At.slice(0, 16) : '');
    setEditRunEndAt(run.End_At ? run.End_At.slice(0, 16) : '');
    setEditRunStatus((run.Status as any) === 'CLOSED' ? 'CLOSED' : 'OPEN');
    setShowEditRunModal(true);
  };

  const handleSaveEditRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRun) return;

    setUpdatingRun(true);
    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateRun',
        data: {
          Run_ID: editingRun.Run_ID,
          runId: editingRun.Run_ID,
          Run_Name: editRunName.trim(),
          Class_Name: editRunClass.trim(),
          Access_Code: editRunAccessCode.trim().toUpperCase(),
          Start_At: editRunStartAt ? new Date(editRunStartAt).toISOString() : editingRun.Start_At,
          End_At: editRunEndAt ? new Date(editRunEndAt).toISOString() : editingRun.End_At,
          Status: editRunStatus
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setShowEditRunModal(false);
          setEditingRun(null);
          setRunNotice({ message: 'Sesi ujian berhasil diperbarui.', type: 'success' });
          setTimeout(() => setRunNotice(null), 4000);
          fetchExamsAndRuns();
        } else {
          alert('Gagal memperbarui sesi ujian: ' + (r.message || r.error));
        }
      })
      .catch(console.error)
      .finally(() => setUpdatingRun(false));
  };

  // Hapus Sesi: selalu memeriksa ATTEMPTS sebelum melakukan hard delete
  const handleDeleteRun = (run: ExamRunItem) => {
    const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus sesi ujian "${run.Run_Name}"?`);
    if (!isConfirmed) return;

    setDeletingRunId(run.Run_ID);
    setRunNotice(null);

    fetch('/api/admin/backend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteRun',
        data: {
          Run_ID: run.Run_ID,
          runId: run.Run_ID
        }
      })
    })
      .then(r => r.json())
      .then(r => {
        if (r.status === 'success' || r.ok) {
          setRunNotice({
            message: r.message || 'Sesi ujian berhasil diproses.',
            type: r.hasAttempts ? 'info' : 'success'
          });
          setTimeout(() => setRunNotice(null), 5000);
          fetchExamsAndRuns();
        } else {
          alert('Gagal menghapus sesi: ' + (r.message || r.error));
        }
      })
      .catch(err => {
        console.error(err);
        alert('Terjadi kesalahan jaringan saat menghapus sesi.');
      })
      .finally(() => setDeletingRunId(null));
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
        if (r.status === 'success' || r.ok) {
          fetchExamsAndRuns();
        }
      });
  };

  // Filter runs untuk ujian yang dipilih
  const allRunsForSelectedExam = selectedExam ? runs.filter(r => r.Exam_ID === selectedExam.Exam_ID) : runs;
  const filteredRuns = showArchivedRuns
    ? allRunsForSelectedExam
    : allRunsForSelectedExam.filter(r => r.Status !== 'CANCELLED' && r.Status !== 'ARCHIVED' && (r as any).Data_Status !== 'DELETED');

  // Filter available questions di Kelola Soal modal
  const assignedVersionIds = Object.entries(selectedVersionIds)
    .filter(([_, v]) => (v as { points: number; selected: boolean }).selected)
    .map(([vId]) => vId);

  const assignedQuestionsList = availableQuestions.filter(q => {
    const vId = q.Current_Version_ID || q.Version_ID || q.Question_ID;
    return assignedVersionIds.includes(vId);
  });

  const searchableBankQuestions = availableQuestions.filter(q => {
    if (questionTypeFilter && q.Question_Type !== questionTypeFilter) return false;
    if (questionSearch) {
      const search = questionSearch.toLowerCase();
      const txt = (q.Question_Text || '').toLowerCase();
      const topic = (q.Topic_Name || '').toLowerCase();
      const bnk = (q.Bank_Name || '').toLowerCase();
      if (!txt.includes(search) && !topic.includes(search) && !bnk.includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Manajemen Blueprint & Sesi Ujian</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Penyusunan blueprint ujian, pengelolaan butir soal (EXAM_QUESTIONS), dan aktivasi sesi kelas (EXAM_RUNS).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchExamsAndRuns}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
            title="Segarkan dari Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            onClick={() => setShowCreateExamModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Buat Blueprint Ujian Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Exam Blueprint List (Left) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Daftar Ujian ({exams.length})</span>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-800" />}
            </h2>
            <div className="space-y-2.5">
              {exams.length === 0 && !loading && (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                  Belum ada ujian. Klik &ldquo;Buat Blueprint Ujian Baru&rdquo; untuk memulai.
                </div>
              )}
              {exams.map(e => {
                const isSelected = selectedExam?.Exam_ID === e.Exam_ID;
                const totalQ = Number(e.Total_Questions) || (e.questions?.length) || 0;
                return (
                  <div
                    key={e.Exam_ID}
                    onClick={() => setSelectedExam(e)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
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
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>{e.Course_Name}</span>
                    </div>

                    {/* Menampilkan Jumlah Soal secara jelas (Req C.13) */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs text-slate-600">
                      <span className={`font-semibold ${totalQ === 0 ? 'text-amber-700' : 'text-sky-800'}`}>
                        {totalQ} Soal {e.Total_Points ? `(${e.Total_Points} Poin)` : ''}
                      </span>
                      <span>{e.Duration_Minutes} Menit</span>
                    </div>

                    {/* Tombol Cepat: Kelola Soal */}
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openKelolaSoal(e);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 hover:text-sky-950 bg-white hover:bg-sky-50 px-2 py-1 rounded border border-sky-300 transition cursor-pointer shadow-2xs"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Kelola Soal</span>
                      </button>
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
                    {/* Tombol Kelola Soal (Req C) */}
                    <button
                      onClick={() => openKelolaSoal(selectedExam)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-800 text-white hover:bg-sky-900 text-xs font-semibold transition cursor-pointer shadow-xs"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Kelola Soal ({Number(selectedExam.Total_Questions) || selectedExam.questions?.length || 0})</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="block text-[11px] text-slate-400">Total Soal</span>
                    <strong className="text-sky-800 font-mono text-sm">
                      {Number(selectedExam.Total_Questions) || selectedExam.questions?.length || 0} Butir
                    </strong>
                  </div>
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
                </div>
              </div>

              {/* Sesi Ujian (Exam Runs) List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <PlayCircle className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-sm font-bold text-slate-800">
                      Sesi Ujian ({filteredRuns.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowArchivedRuns(!showArchivedRuns)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                        showArchivedRuns
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {showArchivedRuns ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showArchivedRuns ? 'Sembunyikan Batal/Arsip' : 'Lihat Sesi Dibatalkan'}</span>
                    </button>
                    {/* Buka Sesi Ujian Baru (Dengan Validasi Ujian Kosong Req D) */}
                    <button
                      onClick={handleOpenCreateRunModal}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Buka Sesi Ujian Baru
                    </button>
                  </div>
                </div>

                {/* Sesi Action Notice */}
                {runNotice && (
                  <div className={`px-5 py-2.5 text-xs font-medium flex items-center justify-between ${
                    runNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' :
                    runNotice.type === 'error' ? 'bg-rose-50 text-rose-800 border-b border-rose-100' :
                    'bg-sky-50 text-sky-800 border-b border-sky-100'
                  }`}>
                    <span>{runNotice.message}</span>
                    <button onClick={() => setRunNotice(null)} className="text-xs font-bold px-1.5">✕</button>
                  </div>
                )}

                {/* Daftar Sesi: Menampilkan Hubungan Sesi dengan Ujian Secara Jelas (Req F) */}
                <div className="divide-y divide-slate-100">
                  {filteredRuns.length > 0 ? (
                    filteredRuns.map(run => {
                      const isCancelled = run.Status === 'CANCELLED' || run.Status === 'ARCHIVED';
                      const examTotalQ = Number(selectedExam.Total_Questions) || selectedExam.questions?.length || 0;

                      return (
                        <div key={run.Run_ID} className={`p-4 space-y-3 transition ${isCancelled ? 'bg-slate-50/60 opacity-80' : 'hover:bg-slate-50/70'}`}>
                          {/* Sesi Header (Req 2) */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {selectedExam.Exam_Name} – <span className="text-sky-900">{run.Class_Name}</span>
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                run.Status === 'OPEN'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isCancelled
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-slate-200 text-slate-700 border border-slate-300'
                              }`}>
                                Status: {run.Status}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">({run.Run_Name})</span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">ID: {run.Run_ID}</span>
                          </div>

                          {/* Hubungan Ujian & Informasi Sesi Lengkap */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <span className="text-slate-500 font-bold text-xs shrink-0">Access Code:</span>
                              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-md">
                                <strong className="font-mono text-emerald-950 font-bold text-sm tracking-wider">
                                  {run.Access_Code}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => handleCopyAccessCode(run.Access_Code, run.Run_ID)}
                                  className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-100/70 border border-emerald-300 rounded cursor-pointer transition shadow-2xs"
                                  title="Salin Access Code"
                                >
                                  {copiedRunId === run.Run_ID ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-700" />
                                      <span className="font-bold text-emerald-800">Tersalin!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-emerald-700" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Kelas</span>
                              <strong className="text-slate-800 font-medium block">{run.Class_Name}</strong>
                            </div>

                            <div>
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Jumlah Soal</span>
                              <strong className="text-sky-800 font-bold block">{examTotalQ} Soal</strong>
                            </div>

                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Waktu Sesi</span>
                              <span className="text-slate-700 block text-xs font-medium">
                                {formatDate(run.Start_At)} s/d {formatDate(run.End_At)}
                              </span>
                            </div>

                            <div className="sm:col-span-2">
                              <span className="text-slate-400 block text-[10px] font-semibold uppercase">Syarat Login Mahasiswa</span>
                              <span className="text-slate-500 block text-[11px]">
                                Ujian PUBLISHED • Sesi OPEN • Waktu Sesi Aktif • Kelas: <strong>{run.Class_Name}</strong> • Access Code: <strong>{run.Access_Code}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Tombol Aksi Sesi: Edit, Status, Hapus Sesi (Req E) */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="text-[11px] text-slate-500">
                              Batas Akhir: {formatDate(run.End_At)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Tombol Toggle Status OPEN / CLOSED */}
                              {!isCancelled && (
                                <>
                                  {run.Status === 'OPEN' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRunStatus(run.Run_ID, 'CLOSED')}
                                      className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition cursor-pointer"
                                    >
                                      Tutup Sesi
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateRunStatus(run.Run_ID, 'OPEN')}
                                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition cursor-pointer"
                                    >
                                      Buka Sesi
                                    </button>
                                  )}

                                  {/* Tombol Edit Sesi (Req E) */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRun(run)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                </>
                              )}

                              {/* Tombol Hapus Sesi (Req E) */}
                              <button
                                type="button"
                                disabled={deletingRunId === run.Run_ID}
                                onClick={() => handleDeleteRun(run)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer disabled:opacity-50"
                              >
                                {deletingRunId === run.Run_ID ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                                <span>Hapus Sesi</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-500">
                      {allRunsForSelectedExam.length > 0 && !showArchivedRuns
                        ? 'Sesi ujian saat ini dalam status diarsipkan/dibatalkan. Klik "Lihat Sesi Dibatalkan" untuk melihatnya.'
                        : 'Belum ada sesi ujian untuk ujian ini. Klik "Buka Sesi Ujian Baru" di atas.'}
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

      {/* ============================================================= */}
      {/* MODAL: KELOLA SOAL UJIAN (Requirement 1 & C)                  */}
      {/* ============================================================= */}
      {showKelolaSoalModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-sky-800" />
                  <span>Kelola Soal Ujian: {selectedExam.Exam_Name}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mata Kuliah: <strong>{selectedExam.Course_Name}</strong> • Alur: Bank Soal → Soal Versi Terkunci → EXAM_QUESTIONS
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseKelolaSoal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notice in modal */}
            {kelolaNotice && (
              <div className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
                kelolaNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                kelolaNotice.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                'bg-sky-50 text-sky-800 border border-sky-200'
              }`}>
                <span>{kelolaNotice.message}</span>
                <button onClick={() => setKelolaNotice(null)} className="text-xs font-bold px-1.5">✕</button>
              </div>
            )}

            {/* Tab Selector */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setKelolaTab('assigned')}
                className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                  kelolaTab === 'assigned'
                    ? 'border-sky-800 text-sky-800 bg-sky-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Soal yang Sudah Masuk ke Ujian ({assignedQuestionsList.length})
              </button>
              <button
                type="button"
                onClick={() => setKelolaTab('bank')}
                className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                  kelolaTab === 'bank'
                    ? 'border-sky-800 text-sky-800 bg-sky-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Pilih dari Bank Soal ({availableQuestions.length})
              </button>
            </div>

            {loadingModalQuestions ? (
              <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-800 mx-auto" />
                <p>Memuat butir soal dan data EXAM_QUESTIONS...</p>
              </div>
            ) : (
              <>
                {/* TAB 1: DAFTAR SOAL YANG SUDAH MASUK KE UJIAN */}
                {kelolaTab === 'assigned' && (
                  <div className="space-y-3">
                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 pr-1">
                      {assignedQuestionsList.length > 0 ? (
                        assignedQuestionsList.map((q, idx) => {
                          const verId = q.Current_Version_ID || q.Version_ID || q.Question_ID;
                          const pts = selectedVersionIds[verId]?.points ?? q.Default_Points ?? 2;

                          return (
                            <div key={q.Question_ID} className="p-3.5 flex flex-wrap items-start justify-between gap-3 hover:bg-slate-50/80 rounded-lg transition">
                              <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                                <span className="font-bold text-slate-700 font-mono text-xs mt-0.5 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                                  #{idx + 1}
                                </span>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      q.Question_Type === 'MCQ' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {q.Question_Type === 'MCQ' ? 'PILIHAN GANDA' : 'ESSAY'}
                                    </span>
                                    {q.Topic_Name && (
                                      <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                        Topik: {q.Topic_Name}
                                      </span>
                                    )}
                                    <span className="text-slate-400 font-mono text-[10px]">v{q.Version_Number || 1}</span>
                                  </div>
                                  <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">{q.Question_Text}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-xs text-right">
                                  <span className="text-[10px] text-slate-400 block font-semibold">Bobot Poin</span>
                                  <strong className="text-sky-800 font-mono text-sm">{pts} Poin</strong>
                                </div>
                                <button
                                  type="button"
                                  disabled={savingQuestions}
                                  onClick={() => handleRemoveQuestionFromExam(verId)}
                                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer shadow-2xs disabled:opacity-50"
                                  title="Tandai untuk dikeluarkan dari ujian (perlu klik Simpan Soal Ujian)"
                                >
                                  Keluarkan
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                          <p>Ujian ini belum memiliki soal di EXAM_QUESTIONS.</p>
                          <button
                            type="button"
                            onClick={() => setKelolaTab('bank')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Buka Tab Bank Soal</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                      <span>Total Soal Aktif di Ujian: <strong>{assignedQuestionsList.length} Butir</strong></span>
                      <button
                        type="button"
                        onClick={() => setKelolaTab('bank')}
                        className="inline-flex items-center gap-1 text-sky-800 hover:text-sky-950 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Pilih Soal Lain dari Bank</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: PILIH DARI BANK SOAL */}
                {kelolaTab === 'bank' && (
                  <div className="space-y-3">
                    {/* Filter and Search */}
                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 rounded-lg text-xs">
                      <input
                        type="text"
                        value={questionSearch}
                        onChange={e => setQuestionSearch(e.target.value)}
                        placeholder="Cari teks soal / topik..."
                        className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white flex-1 min-w-[180px]"
                      />
                      <select
                        value={questionTypeFilter}
                        onChange={e => setQuestionTypeFilter(e.target.value)}
                        className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">Semua Tipe (MCQ & Essay)</option>
                        <option value="MCQ">Pilihan Ganda (MCQ)</option>
                        <option value="ESSAY">Essay / Uraian</option>
                      </select>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 pr-1">
                      {searchableBankQuestions.length > 0 ? (
                        searchableBankQuestions.map((q, idx) => {
                          const verId = q.Current_Version_ID || q.Version_ID || q.Question_ID;
                          const isChecked = selectedVersionIds[verId]?.selected ?? false;
                          const pts = selectedVersionIds[verId]?.points ?? (q.Default_Points || 2);

                          return (
                            <div
                              key={q.Question_ID}
                              className={`p-3 flex items-start gap-3 rounded-lg transition ${
                                isChecked ? 'bg-sky-50/70 border border-sky-200' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  setSelectedVersionIds(prev => ({
                                    ...prev,
                                    [verId]: {
                                      points: pts,
                                      selected: e.target.checked
                                    }
                                  }));
                                }}
                                className="w-4 h-4 mt-1 text-sky-700 rounded cursor-pointer accent-sky-800"
                              />
                              <div className="flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <span className="font-bold text-slate-700">#{idx + 1}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    q.Question_Type === 'MCQ' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {q.Question_Type === 'MCQ' ? 'MCQ' : 'ESSAY'}
                                  </span>
                                  <span className="text-slate-500 font-mono text-[10px]">v{q.Version_Number || 1}</span>
                                  {q.Topic_Name && (
                                    <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                      {q.Topic_Name}
                                    </span>
                                  )}
                                  {isChecked && (
                                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-emerald-200">
                                      ✓ Terpilih untuk Ujian
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">{q.Question_Text}</p>
                              </div>
                              <div className="w-24 shrink-0">
                                <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">Poin</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={pts}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setSelectedVersionIds(prev => ({
                                      ...prev,
                                      [verId]: {
                                        points: val,
                                        selected: isChecked
                                      }
                                    }));
                                  }}
                                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-center font-bold font-mono"
                                />
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-12 text-center text-xs text-slate-500">
                          Tidak ada butir soal yang sesuai pada Bank Soal mata kuliah ini.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* UNIFIED PERSISTENT MODAL FOOTER (Requirement 1) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 mt-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-semibold text-slate-700">
                  Total Terpilih: <strong className="text-sky-900 text-sm font-mono">{Object.values(selectedVersionIds).filter((x: any) => x.selected).length}</strong> Butir Soal
                </span>
                {isSelectionDirty && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                    Perubahan belum disimpan
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseKelolaSoal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition shadow-2xs"
                >
                  Tutup
                </button>
                {/* Tombol Utama: Simpan Soal Ujian (Req 1: 1 klik = 1 request ke setExamQuestions) */}
                <button
                  type="button"
                  disabled={savingQuestions}
                  onClick={handleSaveQuestionsToExam}
                  className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-lg cursor-pointer shadow-md transition disabled:opacity-50 ${
                    saveSuccessMsg
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-sky-800 hover:bg-sky-900 active:scale-[0.98]'
                  }`}
                >
                  {savingQuestions ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : saveSuccessMsg ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Soal ujian berhasil disimpan.</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Simpan Soal Ujian</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: BUAT BLUEPRINT UJIAN BARU                              */}
      {/* ============================================================= */}
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
                disabled={creatingExam}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                {creatingExam && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Blueprint</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: BUKA SESI UJIAN BARU (EXAM_RUNS)                        */}
      {/* ============================================================= */}
      {showCreateRunModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleCreateRun} className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Buka Sesi Ujian Baru</h3>
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-xs space-y-0.5">
              <div className="font-bold text-sky-950">Ujian: {selectedExam.Exam_Name}</div>
              <div className="text-sky-800">Mata Kuliah: {selectedExam.Course_Name}</div>
              <div className="text-sky-800 font-semibold">
                Jumlah Soal: {Number(selectedExam.Total_Questions) || selectedExam.questions?.length || 0} Butir
              </div>
            </div>

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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kelas / Rombel Target</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Mulai</label>
                <input
                  type="datetime-local"
                  value={newStartAt}
                  onChange={e => setNewStartAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Selesai</label>
                <input
                  type="datetime-local"
                  value={newEndAt}
                  onChange={e => setNewEndAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
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
                disabled={creatingRun}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                {creatingRun && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Buka Sesi Ujian Sekarang</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: EDIT SESI UJIAN (Requirement E)                         */}
      {/* ============================================================= */}
      {showEditRunModal && editingRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form onSubmit={handleSaveEditRun} className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Edit Sesi Ujian</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sesi Ujian</label>
              <input
                type="text"
                required
                value={editRunName}
                onChange={e => setEditRunName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas / Rombel</label>
              <input
                type="text"
                required
                value={editRunClass}
                onChange={e => setEditRunClass(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Akses Mahasiswa</label>
              <input
                type="text"
                required
                value={editRunAccessCode}
                onChange={e => setEditRunAccessCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono uppercase"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Mulai</label>
                <input
                  type="datetime-local"
                  value={editRunStartAt}
                  onChange={e => setEditRunStartAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Waktu Selesai</label>
                <input
                  type="datetime-local"
                  value={editRunEndAt}
                  onChange={e => setEditRunEndAt(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status Sesi</label>
              <select
                value={editRunStatus}
                onChange={e => setEditRunStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="OPEN">OPEN (Sesi Terbuka / Mahasiswa Dapat Mengerjakan)</option>
                <option value="CLOSED">CLOSED (Sesi Ditutup)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowEditRunModal(false);
                  setEditingRun(null);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={updatingRun}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-800 hover:bg-sky-900 rounded-lg cursor-pointer shadow-xs disabled:opacity-50"
              >
                {updatingRun && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Perubahan Sesi</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
