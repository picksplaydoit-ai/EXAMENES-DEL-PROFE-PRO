import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Award, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  Atom, 
  HelpCircle, 
  AlertOctagon,
  Sparkles,
  ArrowRightLeft,
  AlignLeft,
  Volume2,
  AlertCircle,
  WifiOff,
  Wifi
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, StudentExamState, CheatLog, StudentStatus, GlobalSessionState } from '../types';
import { firebaseService, ExamDataPayload } from '../services/firebaseService';
import { soundManager } from '../services/soundEffects';
import { randomizeExamForStudent, RandomizedQuestion } from '../services/examRandomizer';
import { StudentWaitingRoom } from './StudentWaitingRoom';
import { QuestionCard } from './QuestionCard';
import { RefreshCw } from 'lucide-react';

interface StudentViewProps {
  onSwitchToTeacher?: () => void;
  isStudentOnly?: boolean;
}

const STORAGE_KEY_STUDENT_SESSION = 'quimica_active_student_session_v2';

export const StudentView: React.FC<StudentViewProps> = ({ 
  onSwitchToTeacher,
  isStudentOnly = false
}) => {
  // Global Session & Exam Data
  const [examData, setExamData] = useState<ExamDataPayload>(firebaseService.getActiveExam());
  const [globalSession, setGlobalSession] = useState<GlobalSessionState>(firebaseService.getGlobalSession());
  const [allConnectedStudents, setAllConnectedStudents] = useState<StudentExamState[]>([]);
  const [isRefreshingExam, setIsRefreshingExam] = useState(false);

  const activeQuestions: Question[] = examData.questions || [];
  const totalExamPoints = activeQuestions.reduce((acc, q) => acc + q.points, 0) || 100;

  // Network drop resilience state
  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [justReconnected, setJustReconnected] = useState(false);

  // Registration State
  const [fullName, setFullName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // Active Flow State
  const [isRegistered, setIsRegistered] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [examStatus, setExamStatus] = useState<StudentStatus>('not_started');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});

  // Individual randomized questions & shuffled options per student (Anti-Copy feature)
  const [studentQuestions, setStudentQuestions] = useState<RandomizedQuestion[]>(() => 
    randomizeExamForStudent(
      examData.questions || [], 
      matricula || 'ANONYMOUS', 
      examData.updatedAt || examData.title
    )
  );
  
  // Timers & Synchronized Countdown
  const [timeRemaining, setTimeRemaining] = useState<number>(20 * 60);
  const [countdownStartNumber, setCountdownStartNumber] = useState<number | null>(null);

  // Anti-Cheat State
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [activeWarningModal, setActiveWarningModal] = useState<number | null>(null);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [examSubmittedTime, setExamSubmittedTime] = useState<number | undefined>(undefined);

  // 0. On mount, explicitly pull fresh active exam from Firestore to ensure teacher's latest exam is loaded
  useEffect(() => {
    firebaseService.fetchActiveExam(true).then((fresh) => {
      if (fresh && Array.isArray(fresh.questions) && fresh.questions.length > 0) {
        setExamData(fresh);
      }
    });
  }, []);

  // Update randomized questions whenever examData or student matricula changes
  useEffect(() => {
    const randomized = randomizeExamForStudent(
      examData.questions || [],
      matricula || 'STUDENT_PREVIEW',
      examData.updatedAt || examData.title
    );
    setStudentQuestions(randomized);
  }, [examData, matricula]);

  // 1. Restore previous active session from localStorage so reload/network drops do not close exam
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(STORAGE_KEY_STUDENT_SESSION);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        const currentExam = firebaseService.getActiveExam();
        
        // If the saved session is from a different exam or older version, discard stale attempt
        const isSameExam = !parsed.examTitle || parsed.examTitle === currentExam.title;
        if (!isSameExam) {
          localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
          return;
        }

        if (parsed && parsed.matricula && parsed.examStatus !== 'submitted' && parsed.examStatus !== 'forced_submission_cheat') {
          setMatricula(parsed.matricula);
          setFullName(parsed.fullName || '');
          setHasAcceptedRules(Boolean(parsed.hasAcceptedRules));
          setIsRegistered(Boolean(parsed.isRegistered));
          setIsExamStarted(Boolean(parsed.isExamStarted));
          if (parsed.examStatus) setExamStatus(parsed.examStatus);
          if (typeof parsed.currentQuestionIdx === 'number') setCurrentQuestionIdx(parsed.currentQuestionIdx);
          if (parsed.selectedAnswers) setSelectedAnswers(parsed.selectedAnswers);
          if (typeof parsed.warningsCount === 'number') setWarningsCount(parsed.warningsCount);
          if (Array.isArray(parsed.cheatLogs)) setCheatLogs(parsed.cheatLogs);
        }
      }
    } catch (e) {
      console.warn('Nota al restaurar sesión previa:', e);
    }
  }, []);

  // 2. Persist student answers and progress locally in case of internet drops
  useEffect(() => {
    if (!matricula.trim()) return;
    try {
      if (examStatus === 'submitted' || examStatus === 'forced_submission_cheat') {
        localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
      } else {
        localStorage.setItem(STORAGE_KEY_STUDENT_SESSION, JSON.stringify({
          matricula,
          fullName,
          hasAcceptedRules,
          isRegistered,
          isExamStarted,
          examStatus,
          currentQuestionIdx,
          selectedAnswers,
          warningsCount,
          cheatLogs,
          examTitle: examData.title,
          examUpdatedAt: examData.updatedAt,
          savedAt: Date.now()
        }));
      }
    } catch {
      // Ignore
    }
  }, [matricula, fullName, hasAcceptedRules, isRegistered, isExamStarted, examStatus, currentQuestionIdx, selectedAnswers, warningsCount, cheatLogs, examData.title, examData.updatedAt]);

  // 3. Synchronize with Firebase Realtime & keep questions updated in real-time
  useEffect(() => {
    const unsubExam = firebaseService.subscribeToExam((data) => {
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        setExamData(data);
        setCurrentQuestionIdx((prev) => (prev >= data.questions.length ? 0 : prev));

        // If teacher changed the exam, reset student attempt if it was for a previous exam
        try {
          const raw = localStorage.getItem(STORAGE_KEY_STUDENT_SESSION);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.examTitle && parsed.examTitle !== data.title) {
              localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
              setIsExamStarted(false);
              setExamStatus('not_started');
              setSelectedAnswers({});
              setCurrentQuestionIdx(0);
            }
          }
        } catch {
          // Ignore
        }
      }
    });

    const unsubSession = firebaseService.subscribeToGlobalSession((session) => {
      setGlobalSession(session);
    });

    const unsubStudents = firebaseService.subscribeToStudents((students) => {
      setAllConnectedStudents(Object.values(students));
    });

    return () => {
      unsubExam();
      unsubSession();
      unsubStudents();
    };
  }, []);

  // Manual exam sync button handler
  const handleManualSyncExam = async () => {
    setIsRefreshingExam(true);
    soundManager.playClick();
    try {
      const fresh = await firebaseService.fetchActiveExam(true);
      if (fresh) {
        setExamData(fresh);
      }
    } finally {
      setTimeout(() => setIsRefreshingExam(false), 500);
    }
  };

  // Ref to track latest state for event handlers without stale closures
  const stateRef = useRef({
    isExamStarted,
    examStatus,
    warningsCount,
    selectedAnswers,
    matricula,
    fullName,
    cheatLogs,
    activeQuestions,
    totalExamPoints,
    examTitle: examData.title
  });

  useEffect(() => {
    stateRef.current = {
      isExamStarted,
      examStatus,
      warningsCount,
      selectedAnswers,
      matricula,
      fullName,
      cheatLogs,
      activeQuestions,
      totalExamPoints,
      examTitle: examData.title
    };
  });

  // Calculate score for any question type
  const calculateScore = useCallback((answers: Record<string, any>) => {
    let earnedPoints = 0;
    const questions = stateRef.current.activeQuestions;
    const maxPts = stateRef.current.totalExamPoints;

    questions.forEach((q) => {
      const studentAns = answers[q.id];
      if (studentAns === undefined || studentAns === null) return;

      if (q.type === 'opcion_multiple') {
        if (studentAns === q.correctAnswer) {
          earnedPoints += q.points;
        }
      } else if (q.type === 'relacionar' && q.pairs && q.pairs.length > 0) {
        const matches: Record<string, string> = studentAns || {};
        let rightPairs = 0;
        q.pairs.forEach((p) => {
          if (matches[p.id] === p.right) rightPairs++;
        });
        const pairScore = Math.round((q.points * rightPairs) / q.pairs.length);
        earnedPoints += pairScore;
      } else if (q.type === 'abierta') {
        // Open-ended: gives provisional credit if answered with substance (> 10 chars)
        if (typeof studentAns === 'string' && studentAns.trim().length >= 10) {
          earnedPoints += q.points;
        }
      }
    });

    const percentage = maxPts > 0 ? Math.round((earnedPoints / maxPts) * 100) : 0;
    return { earnedPoints, percentage };
  }, []);

  // Sync to Cloud
  const syncToCloud = useCallback(async (
    statusOverride?: StudentStatus, 
    warningsOverride?: number, 
    logsOverride?: CheatLog[],
    answersOverride?: Record<string, any>
  ) => {
    const curMatricula = stateRef.current.matricula.trim().toUpperCase();
    if (!curMatricula) return;

    const answers = answersOverride || stateRef.current.selectedAnswers;
    const { earnedPoints, percentage } = calculateScore(answers);
    const status = statusOverride || stateRef.current.examStatus;
    const warns = warningsOverride !== undefined ? warningsOverride : stateRef.current.warningsCount;
    const logs = logsOverride || stateRef.current.cheatLogs;

    const studentRecord: StudentExamState = {
      id: curMatricula,
      matricula: curMatricula,
      fullName: stateRef.current.fullName.trim() || 'Alumno',
      examId: 'quimica_general_2026',
      examTitle: stateRef.current.examTitle || 'Examen de Química',
      status: status,
      startedAt: Date.now(),
      submittedAt: status === 'submitted' || status === 'forced_submission_cheat' ? Date.now() : undefined,
      currentQuestionIndex: currentQuestionIdx,
      answers: answers,
      score: earnedPoints,
      maxScore: stateRef.current.totalExamPoints,
      percentage: percentage,
      cheatWarningsCount: warns,
      cheatLogs: logs,
      lastActive: Date.now()
    };

    try {
      await firebaseService.syncStudent(studentRecord);
    } catch (err) {
      console.warn('Sync diferido por bajón de internet; datos resguardados localmente:', err);
    }
  }, [calculateScore, currentQuestionIdx]);

  // Online / Offline internet drop listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      syncToCloud();
      setTimeout(() => setJustReconnected(false), 4500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncToCloud]);

  // Transition from Waiting Room to Active Exam when Teacher Starts
  useEffect(() => {
    if (isRegistered && examStatus === 'waiting' && globalSession.status === 'active') {
      soundManager.stopLobbyGroove();
      // Start 3... 2... 1... countdown!
      setCountdownStartNumber(3);
      soundManager.playCountdownTick(false);

      const t1 = setTimeout(() => {
        setCountdownStartNumber(2);
        soundManager.playCountdownTick(false);
      }, 1000);

      const t2 = setTimeout(() => {
        setCountdownStartNumber(1);
        soundManager.playCountdownTick(false);
      }, 2000);

      const t3 = setTimeout(() => {
        setCountdownStartNumber(null);
        soundManager.playCountdownTick(true);
        soundManager.playSuccessChime();
        setIsExamStarted(true);
        setExamStatus('in_progress');
        syncToCloud('in_progress');
      }, 3000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isRegistered, examStatus, globalSession.status, syncToCloud]);

  // Global Synchronized Timer
  useEffect(() => {
    if (!isExamStarted || examStatus !== 'in_progress') return;

    const updateTimer = () => {
      if (globalSession.endsAt) {
        const remaining = Math.max(0, Math.floor((globalSession.endsAt - Date.now()) / 1000));
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          // Timer expired: auto-submit
          handleNormalSubmit();
        }
      } else {
        // Fallback local
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleNormalSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isExamStarted, examStatus, globalSession.endsAt]);

  // Handle Cheating / Tab Switching Detection
  const handleViolationDetected = useCallback((reason: string) => {
    // If device is offline or in an internet drop, ignore blur events that might be triggered by network drops
    if (typeof navigator !== 'undefined' && !navigator.onLine && reason.includes('blur')) {
      return;
    }
    const { isExamStarted, examStatus, warningsCount, cheatLogs } = stateRef.current;
    if (!isExamStarted || examStatus !== 'in_progress') return;

    const newWarningNum = warningsCount + 1;
    const newLog: CheatLog = {
      timestamp: Date.now(),
      reason,
      warningNumber: newWarningNum
    };
    const updatedLogs = [...cheatLogs, newLog];

    setWarningsCount(newWarningNum);
    setCheatLogs(updatedLogs);
    setActiveWarningModal(newWarningNum);

    if (newWarningNum >= 3) {
      soundManager.playCriticalAlarm();
      setExamStatus('forced_submission_cheat');
      setExamSubmittedTime(Date.now());
      try {
        localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
      } catch {
        // Ignore
      }
      syncToCloud('forced_submission_cheat', newWarningNum, updatedLogs);
    } else {
      soundManager.playWarningAlarm();
      syncToCloud('in_progress', newWarningNum, updatedLogs);
    }
  }, [syncToCloud]);

  // Anti-Cheat Event Listeners (visibilitychange & window blur)
  useEffect(() => {
    let lastBlurTimestamp = 0;

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        const now = Date.now();
        if (now - lastBlurTimestamp > 1000) {
          lastBlurTimestamp = now;
          handleViolationDetected('Cambio de pestaña o navegador minimizado (visibilitychange)');
        }
      }
    };

    const handleWindowBlur = () => {
      const now = Date.now();
      if (now - lastBlurTimestamp > 1000) {
        lastBlurTimestamp = now;
        handleViolationDetected('Ventana de examen desenfocada o cambio de aplicación (blur)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleViolationDetected]);

  // Step 1: Join Waiting Room (Lobby)
  const handleJoinWaitingRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(null);

    if (!fullName.trim() || !matricula.trim()) {
      setRegistrationError('Por favor completa tu Nombre y tu Código/Matrícula para continuar.');
      return;
    }
    if (!hasAcceptedRules) {
      setRegistrationError('Debes confirmar que has leído y aceptas las normas anti-trampas.');
      return;
    }

    soundManager.playClick();
    setIsRegistered(true);
    setExamStatus('waiting');
    setWarningsCount(0);
    setCheatLogs([]);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);

    const initialStudent: StudentExamState = {
      id: matricula.trim().toUpperCase(),
      matricula: matricula.trim().toUpperCase(),
      fullName: fullName.trim(),
      examId: 'quimica_general_2026',
      examTitle: examData.title,
      status: 'waiting',
      joinedWaitingAt: Date.now(),
      currentQuestionIndex: 0,
      answers: {},
      score: 0,
      maxScore: totalExamPoints,
      percentage: 0,
      cheatWarningsCount: 0,
      cheatLogs: [],
      lastActive: Date.now()
    };
    firebaseService.syncStudent(initialStudent);
  };

  // Exit Waiting Room
  const handleExitWaitingRoom = () => {
    if (matricula.trim()) {
      firebaseService.deleteStudent(matricula.trim().toUpperCase());
    }
    setIsRegistered(false);
    setExamStatus('not_started');
  };

  // Handle Answer Changes
  const handleAnswerChange = (questionId: string, answer: any) => {
    if (examStatus !== 'in_progress') return;
    soundManager.playClick();

    const updated = {
      ...selectedAnswers,
      [questionId]: answer
    };
    setSelectedAnswers(updated);
    syncToCloud('in_progress', warningsCount, cheatLogs, updated);
  };

  // Submit Exam
  const handleNormalSubmit = () => {
    setIsSubmitConfirmOpen(false);
    setExamStatus('submitted');
    setExamSubmittedTime(Date.now());
    soundManager.playSuccessChime();

    try {
      localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
    } catch {
      // Ignore
    }

    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored
    }

    syncToCloud('submitted');
  };

  // Restart
  const handleRestart = () => {
    try {
      localStorage.removeItem(STORAGE_KEY_STUDENT_SESSION);
    } catch {
      // Ignore
    }
    setIsRegistered(false);
    setIsExamStarted(false);
    setExamStatus('not_started');
    setSelectedAnswers({});
    setWarningsCount(0);
    setCheatLogs([]);
    setActiveWarningModal(null);
    setCurrentQuestionIdx(0);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQ = studentQuestions[currentQuestionIdx] || studentQuestions[0] || activeQuestions[0];
  const { earnedPoints, percentage } = calculateScore(selectedAnswers);
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Network Drop / Offline Resilient Notice */}
      {!isOnline && (
        <div className="bg-amber-950/90 border-2 border-amber-500 text-amber-200 p-4 rounded-2xl flex items-center space-x-3 shadow-xl mb-6 animate-in fade-in">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-amber-300 uppercase tracking-wide">
              📶 Modo Sin Conexión Activado (Bajón de Señal Detectado)
            </p>
            <p className="text-slate-300 mt-0.5">
              Tu examen <strong>NO se cerrará</strong>. Todas tus respuestas están resguardadas en tu dispositivo. Sigue respondiendo tus preguntas con tranquilidad; se sincronizarán en cuanto vuelva la señal.
            </p>
          </div>
        </div>
      )}

      {justReconnected && (
        <div className="bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 p-3.5 rounded-2xl flex items-center space-x-3 shadow-xl mb-6 animate-in fade-in">
          <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <span className="font-bold text-emerald-300">¡Conexión de internet reestablecida!</span>
            <span className="text-slate-300 ml-1">Tus respuestas se han sincronizado con el profesor.</span>
          </div>
        </div>
      )}

      {/* ========================================================
          KAHOOT COUNTDOWN OVERLAY (3... 2... 1... ¡YA!)
          ======================================================== */}
      {countdownStartNumber !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in">
          <div className="text-center">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400 mb-2 block">
              ¡El profesor ha iniciado el examen!
            </span>
            <div className="text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-ping">
              {countdownStartNumber}
            </div>
            <p className="text-sm font-bold text-white mt-4">
              Preparando tus reactivos...
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 1: LOGIN & RULES FORM
          ======================================================== */}
      {!isRegistered && examStatus === 'not_started' && (
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/25 mb-4 text-white">
              <Atom className="w-8 h-8 animate-spin-slow" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {examData.title}
            </h1>
            <p className="text-slate-400 mt-2 text-xs sm:text-sm">
              Ingresa tus datos oficiales para unirte a la <strong>Sala de Espera</strong> del examen.
            </p>

            {/* Anti-Copy and Live Info Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                🛡️ Modo Anti-Copia: Reactivos y opciones permutados por alumno
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">
                {activeQuestions.length} reactivos ({totalExamPoints} pts)
              </span>
              <button
                type="button"
                onClick={handleManualSyncExam}
                disabled={isRefreshingExam}
                className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 transition-colors"
                title="Sincronizar reactivos con el profesor"
              >
                <RefreshCw className={`w-3 h-3 mr-1.5 ${isRefreshingExam ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
                <span>{isRefreshingExam ? 'Sincronizando...' : 'Actualizar Examen'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleJoinWaitingRoom} className="max-w-xl mx-auto space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nombre Completo del Alumno *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Valeria Sofía Morales Castro"
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Matrícula o Código de Estudiante *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <span className="font-mono text-xs font-bold px-1 py-0.5 rounded bg-slate-800 text-indigo-400">ID</span>
                </div>
                <input
                  type="text"
                  required
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ej. A01754820 o 2026-QUI-09"
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium font-mono uppercase"
                />
              </div>
            </div>

            {/* Anti-cheat Pledge */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 p-4 sm:p-5">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm text-slate-300 space-y-2">
                  <h4 className="font-bold text-amber-300 uppercase tracking-wide text-xs">
                    Normativa Anti-Trampas (Supervisión Activa)
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                    <li>
                      <strong>Sala de Espera:</strong> Al entrar esperarás a que el profesor inicie el temporizador para todos.
                    </li>
                    <li>
                      <strong>Detección de pestañas:</strong> Si sales de la pestaña o minimizas el navegador, se registrará una infracción.
                    </li>
                    <li>
                      <strong className="text-rose-400">Límite de 3 faltas:</strong> A la 3ra falta el examen se enviará automáticamente.
                    </li>
                  </ul>
                </div>
              </div>

              <label className="flex items-center space-x-3 mt-4 pt-3 border-t border-amber-500/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcceptedRules}
                  onChange={(e) => setHasAcceptedRules(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200">
                  Acepto las condiciones y prometo no cambiar de ventana durante la prueba.
                </span>
              </label>
            </div>

            {registrationError && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{registrationError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!hasAcceptedRules || !fullName.trim() || !matricula.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>Entrar a la Sala de Espera</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          STAGE 2: KAHOOT STYLE WAITING ROOM
          ======================================================== */}
      {isRegistered && examStatus === 'waiting' && (
        <StudentWaitingRoom
          student={{
            id: matricula.toUpperCase(),
            matricula: matricula.toUpperCase(),
            fullName,
            examId: 'quimica_general_2026',
            examTitle: examData.title,
            status: 'waiting',
            currentQuestionIndex: 0,
            answers: {},
            score: 0,
            maxScore: totalExamPoints,
            percentage: 0,
            cheatWarningsCount: 0,
            cheatLogs: [],
            lastActive: Date.now()
          }}
          session={globalSession}
          connectedStudents={allConnectedStudents}
          onExitWaitingRoom={handleExitWaitingRoom}
        />
      )}

      {/* ========================================================
          STAGE 3: ACTIVE EXAM IN PROGRESS
          ======================================================== */}
      {isExamStarted && examStatus === 'in_progress' && currentQ && (
        <div className="space-y-6">
          {/* Proctoring Bar */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                {fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-none">
                  {fullName}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Matrícula: <span className="text-indigo-300 font-semibold">{matricula.toUpperCase()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Warnings Counter */}
              <div 
                className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all ${
                  warningsCount === 0
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : warningsCount === 1
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Faltas: {warningsCount} / 3</span>
              </div>

              {/* Synchronized Global Timer */}
              <div className={`px-3.5 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-mono font-bold transition-colors ${
                timeRemaining <= 120
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}>
                <Clock className="w-4 h-4 text-pink-400" />
                <span>{formatTimer(timeRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-400 mb-2 font-medium">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-200">Pregunta {currentQuestionIdx + 1} de {studentQuestions.length}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold hidden sm:inline">
                  🛡️ Orden Aleatorio Anti-Copia
                </span>
              </div>
              <span>{answeredCount} respondidas ({Math.round((answeredCount / (studentQuestions.length || 1)) * 100)}%)</span>
            </div>
            <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / (studentQuestions.length || 1)) * 100}%` }}
              />
            </div>

            {/* Quick Question Bubble Selector */}
            <div className="flex items-center space-x-2 mt-3 overflow-x-auto pb-1">
              {studentQuestions.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                        : isAnswered
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Question Card (Supports multiple choice, open-ended, matching + image) */}
          <QuestionCard
            question={currentQ}
            questionNumber={currentQuestionIdx + 1}
            currentAnswer={selectedAnswers[currentQ.id]}
            onAnswerChange={handleAnswerChange}
          />

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIdx === 0}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed bg-slate-900/60 border border-slate-700 hover:border-slate-600 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {currentQuestionIdx < studentQuestions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx((prev) => Math.min(studentQuestions.length - 1, prev + 1))}
                className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Finalizar Examen</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          ANTI-CHEAT WARNING MODAL
          ======================================================== */}
      {activeWarningModal !== null && examStatus === 'in_progress' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4 border border-rose-500/40">
              <AlertOctagon className="w-9 h-9 animate-bounce" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest bg-rose-500/20 text-rose-400 border border-rose-500/30 mb-2">
              ⚠️ Infracción Anti-Trampas Detectada
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-white mt-1">
              ADVERTENCIA #{activeWarningModal} DE 3
            </h3>

            <p className="text-slate-300 text-sm mt-3 leading-relaxed">
              Has cambiado de pestaña, minimizado el navegador o desenfocado la ventana del examen.
            </p>

            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3.5 my-4 text-xs text-left text-slate-300 space-y-1">
              <div className="flex items-center text-amber-400 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                <span>Notificación enviada al profesor en vivo:</span>
              </div>
              <p className="font-mono text-slate-400">• Alumno: {fullName} ({matricula})</p>
              <p className="font-mono text-slate-400">• Evento: Salida de pestaña a las {new Date().toLocaleTimeString()}</p>
              <p className="font-mono text-rose-400 font-semibold">• Faltas acumuladas: {activeWarningModal} de 3 permitidas.</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveWarningModal(null)}
              className="mt-4 w-full py-3 px-5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg transition-all uppercase tracking-wider"
            >
              Comprendo y vuelvo a mi examen
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM SUBMISSION MODAL
          ======================================================== */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">¿Estás seguro de enviar tu examen?</h3>
            <p className="text-xs text-slate-400 mt-2">
              Has respondido <strong className="text-indigo-400">{answeredCount}</strong> de{' '}
              <strong>{activeQuestions.length}</strong> preguntas.
            </p>

            <div className="flex items-center space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700"
              >
                Revisar
              </button>
              <button
                type="button"
                onClick={handleNormalSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md"
              >
                Sí, enviar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STAGE 4: RESULTS & COMPREHENSIVE FEEDBACK
          ======================================================== */}
      {(examStatus === 'submitted' || examStatus === 'forced_submission_cheat') && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Status Alert Banner */}
          {examStatus === 'forced_submission_cheat' ? (
            <div className="rounded-3xl bg-rose-500/15 border-2 border-rose-500/60 p-6 shadow-2xl">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-2xl bg-rose-600 text-white shrink-0 shadow-lg shadow-rose-600/30">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider bg-rose-600 text-white mb-1">
                    Sanción Anti-Trampas Aplicada
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-rose-300">
                    Examen Cancelado y Enviado Automáticamente
                  </h2>
                  <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                    Alcanzaste el límite de <strong>3 advertencias por cambio de pestaña</strong>. El sistema bloqueó la prueba y envió tus respuestas hasta la última falta registrada.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-emerald-500/15 border border-emerald-500/40 p-6 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-emerald-600 text-white shrink-0 shadow-lg">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-emerald-300">
                    ¡Examen Entregado con Éxito!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Tus respuestas y comprobante de integridad fueron registrados en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Score Card */}
          <div className="bg-slate-800/90 rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="text-center md:border-r border-slate-700/80 md:pr-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Calificación Final
                </p>
                <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                  {earnedPoints} <span className="text-2xl text-slate-500 font-normal">/ {totalExamPoints}</span>
                </div>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase">
                  {percentage >= 60 ? (
                    <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-0.5 rounded-full">
                      Aprobado ({percentage}%)
                    </span>
                  ) : (
                    <span className="text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-0.5 rounded-full">
                      No Aprobado ({percentage}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 md:col-span-2">
                <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                  <span className="text-slate-400">Alumno:</span>
                  <span className="font-semibold text-white">{fullName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                  <span className="text-slate-400">Matrícula:</span>
                  <span className="font-mono font-semibold text-indigo-300">{matricula.toUpperCase()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-700/60">
                  <span className="text-slate-400">Infracciones de Pestaña:</span>
                  <span className={`font-bold ${warningsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {warningsCount} falta(s) registrada(s)
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Hora de entrega:</span>
                  <span className="font-mono text-slate-300">
                    {examSubmittedTime ? new Date(examSubmittedTime).toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {cheatLogs.length > 0 && (
              <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-rose-500/30">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  Bitácora de Salidas de Pestaña ({cheatLogs.length}):
                </h4>
                <div className="space-y-1.5">
                  {cheatLogs.map((log, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-slate-300 flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded-xl">
                      <span>Falta #{log.warningNumber}: {log.reason}</span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Award className="w-5 h-5 text-indigo-400" />
              <span>Retroalimentación Pedagógica de Reactivos</span>
            </h3>

            {activeQuestions.map((q, idx) => {
              const studentAnswer = selectedAnswers[q.id];

              return (
                <div key={q.id} className="rounded-3xl border border-slate-700/80 bg-slate-800/70 p-5 sm:p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">Pregunta {idx + 1}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700 uppercase">
                        {q.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      {q.points} pts
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white">
                    {q.question}
                  </h4>

                  {q.imageUrl && (
                    <div className="my-2 max-w-sm rounded-xl overflow-hidden border border-slate-700">
                      <img src={q.imageUrl} alt="" className="max-h-48 w-full object-cover" />
                    </div>
                  )}

                  {/* Multiple choice review */}
                  {q.type === 'opcion_multiple' && q.options && (
                    <div className="space-y-1.5 text-xs">
                      {q.options.map((opt, optIdx) => {
                        const isStudent = studentAnswer === optIdx;
                        const isCorrect = q.correctAnswer === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold'
                                : isStudent
                                ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                                : 'bg-slate-900/40 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span>{String.fromCharCode(65 + optIdx)}) {opt}</span>
                            {isCorrect && <span className="text-emerald-400 font-bold">✓ Correcta</span>}
                            {isStudent && !isCorrect && <span className="text-rose-400 font-bold">✗ Tu respuesta</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Matching review */}
                  {q.type === 'relacionar' && q.pairs && (
                    <div className="space-y-2 text-xs">
                      <p className="text-slate-400 font-semibold text-[11px]">Correspondencia de Columnas:</p>
                      {q.pairs.map((p) => {
                        const studentPick = (studentAnswer || {})[p.id];
                        const isRight = studentPick === p.right;
                        return (
                          <div key={p.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                            <span className="font-semibold text-white">{p.left}</span>
                            <span className={`font-mono ${isRight ? 'text-emerald-400 font-bold' : 'text-rose-400'}`}>
                              → {studentPick || '(Sin responder)'} {isRight ? '✓' : `(Correcta: ${p.right})`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Open-ended review */}
                  {q.type === 'abierta' && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-slate-300">
                        <span className="font-bold text-indigo-400 block mb-1">Tu respuesta escrita:</span>
                        <p className="italic">{studentAnswer || 'Sin respuesta'}</p>
                      </div>
                      {q.referenceAnswer && (
                        <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-500/30 text-emerald-300">
                          <span className="font-bold block mb-1">Respuesta modelo / Criterio:</span>
                          <p>{q.referenceAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pedagogical Explanation */}
                  <div className="bg-slate-900/80 rounded-2xl p-3.5 border border-slate-800 text-xs text-slate-300">
                    <p className="font-semibold text-indigo-300 mb-1">💡 Retroalimentación pedagógica:</p>
                    <p className="leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Realizar nuevo intento (Reiniciar)</span>
            </button>

            {onSwitchToTeacher && !isStudentOnly && (
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
              >
                <span>Ver Panel del Profesor</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
