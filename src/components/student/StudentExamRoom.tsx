import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Check,
  RotateCcw,
  CloudCheck,
  Send
} from 'lucide-react';

interface StudentExamRoomProps {
  examData: {
    token?: string;
    attempt: any;
    exam: any;
    student: any;
    questions: any[];
  };
  onExamFinished: () => void;
}

export const StudentExamRoom: React.FC<StudentExamRoomProps> = ({ examData, onExamFinished }) => {
  const { exam, student, questions: initialQuestions } = examData;
  const token = examData.token || sessionStorage.getItem('student_token') || localStorage.getItem('student_token') || '';
  const [attempt, setAttempt] = useState(examData.attempt);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState(initialQuestions);

  // Answers map: Exam_Question_ID -> { selectedOptionId, answerText, isFlagged }
  // Primary cache is localStorage, synced with backend
  const [answers, setAnswers] = useState<Record<string, { selectedOptionId?: string; answerText?: string; isFlagged?: boolean }>>(() => {
    const cacheKey = `exam_cache_${examData.attempt?.Attempt_ID}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      }
    } catch (e) {}

    const map: Record<string, { selectedOptionId?: string; answerText?: string; isFlagged?: boolean }> = {};
    initialQuestions.forEach(q => {
      map[q.Exam_Question_ID] = {
        selectedOptionId: q.Selected_Option_ID || undefined,
        answerText: q.Answer_Text || '',
        isFlagged: Boolean(q.Is_Flagged)
      };
    });
    return map;
  });

  // Autosave status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const saveTimeoutRef = useRef<any>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Anti-cheat & Alarm State
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState<number>(attempt.Violation_Count || 0);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const isAlarmActiveRef = useRef(false);
  isAlarmActiveRef.current = isAlarmActive;

  // Web Audio Context & Oscillator for Alarm Siren
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmOscRef = useRef<OscillatorNode | null>(null);
  const alarmGainRef = useRef<GainNode | null>(null);
  const isAudioPlayingRef = useRef<boolean>(false);
  const sirenIntervalRef = useRef<any>(null);

  // Initialize Web Audio (complies with autoplay policy when student interacts)
  const initAudio = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioCtxRef.current = new AudioContextClass();
        }
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch (e) {
      console.error('[AUDIO] Failed to initialize audio context:', e);
    }
  };

  // Start sound alarm
  const startAlarmSound = () => {
    if (isAudioPlayingRef.current) return;
    try {
      initAudio();
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      let toggle = false;
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = setInterval(() => {
        if (!isAudioPlayingRef.current || !alarmOscRef.current) {
          if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
          return;
        }
        toggle = !toggle;
        try {
          alarmOscRef.current.frequency.setValueAtTime(toggle ? 1150 : 750, ctx.currentTime);
        } catch (e) {}
      }, 350);

      alarmOscRef.current = osc;
      alarmGainRef.current = gain;
      isAudioPlayingRef.current = true;
    } catch (e) {
      console.error('[AUDIO] Alarm sound error:', e);
    }
  };

  // Stop sound alarm
  const stopAlarmSound = () => {
    if (!isAudioPlayingRef.current) return;
    try {
      if (sirenIntervalRef.current) clearInterval(sirenIntervalRef.current);
      if (alarmOscRef.current) {
        alarmOscRef.current.stop();
        alarmOscRef.current.disconnect();
        alarmOscRef.current = null;
      }
      if (alarmGainRef.current) {
        alarmGainRef.current.disconnect();
        alarmGainRef.current = null;
      }
    } catch (e) {}
    isAudioPlayingRef.current = false;
  };

  // Remaining seconds
  const [remainingSeconds, setRemainingSeconds] = useState<number>(attempt.Remaining_Seconds || exam.Duration_Minutes * 60);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Submit modal & finished screen
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(attempt.Status === 'SUBMITTED' || attempt.Status === 'TIMEOUT');

  // Initialize audio on first click anywhere in the room
  useEffect(() => {
    const handleFirstUserGesture = () => {
      initAudio();
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
    };
    window.addEventListener('click', handleFirstUserGesture);
    window.addEventListener('keydown', handleFirstUserGesture);
    window.addEventListener('touchstart', handleFirstUserGesture);
    return () => {
      window.removeEventListener('click', handleFirstUserGesture);
      window.removeEventListener('keydown', handleFirstUserGesture);
      window.removeEventListener('touchstart', handleFirstUserGesture);
      stopAlarmSound();
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (isCompleted) return;
    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam(true); // Auto-submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isCompleted]);

  // Poll alarm status when alarm is active to check if proctor/admin resolved or muted it
  useEffect(() => {
    if (!isAlarmActive || isCompleted || !attempt.Attempt_ID) return;
    const pollInterval = setInterval(() => {
      fetch(`/api/student/check-alarm?attemptId=${attempt.Attempt_ID}`)
        .then(r => r.json())
        .then(r => {
          if (r.status === 'success' && !r.alarmActive) {
            stopAlarmSound();
            setIsAlarmActive(false);
            isAlarmActiveRef.current = false;
            setWarningMessage(null);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isAlarmActive, isCompleted, attempt.Attempt_ID]);

  // Batch Sync function to Google Apps Script saveAnswers
  const performBatchSync = async (currentAnswersMap: Record<string, any>) => {
    if (isCompleted || !attempt.Attempt_ID) return;
    setSaveStatus('saving');

    const formattedList = Object.entries(currentAnswersMap).map(([eqId, val]) => ({
      Exam_Question_ID: eqId,
      Selected_Option_ID: val.selectedOptionId || '',
      Answer_Text: val.answerText || ''
    }));

    if (formattedList.length === 0) {
      setSaveStatus('saved');
      return;
    }

    try {
      const res = await fetch('/api/student/save-answers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          attemptId: attempt.Attempt_ID,
          token,
          answers: formattedList
        })
      });
      const data = await res.json();
      if (data.status === 'success' || data.ok) {
        setSaveStatus('saved');
        if (data.isExpired) {
          setRemainingSeconds(0);
          handleSubmitExam(true);
        }
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    }
  };

  // Periodic autosave batch sync every 25 seconds
  useEffect(() => {
    if (isCompleted) return;
    const batchInterval = setInterval(() => {
      performBatchSync(answersRef.current);
    }, 25000);

    return () => clearInterval(batchInterval);
  }, [isCompleted, attempt.Attempt_ID]);

  // Anti-cheat Listeners (TAB_HIDDEN, WINDOW_BLUR, FULLSCREEN_EXIT, PAGE_RELOAD)
  useEffect(() => {
    if (!exam.Anti_Cheat_Enabled || isCompleted) return;

    let blurStartTime = 0;
    let hiddenStartTime = 0;

    const reportViolation = (eventType: string, duration: number) => {
      fetch('/api/student/violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          attemptId: attempt.Attempt_ID,
          token,
          eventType,
          durationSeconds: duration,
          detectedAt: new Date().toISOString()
        })
      })
        .then(r => r.json())
        .then(r => {
          if (r.status === 'success' || r.ok) {
            setViolationCount(prev => prev + 1);
            const isAuthorized = r.data?.Is_Authorized || r.data?.isAuthorized;
            const alarmStatus = r.data?.Alarm_Status || r.data?.alarmStatus;

            if (!isAuthorized) {
              setIsAlarmActive(true);
              isAlarmActiveRef.current = true;
              setWarningMessage(
                `PERINGATAN INTEGRITAS: Anda terdeteksi melakukan pelanggaran (${eventType}). Alarm suara aktif dan hanya pengawas/admin yang dapat me-resolve!`
              );
              // When user is currently in the tab, ring the siren
              if (!document.hidden) {
                startAlarmSound();
              }
            }
          }
        })
        .catch(console.error);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hiddenStartTime = Date.now();
        reportViolation('TAB_HIDDEN', 0);
      } else {
        const duration = hiddenStartTime ? Math.round((Date.now() - hiddenStartTime) / 1000) : 1;
        hiddenStartTime = 0;
        // User returned to tab - if alarm is active, trigger sound!
        if (isAlarmActiveRef.current) {
          startAlarmSound();
        }
      }
    };

    const handleBlur = () => {
      blurStartTime = Date.now();
      if (!document.hidden) {
        reportViolation('WINDOW_BLUR', 0);
      }
    };

    const handleFocus = () => {
      if (blurStartTime) {
        const duration = Math.round((Date.now() - blurStartTime) / 1000);
        blurStartTime = 0;
      }
      if (isAlarmActiveRef.current) {
        startAlarmSound();
      }
    };

    const handleFullscreenChange = () => {
      const isNowFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(isNowFullscreen);
      if (exam.Fullscreen_Required && !isNowFullscreen) {
        reportViolation('FULLSCREEN_EXIT', 0);
      }
    };

    const handleBeforeUnload = () => {
      const payload = JSON.stringify({
        attemptId: attempt.Attempt_ID,
        token,
        eventType: 'PAGE_RELOAD',
        durationSeconds: 0,
        detectedAt: new Date().toISOString()
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/student/violation', new Blob([payload], { type: 'application/json' }));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [exam.Anti_Cheat_Enabled, attempt.Attempt_ID, isCompleted]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Immediate local cache + debounced server sync
  const triggerAutosave = (updatedAnswers: Record<string, any>) => {
    // 1. Immediately save to localStorage cache
    try {
      localStorage.setItem(`exam_cache_${attempt.Attempt_ID}`, JSON.stringify(updatedAnswers));
    } catch (e) {}

    // 2. Debounced batch sync to backend
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      performBatchSync(updatedAnswers);
    }, 1200);
  };

  // Answer change handlers
  const handleSelectOption = (eqId: string, optId: string) => {
    const cur = answers[eqId] || {};
    const updated = { ...cur, selectedOptionId: optId };
    const nextAnswers = { ...answers, [eqId]: updated };
    setAnswers(nextAnswers);
    triggerAutosave(nextAnswers);
  };

  const handleTextChange = (eqId: string, text: string) => {
    const cur = answers[eqId] || {};
    const updated = { ...cur, answerText: text };
    const nextAnswers = { ...answers, [eqId]: updated };
    setAnswers(nextAnswers);
    triggerAutosave(nextAnswers);
  };

  const handleToggleFlag = (eqId: string) => {
    const cur = answers[eqId] || {};
    const updatedFlag = !cur.isFlagged;
    const updated = { ...cur, isFlagged: updatedFlag };
    const nextAnswers = { ...answers, [eqId]: updated };
    setAnswers(nextAnswers);
    triggerAutosave(nextAnswers);
  };

  // Submit Handler: final sync before submit
  const handleSubmitExam = async (isTimeout = false) => {
    setIsSubmitting(true);
    stopAlarmSound();

    const formattedList = Object.entries(answers).map(([eqId, val]: [string, any]) => ({
      Exam_Question_ID: eqId,
      Selected_Option_ID: val?.selectedOptionId || '',
      Answer_Text: val?.answerText || ''
    }));

    try {
      const res = await fetch('/api/student/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          attemptId: attempt.Attempt_ID,
          token,
          isTimeout,
          answers: formattedList
        })
      });
      const r = await res.json();
      if (r.status === 'success' || r.ok) {
        setIsCompleted(true);
        setShowSubmitModal(false);
        setAttempt(r.data || attempt);
        // Clear temporary localStorage cache upon successful submission
        try {
          localStorage.removeItem(`exam_cache_${attempt.Attempt_ID}`);
        } catch (e) {}
      } else {
        alert('Gagal mengirim ujian: ' + (r.message || r.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Gagal mengirim ujian: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Timer format (HH:MM:SS)
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentIndex];
  const curAnswer = currentQ ? answers[currentQ.Exam_Question_ID] || {} : {};

  // Summary counts
  const answeredCount = Object.values(answers).filter((a: any) => a.selectedOptionId || (a.answerText && a.answerText.trim().length > 0)).length;
  const flaggedCount = Object.values(answers).filter((a: any) => a.isFlagged).length;

  if (isCompleted) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-800">Ujian Telah Selesai Dikirim!</h2>
            <p className="text-xs text-slate-500">
              Jawaban Anda telah berhasil diarsipkan dengan aman ke server Google Apps Script / Database.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Mahasiswa:</span>
              <strong className="text-slate-800">{student.Full_Name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NIM:</span>
              <strong className="font-mono text-slate-800">{student.NIM}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ujian:</span>
              <strong className="text-slate-800">{exam.Exam_Name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Soal Dijawab:</span>
              <strong className="text-emerald-700">{answeredCount} dari {questions.length} Soal</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status Pengerjaan:</span>
              <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                {attempt.Status || 'SUBMITTED'}
              </span>
            </div>
          </div>

          <button
            onClick={onExamFinished}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs"
          >
            Kembali ke Portal Masuk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Top Bar: Exam Title, Timer, Fullscreen, and Autosave Indicator */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="space-y-0.5">
            <h1 className="text-sm font-bold text-slate-800 truncate max-w-xs sm:max-w-md">
              {exam.Exam_Name}
            </h1>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>{student.Full_Name} ({student.NIM})</span>
              <span>•</span>
              <span>{student.Class_Name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' ? (
              <span className="text-amber-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Menyimpan...
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Tersimpan di Cloud
              </span>
            ) : (
              <span className="text-rose-700 flex items-center gap-1">
                Gagal sinkron
              </span>
            )}
          </div>

          {/* Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${
            remainingSeconds < 300
              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
              : 'bg-slate-100 text-slate-800 border border-slate-200'
          }`}>
            <Clock className="w-4 h-4 text-slate-600" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Button */}
          {exam.Fullscreen_Required && (
            <button
              onClick={toggleFullscreen}
              title="Aktifkan Layar Penuh"
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}

          {/* Submit Exam Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition cursor-pointer shadow-xs"
          >
            <Send className="w-3.5 h-3.5" />
            Selesai Ujian
          </button>
        </div>
      </header>

      {/* Warning Banner if violation detected */}
      {warningMessage && (
        <div className="bg-rose-600 text-white text-xs px-4 py-2.5 flex items-center justify-between shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{warningMessage}</span>
          </div>
          {isAlarmActive && (
            <span className="bg-rose-800 text-white px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold tracking-wider shrink-0">
              ALARM AKTIF • HANYA PENGAWAS BISA RESOLVE
            </span>
          )}
        </div>
      )}

      {/* Main Content Area: Left Question Area, Right Navigator */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Question Area */}
        <main className="lg:col-span-8 space-y-4">
          {currentQ ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-sky-800 text-white font-bold text-sm flex items-center justify-center">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Soal {currentIndex + 1} dari {questions.length}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded">
                    {currentQ.Points} Poin
                  </span>
                </div>

                <button
                  onClick={() => handleToggleFlag(currentQ.Exam_Question_ID)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    curAnswer.isFlagged
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${curAnswer.isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{curAnswer.isFlagged ? 'Ragu-ragu (Ditandai)' : 'Tandai Ragu-ragu'}</span>
                </button>
              </div>

              {/* Question Stimulus Image if any */}
              {currentQ.Image_URL && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto">
                  <img
                    src={currentQ.Image_URL}
                    alt="Stimulus Soal"
                    className="max-h-60 rounded-lg object-contain mx-auto"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Question Text */}
              <div className="text-slate-900 text-base font-medium leading-relaxed whitespace-pre-line">
                {currentQ.Question_Text}
              </div>

              {/* Input section: MCQ Options or Essay Textarea */}
              {currentQ.Question_Type === 'MCQ' && currentQ.Options && (
                <div className="space-y-3 pt-2">
                  {currentQ.Options.map((opt: any) => {
                    const isSelected = curAnswer.selectedOptionId === opt.Option_ID;
                    return (
                      <label
                        key={opt.Option_ID}
                        onClick={() => handleSelectOption(currentQ.Exam_Question_ID, opt.Option_ID)}
                        className={`p-4 rounded-xl border-2 flex items-start gap-3 transition cursor-pointer ${
                          isSelected
                            ? 'border-sky-700 bg-sky-50/70 text-sky-950 font-medium shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                          isSelected ? 'bg-sky-800 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {opt.Option_Key}
                        </span>
                        <span className="text-sm flex-1 leading-relaxed">{opt.Option_Text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQ.Question_Type === 'ESSAY' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Tuliskan Jawaban Essay Anda di bawah ini:
                  </label>
                  <textarea
                    rows={7}
                    value={curAnswer.answerText || ''}
                    onChange={e => handleTextChange(currentQ.Exam_Question_ID, e.target.value)}
                    placeholder="Ketikkan uraian jawaban Anda secara jelas dan terstruktur di sini..."
                    className="w-full p-4 border border-slate-300 rounded-xl text-sm leading-relaxed focus:border-sky-700 focus:ring-1 focus:ring-sky-700 outline-hidden"
                  />
                </div>
              )}

              {/* Navigation Controls (Prev / Next) */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Soal Sebelumnya
                </button>

                <button
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-800 hover:bg-sky-900 text-white transition cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-xs"
                >
                  Soal Selanjutnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border">
              Tidak ada soal tersedia.
            </div>
          )}
        </main>

        {/* Right Sidebar: Question Navigator */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Navigasi Butir Soal ({questions.length})
            </h2>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const ans = answers[q.Exam_Question_ID] || {};
                const isAnswered = ans.selectedOptionId || (ans.answerText && ans.answerText.trim().length > 0);
                const isFlagged = ans.isFlagged;
                const isCurrent = idx === currentIndex;

                let btnClass = 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
                if (isCurrent) {
                  btnClass = 'ring-2 ring-sky-700 ring-offset-1 font-bold';
                }
                if (isFlagged) {
                  btnClass += ' bg-amber-100 border-amber-400 text-amber-900 font-bold';
                } else if (isAnswered) {
                  btnClass += ' bg-sky-700 text-white border-sky-700 font-bold';
                }

                return (
                  <button
                    key={q.Exam_Question_ID}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-11 rounded-xl text-xs flex flex-col items-center justify-center transition cursor-pointer border ${btnClass}`}
                  >
                    <span>{idx + 1}</span>
                    <span className="text-[9px] uppercase opacity-70">
                      {q.Question_Type === 'MCQ' ? 'PG' : 'ES'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-sky-700 shrink-0" />
                <span>Sudah Dijawab ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-200 border border-amber-400 shrink-0" />
                <span>Ragu-ragu ({flaggedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300 shrink-0" />
                <span>Belum Dijawab ({questions.length - answeredCount})</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowSubmitModal(true)}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Kumpulkan Jawaban Ujian
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-800">Konfirmasi Selesai Ujian</h3>
              <p className="text-xs text-slate-500">
                Pastikan seluruh pertanyaan telah Anda jawab dengan teliti sebelum mengirimkan lembar ujian.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Soal:</span>
                <strong className="text-slate-800">{questions.length}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Sudah Dijawab:</span>
                <strong className="text-emerald-700">{answeredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Belum Dijawab:</span>
                <strong className="text-rose-700">{questions.length - answeredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Masih Ragu-ragu:</span>
                <strong className="text-amber-700">{flaggedCount}</strong>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                onClick={() => handleSubmitExam(false)}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? 'Mengirim...' : 'Ya, Kirim Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
