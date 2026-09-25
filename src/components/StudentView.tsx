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
  EyeOff, 
  Info,
  Flame,
  Atom,
  HelpCircle,
  AlertOctagon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, StudentExamState, CheatLog, StudentStatus } from '../types';
import { firebaseService, ExamDataPayload } from '../services/firebaseService';
import { soundManager } from '../services/soundEffects';

interface StudentViewProps {
  onSwitchToTeacher?: () => void;
}

export const StudentView: React.FC<StudentViewProps> = ({ onSwitchToTeacher }) => {
  // Dynamic Exam Content
  const [examData, setExamData] = useState<ExamDataPayload>(firebaseService.getActiveExam());
  const activeQuestions: Question[] = examData.questions || [];
  const totalExamPoints = activeQuestions.reduce((acc, q) => acc + q.points, 0) || 100;

  // Registration State
  const [fullName, setFullName] = useState('');
  const [matricula, setMatricula] = useState('');
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  const [isExamStarted, setIsExamStarted] = useState(false);

  // Active Exam State
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [examStatus, setExamStatus] = useState<StudentStatus>('not_started');
  const [examStartTime, setExamStartTime] = useState<number>(0);
  const [examSubmittedTime, setExamSubmittedTime] = useState<number | undefined>(undefined);
  const [timeRemaining, setTimeRemaining] = useState<number>(15 * 60); // 15 minutes in seconds

  // Anti-Cheat State
  const [warningsCount, setWarningsCount] = useState<number>(0);
  const [cheatLogs, setCheatLogs] = useState<CheatLog[]>([]);
  const [activeWarningModal, setActiveWarningModal] = useState<number | null>(null);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);

  // Subscribe to dynamic exam questions
  useEffect(() => {
    const unsub = firebaseService.subscribeToExam((data) => {
      setExamData(data);
    });
    return () => unsub();
  }, []);

  // Ref to track latest state for event handlers without stale closures
  const stateRef = useRef({
    isExamStarted,
    examStatus,
    warningsCount,
    selectedAnswers,
    matricula,
    fullName,
    examStartTime,
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
      examStartTime,
      cheatLogs,
      activeQuestions,
      totalExamPoints,
      examTitle: examData.title
    };
  });

  // Calculate current score based on active questions
  const calculateScore = useCallback((answers: Record<string, number>) => {
    let earnedPoints = 0;
    const questions = stateRef.current.activeQuestions;
    const maxPts = stateRef.current.totalExamPoints;

    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        earnedPoints += q.points;
      }
    });
    const percentage = maxPts > 0 ? Math.round((earnedPoints / maxPts) * 100) : 0;
    return { earnedPoints, percentage };
  }, []);

  // Sync current student state to Firebase
  const syncToCloud = useCallback(async (
    statusOverride?: StudentStatus, 
    warningsOverride?: number, 
    logsOverride?: CheatLog[],
    answersOverride?: Record<string, number>
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
      startedAt: stateRef.current.examStartTime || Date.now(),
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

    await firebaseService.syncStudent(studentRecord);
  }, [calculateScore, currentQuestionIdx]);

  // Handle Cheating / Tab Switching Detection
  const handleViolationDetected = useCallback((reason: string) => {
    const { isExamStarted, examStatus, warningsCount, cheatLogs } = stateRef.current;
    
    // Only trigger if exam is actively in progress
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
      // 3rd Warning: Force Submit Immediately
      soundManager.playCriticalAlarm();
      setExamStatus('forced_submission_cheat');
      setExamSubmittedTime(Date.now());
      syncToCloud('forced_submission_cheat', newWarningNum, updatedLogs);
    } else {
      // 1st or 2nd Warning
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
        // Debounce within 1 second to avoid duplicate events from blur+visibilitychange
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

  // Countdown Timer
  useEffect(() => {
    if (!isExamStarted || examStatus !== 'in_progress') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleNormalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamStarted, examStatus]);

  // Start Exam
  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !matricula.trim()) {
      alert('Por favor completa tu Nombre y tu Código/Matrícula para continuar.');
      return;
    }
    if (!hasAcceptedRules) {
      alert('Debes confirmar que has leído las normas anti-trampas.');
      return;
    }

    const startTimestamp = Date.now();
    setExamStartTime(startTimestamp);
    setIsExamStarted(true);
    setExamStatus('in_progress');
    setWarningsCount(0);
    setCheatLogs([]);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setTimeRemaining(15 * 60);

    soundManager.playClick();

    const initialStudent: StudentExamState = {
      id: matricula.trim().toUpperCase(),
      matricula: matricula.trim().toUpperCase(),
      fullName: fullName.trim(),
      examId: 'quimica_general_2026',
      examTitle: examData.title,
      status: 'in_progress',
      startedAt: startTimestamp,
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

  // Select Option
  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (examStatus !== 'in_progress') return;
    soundManager.playClick();

    const updated = {
      ...selectedAnswers,
      [questionId]: optionIdx
    };
    setSelectedAnswers(updated);
    syncToCloud('in_progress', warningsCount, cheatLogs, updated);
  };

  // Normal Submit
  const handleNormalSubmit = () => {
    setIsSubmitConfirmOpen(false);
    setExamStatus('submitted');
    setExamSubmittedTime(Date.now());
    soundManager.playSuccessChime();

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // Ignored
    }

    syncToCloud('submitted');
  };

  // Restart / Retake
  const handleRestart = () => {
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

  const currentQ = activeQuestions[currentQuestionIdx] || activeQuestions[0];
  const { earnedPoints, percentage } = calculateScore(selectedAnswers);
  const answeredCount = Object.keys(selectedAnswers).length;

  if (activeQuestions.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 text-indigo-400 mx-auto flex items-center justify-center mb-4">
          <Atom className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white">Cargando preguntas del examen...</h3>
        <p className="text-xs text-slate-400 mt-1">
          El profesor aún no ha publicado las preguntas o se están sincronizando con Firebase.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ========================================================
          STEP 1: REGISTRATION & PROCTORING RULES
          ======================================================== */}
      {!isExamStarted && examStatus === 'not_started' && (
        <div className="bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/25 mb-4 text-white">
              <Atom className="w-8 h-8 animate-spin-slow" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {examData.title}
            </h1>
            <p className="text-slate-400 mt-2 text-xs sm:text-sm">
              Evaluación interactiva supervisada ({activeQuestions.length} reactivos • {totalExamPoints} puntos). Ingresa tus datos para comenzar.
            </p>
          </div>

          <form onSubmit={handleStartExam} className="max-w-xl mx-auto space-y-6">
            {/* Student Name */}
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
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* Matricula / Code */}
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
                  className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm font-medium font-mono uppercase"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Este código identificará tu examen en el panel de supervisión en tiempo real del docente.
              </p>
            </div>

            {/* ANTI-CHEAT PLEDGE NOTICE */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 border border-amber-500/30 p-4 sm:p-5">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm text-slate-300 space-y-2">
                  <h4 className="font-bold text-amber-300 uppercase tracking-wide text-xs">
                    Normativa del Sistema Anti-Trampas (Proctoring Activo)
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                    <li>
                      <strong>Detección de pestañas:</strong> Si cambias de pestaña, minimizas el navegador o abres otra aplicación, el sistema registrará una falta de forma instantánea.
                    </li>
                    <li>
                      <strong>Alerta al profesor:</strong> Cada intento de cambiar de ventana se notifica en el panel del docente con fecha y hora exacta.
                    </li>
                    <li>
                      <strong className="text-rose-400">Regla de las 3 faltas:</strong> A la 3ra advertencia, el sistema bloqueará tu examen y se enviará <em>automáticamente</em> con la calificación obtenida hasta ese instante.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Checkbox agreement */}
              <label className="flex items-center space-x-3 mt-4 pt-3 border-t border-amber-500/20 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAcceptedRules}
                  onChange={(e) => setHasAcceptedRules(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-600 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-200">
                  He leído y acepto las condiciones de supervisión anti-trampas para este examen.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!hasAcceptedRules || !fullName.trim() || !matricula.trim()}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>Comenzar Examen</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          STEP 2: ACTIVE EXAM IN PROGRESS
          ======================================================== */}
      {isExamStarted && examStatus === 'in_progress' && currentQ && (
        <div className="space-y-6">
          {/* Top Proctoring Bar */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
            {/* Student Info */}
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

            {/* Anti-cheat Warnings Badge */}
            <div className="flex items-center space-x-2">
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
                <span>
                  Faltas: {warningsCount} / 3
                </span>
                {warningsCount >= 2 && (
                  <span className="text-[10px] uppercase tracking-wider bg-rose-600 text-white px-1.5 py-0.5 rounded">
                    ¡Peligro!
                  </span>
                )}
              </div>

              {/* Timer */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center space-x-2 text-xs font-mono font-semibold text-slate-200">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>{formatTimer(timeRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/60 p-3 sm:p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Pregunta {currentQuestionIdx + 1} de {activeQuestions.length}</span>
              <span>{answeredCount} de {activeQuestions.length} respondidas ({Math.round((answeredCount / activeQuestions.length) * 100)}%)</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / activeQuestions.length) * 100}%` }}
              />
            </div>

            {/* Question Quick Navigation Bubbles */}
            <div className="flex items-center space-x-2 mt-3 overflow-x-auto pb-1">
              {activeQuestions.map((q, idx) => {
                const isAnswered = selectedAnswers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIdx;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
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

          {/* Current Question Card */}
          <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 sm:p-8 shadow-xl">
            {/* Topic & Points Badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Flame className="w-3.5 h-3.5 mr-1 text-pink-400" />
                {currentQ.topic || 'Reactivo'}
              </span>
              <span className="text-xs font-bold text-slate-400 font-mono">
                Valor: {currentQ.points} pts
              </span>
            </div>

            {/* Question Title */}
            <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed mb-4">
              {currentQ.question}
            </h2>

            {/* Formula / Chemical Context (if present) */}
            {currentQ.formula && (
              <div className="mb-6 p-3.5 bg-slate-900/90 rounded-xl border border-slate-700/80 flex items-center justify-center">
                <span className="font-mono text-sm sm:text-base font-bold text-pink-400 tracking-wider">
                  {currentQ.formula}
                </span>
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3 mb-8">
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswers[currentQ.id] === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // A, B, C, D
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(currentQ.id, optIdx)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-900 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center font-mono shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {letter}
                    </div>
                    <span className="text-sm font-medium leading-snug flex-1">
                      {opt}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Question Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700/60">
              <button
                type="button"
                onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestionIdx === 0}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed bg-slate-900/50 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              {currentQuestionIdx < activeQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIdx((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
                  className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all"
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
        </div>
      )}

      {/* ========================================================
          ANTI-CHEAT WARNING MODAL (Appears on Tab Switch)
          ======================================================== */}
      {activeWarningModal !== null && examStatus === 'in_progress' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-slate-900 border-2 border-rose-500/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-rose-500/30 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500 animate-pulse" />

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
                <span>Reporte automático enviado al profesor:</span>
              </div>
              <p className="font-mono text-slate-400">
                • Alumno: <span className="text-white">{fullName}</span> ({matricula})
              </p>
              <p className="font-mono text-slate-400">
                • Evento: Cambio de ventana ({new Date().toLocaleTimeString()})
              </p>
              <p className="font-mono text-rose-400 font-semibold">
                • Advertencias acumuladas: {activeWarningModal} de 3 permitidas.
              </p>
            </div>

            {activeWarningModal === 1 && (
              <p className="text-xs text-amber-300 font-medium">
                Esta es tu 1ra advertencia. Por favor permanece en esta pantalla hasta concluir la prueba.
              </p>
            )}

            {activeWarningModal === 2 && (
              <p className="text-xs text-rose-300 font-bold">
                ¡ATENCIÓN! Estás a UNA sola falta de que tu examen sea CANCELADO y expulsado con tu nota actual.
              </p>
            )}

            <button
              type="button"
              onClick={() => setActiveWarningModal(null)}
              className="mt-5 w-full py-3 px-5 rounded-xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all uppercase tracking-wider"
            >
              Comprendo y continúo mi examen
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM SUBMISSION MODAL
          ======================================================== */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">¿Estás seguro de enviar tu examen?</h3>
            <p className="text-xs text-slate-400 mt-2">
              Has respondido <strong className="text-indigo-400">{answeredCount}</strong> de{' '}
              <strong>{activeQuestions.length}</strong> preguntas. Una vez enviado no podrás modificar tus respuestas.
            </p>

            <div className="flex items-center space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Revisar preguntas
              </button>
              <button
                type="button"
                onClick={handleNormalSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-colors"
              >
                Sí, enviar ahora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 3: RESULTS & PEDAGOGICAL FEEDBACK
          ======================================================== */}
      {(examStatus === 'submitted' || examStatus === 'forced_submission_cheat') && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Status Alert Banner */}
          {examStatus === 'forced_submission_cheat' ? (
            <div className="rounded-2xl bg-rose-500/15 border-2 border-rose-500/60 p-6 shadow-2xl">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-rose-600 text-white shrink-0 shadow-lg shadow-rose-600/30">
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
                    Alcanzaste el límite máximo de <strong>3 advertencias por cambio de ventana o pestaña</strong>. 
                    El sistema bloqueó la prueba y envió tus respuestas acumuladas hasta la última falta registrada.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-6 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-xl bg-emerald-600 text-white shrink-0 shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-emerald-300">
                    ¡Examen Enviado con Éxito!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1">
                    Tus respuestas y comprobante de integridad fueron registrados en la base de datos en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Student Score Summary Card */}
          <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-6 sm:p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Score Big Pill */}
              <div className="text-center md:border-r border-slate-700/80 md:pr-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Calificación Final
                </p>
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
                  {earnedPoints} <span className="text-2xl text-slate-500 font-normal">/ {totalExamPoints}</span>
                </div>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
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

              {/* Integrity & Metadata */}
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
                  <span className="text-slate-400">Hora de envío:</span>
                  <span className="font-mono text-slate-300">
                    {examSubmittedTime ? new Date(examSubmittedTime).toLocaleTimeString() : new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>

            {/* If there were cheat logs, display an audit box */}
            {cheatLogs.length > 0 && (
              <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-rose-500/30">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  Bitácora de Salidas de Pestaña Detectadas ({cheatLogs.length}):
                </h4>
                <div className="space-y-1.5">
                  {cheatLogs.map((log, idx) => (
                    <div key={idx} className="text-[11px] font-mono text-slate-300 flex items-center justify-between bg-slate-800/60 px-3 py-1.5 rounded">
                      <span>Falta #{log.warningNumber}: {log.reason}</span>
                      <span className="text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Retroalimentación Detallada Pregunta por Pregunta */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Award className="w-5 h-5 text-indigo-400" />
                <span>Retroalimentación Pedagógica Detallada</span>
              </h3>
              <span className="text-xs text-slate-400">
                {activeQuestions.filter((q) => selectedAnswers[q.id] === q.correctAnswer).length} de {activeQuestions.length} aciertos
              </span>
            </div>

            {activeQuestions.map((q, idx) => {
              const studentAnswerIdx = selectedAnswers[q.id];
              const isCorrect = studentAnswerIdx === q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`rounded-2xl border p-5 sm:p-6 transition-all ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        Pregunta {idx + 1}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {q.topic}
                      </span>
                    </div>
                    {isCorrect ? (
                      <span className="inline-flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        +{q.points} pts
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-400" />
                        0 pts
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-white mb-3">
                    {q.question}
                  </h4>

                  {q.formula && (
                    <div className="mb-3 px-3 py-1.5 rounded bg-slate-900/80 font-mono text-xs font-semibold text-pink-400 inline-block">
                      {q.formula}
                    </div>
                  )}

                  {/* Options Review */}
                  <div className="space-y-2 mb-4">
                    {q.options.map((opt, optIdx) => {
                      const isStudentPick = studentAnswerIdx === optIdx;
                      const isTheCorrectOne = q.correctAnswer === optIdx;

                      let rowStyle = 'bg-slate-900/40 border-slate-800 text-slate-400';
                      if (isTheCorrectOne) {
                        rowStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold';
                      } else if (isStudentPick && !isCorrect) {
                        rowStyle = 'bg-rose-500/15 border-rose-500/40 text-rose-200';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${rowStyle}`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-800/80 font-bold">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span>{opt}</span>
                          </div>

                          <div className="shrink-0 text-xs font-semibold">
                            {isTheCorrectOne && (
                              <span className="text-emerald-400 flex items-center">
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Correcta
                              </span>
                            )}
                            {isStudentPick && !isCorrect && (
                              <span className="text-rose-400 flex items-center">
                                <XCircle className="w-4 h-4 mr-1" />
                                Tu respuesta
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation from RETROALIMENTACION: */}
                  <div className="bg-slate-900/70 rounded-xl p-3.5 border border-slate-800 text-xs text-slate-300">
                    <p className="font-semibold text-indigo-300 mb-1 flex items-center">
                      <Info className="w-3.5 h-3.5 mr-1" />
                      Retroalimentación Pedagógica:
                    </p>
                    <p className="leading-relaxed text-slate-300">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
            <button
              type="button"
              onClick={handleRestart}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Realizar nuevo intento (Reiniciar)</span>
            </button>

            {onSwitchToTeacher && (
              <button
                type="button"
                onClick={onSwitchToTeacher}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-colors"
              >
                <span>Ver cómo se reflejó esto en el Panel del Profesor</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
