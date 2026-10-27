import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Send, 
  Info,
  Check,
  FolderOpen,
  PlusCircle,
  Clock,
  Trash2,
  Play,
  RotateCcw,
  BookOpen,
  Layers,
  Save,
  AlignLeft,
  ArrowRightLeft,
  CheckSquare,
  ListChecks,
  HelpCircle,
  Plus,
  Copy,
  ArrowUp,
  ArrowDown,
  Zap,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Edit3
} from 'lucide-react';
import { 
  parsePlainTextExam, 
  convertQuestionsToPlainText,
  SAMPLE_MIXED_EXAM, 
  SAMPLE_MULTIPLE_CHOICE_EXAM, 
  SAMPLE_TRUE_FALSE_EXAM, 
  SAMPLE_MATCHING_EXAM, 
  SAMPLE_OPEN_EXAM,
  ParseResult 
} from '../services/examParser';
import { firebaseService } from '../services/firebaseService';
import { Question, SavedExam, QuestionType, ColumnPair } from '../types';

interface ExamLoaderModalProps {
  isOpen: boolean;
  initialTab?: 'create' | 'library';
  onClose: () => void;
  onExamLoaded: (title: string, questions: Question[], examId?: string, durationMinutes?: number) => void;
}

export const ExamLoaderModal: React.FC<ExamLoaderModalProps> = ({
  isOpen,
  initialTab = 'create',
  onClose,
  onExamLoaded
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'library'>(initialTab);
  const [editorMode, setEditorMode] = useState<'visual' | 'text'>('visual');
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  
  // Create / Edit Form State
  const [examTitle, setExamTitle] = useState('Examen de Química General (Multi-Reactivo)');
  const [examDescription, setExamDescription] = useState('Evaluación combinada: opción múltiple, verdadero/falso, relacionar y abiertas');
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(20);
  
  // Visual Questions State
  const [visualQuestions, setVisualQuestions] = useState<Question[]>([]);
  const [expandedAdvancedIdx, setExpandedAdvancedIdx] = useState<Record<number, boolean>>({});

  // Plain Text State & Parse Result
  const [plainText, setPlainText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [clearPreviousStudents, setClearPreviousStudents] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [previewingExamId, setPreviewingExamId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const list = firebaseService.getSavedExams();
      setSavedExams(list);

      // If empty on open, load the 4-type mixed sample into both visual and text editors
      if (visualQuestions.length === 0 && !plainText.trim()) {
        const res = parsePlainTextExam(SAMPLE_MIXED_EXAM);
        setVisualQuestions(res.questions);
        setPlainText(SAMPLE_MIXED_EXAM);
        setParseResult(res);
      }
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const unsub = firebaseService.subscribeToSavedExams((exams) => {
      setSavedExams(exams);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const currentActiveTitle = firebaseService.getActiveExam().title;

  // Calculate total points
  const totalPoints = visualQuestions.reduce((acc, q) => acc + (q.points || 0), 0);

  // Calibrate all questions to sum exactly 100 points
  const handleCalibratePoints = () => {
    if (visualQuestions.length === 0) return;
    const basePts = Math.floor(100 / visualQuestions.length);
    let running = 0;
    const updated = visualQuestions.map((q, idx) => {
      if (idx === visualQuestions.length - 1) {
        return { ...q, points: Math.max(1, 100 - running) };
      }
      running += basePts;
      return { ...q, points: basePts };
    });
    setVisualQuestions(updated);
    setPlainText(convertQuestionsToPlainText(updated));
    setStatusMessage({
      text: `⚡ Se calibraron equitativamente los reactivos para sumar exactamente 100 puntos.`,
      isError: false
    });
  };

  // Switch between Visual mode and Plain text mode with bidirectional sync
  const handleSwitchMode = (mode: 'visual' | 'text') => {
    if (mode === 'text' && editorMode === 'visual') {
      // Sync visual questions to plain text
      const generated = convertQuestionsToPlainText(visualQuestions);
      setPlainText(generated);
    } else if (mode === 'visual' && editorMode === 'text') {
      // Parse plain text to visual questions
      if (plainText.trim()) {
        const result = parsePlainTextExam(plainText);
        setParseResult(result);
        if (result.questions.length > 0) {
          setVisualQuestions(result.questions);
        }
      }
    }
    setEditorMode(mode);
  };

  // Visual Question Handlers
  const handleAddQuestion = (type: QuestionType) => {
    const newId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultPts = Math.max(1, Math.round(100 / (visualQuestions.length + 1)));

    let newQ: Question;

    if (type === 'opcion_multiple') {
      newQ = {
        id: newId,
        type: 'opcion_multiple',
        topic: 'Química General',
        question: 'Escribe aquí la pregunta de opción múltiple...',
        options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
        correctAnswer: 0,
        explanation: 'Explicación de la opción correcta.',
        points: defaultPts
      };
    } else if (type === 'verdadero_falso') {
      newQ = {
        id: newId,
        type: 'verdadero_falso',
        topic: 'Conceptos Teóricos',
        question: 'Escribe la afirmación que el alumno evaluará como Verdadera o Falsa...',
        options: ['Verdadero', 'Falso'],
        correctAnswer: 0, // 0 = Verdadero, 1 = Falso
        explanation: 'Justificación de por qué la afirmación es verdadera o falsa.',
        points: defaultPts
      };
    } else if (type === 'relacionar') {
      newQ = {
        id: newId,
        type: 'relacionar',
        topic: 'Correspondencia y Relaciones',
        question: 'Relaciona cada elemento de la Columna A con su correspondencia en la Columna B:',
        pairs: [
          { id: `p_${Date.now()}_1`, left: 'Elemento / Concepto 1', right: 'Definición / Clave 1' },
          { id: `p_${Date.now()}_2`, left: 'Elemento / Concepto 2', right: 'Definición / Clave 2' },
          { id: `p_${Date.now()}_3`, left: 'Elemento / Concepto 3', right: 'Definición / Clave 3' },
          { id: `p_${Date.now()}_4`, left: 'Elemento / Concepto 4', right: 'Definición / Clave 4' }
        ],
        explanation: 'Explicación del criterio de correspondencia de cada par.',
        points: defaultPts
      };
    } else {
      // type === 'abierta'
      newQ = {
        id: newId,
        type: 'abierta',
        topic: 'Desarrollo y Fundamentación',
        question: 'Escribe la consigna o pregunta abierta de desarrollo...',
        referenceAnswer: 'Respuesta modelo, conceptos clave y criterios pedagógicos de evaluación.',
        explanation: 'Rúbrica de evaluación y justificación conceptual.',
        points: defaultPts
      };
    }

    const updated = [...visualQuestions, newQ];
    setVisualQuestions(updated);
    setPlainText(convertQuestionsToPlainText(updated));
    setStatusMessage({
      text: `✓ Se agregó un nuevo reactivo de tipo "${type === 'opcion_multiple' ? 'Opción Múltiple' : type === 'verdadero_falso' ? 'Verdadero o Falso' : type === 'relacionar' ? 'Relacionar Columnas' : 'Pregunta Abierta'}".`,
      isError: false
    });
  };

  const handleUpdateQuestion = (index: number, patch: Partial<Question>) => {
    setVisualQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const handleChangeQuestionType = (index: number, newType: QuestionType) => {
    setVisualQuestions((prev) => {
      const updated = [...prev];
      const old = updated[index];
      const base = {
        id: old.id,
        type: newType,
        topic: old.topic,
        question: old.question,
        imageUrl: old.imageUrl,
        formula: old.formula,
        points: old.points,
        explanation: old.explanation
      };

      if (newType === 'opcion_multiple') {
        updated[index] = {
          ...base,
          options: old.options && old.options.length >= 2 ? old.options : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
          correctAnswer: typeof old.correctAnswer === 'number' ? old.correctAnswer : 0
        };
      } else if (newType === 'verdadero_falso') {
        updated[index] = {
          ...base,
          options: ['Verdadero', 'Falso'],
          correctAnswer: 0 // 0 = Verdadero
        };
      } else if (newType === 'relacionar') {
        updated[index] = {
          ...base,
          pairs: old.pairs && old.pairs.length >= 2 ? old.pairs : [
            { id: `p1`, left: 'Concepto 1', right: 'Definición 1' },
            { id: `p2`, left: 'Concepto 2', right: 'Definición 2' },
            { id: `p3`, left: 'Concepto 3', right: 'Definición 3' }
          ]
        };
      } else {
        // abierta
        updated[index] = {
          ...base,
          referenceAnswer: old.referenceAnswer || 'Respuesta modelo / criterios de evaluación'
        };
      }
      return updated;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (visualQuestions.length === 1) {
      if (!confirm('¿Deseas eliminar el único reactivo del examen?')) return;
    }
    setVisualQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDuplicateQuestion = (index: number) => {
    const original = visualQuestions[index];
    const cloned: Question = {
      ...JSON.parse(JSON.stringify(original)),
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: `${original.question} (Copia)`
    };
    const updated = [...visualQuestions];
    updated.splice(index + 1, 0, cloned);
    setVisualQuestions(updated);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === visualQuestions.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Sub-helpers for Opción Múltiple
  const handleAddOption = (qIdx: number) => {
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const currentOpts = q.options || [];
      const newLetter = String.fromCharCode(65 + currentOpts.length);
      copy[qIdx] = {
        ...q,
        options: [...currentOpts, `Opción ${newLetter}`]
      };
      return copy;
    });
  };

  const handleDeleteOption = (qIdx: number, optIdx: number) => {
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const currentOpts = q.options || [];
      if (currentOpts.length <= 2) return prev; // Keep at least 2 options
      const newOpts = currentOpts.filter((_, idx) => idx !== optIdx);
      let newCorrect = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
      if (newCorrect >= newOpts.length) newCorrect = newOpts.length - 1;
      copy[qIdx] = {
        ...q,
        options: newOpts,
        correctAnswer: newCorrect
      };
      return copy;
    });
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, val: string) => {
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const currentOpts = [...(q.options || [])];
      currentOpts[optIdx] = val;
      copy[qIdx] = { ...q, options: currentOpts };
      return copy;
    });
  };

  // Sub-helpers for Relacionar Columnas
  const handleAddPair = (qIdx: number) => {
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const pairs = q.pairs || [];
      const pNum = pairs.length + 1;
      copy[qIdx] = {
        ...q,
        pairs: [
          ...pairs,
          { id: `p_${Date.now()}_${pNum}`, left: `Elemento ${pNum}`, right: `Correspondencia ${pNum}` }
        ]
      };
      return copy;
    });
  };

  const handleDeletePair = (qIdx: number, pairIdx: number) => {
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const pairs = q.pairs || [];
      if (pairs.length <= 2) return prev; // Keep at least 2 pairs
      copy[qIdx] = {
        ...q,
        pairs: pairs.filter((_, idx) => idx !== pairIdx)
      };
      return copy;
    });
  };

  const handleUpdatePair = (qIdx: number, pairIdx: number, side: 'left' | 'right', val: string) => {
    setVisualQuestions((prev) => {
      const copy = [...prev];
      const q = copy[qIdx];
      const pairs = [...(q.pairs || [])];
      pairs[pairIdx] = { ...pairs[pairIdx], [side]: val };
      copy[qIdx] = { ...q, pairs };
      return copy;
    });
  };

  // Text Parser Trigger
  const handleParse = () => {
    if (!plainText.trim()) {
      setStatusMessage({ text: 'Por favor escribe o pega tus preguntas en el editor.', isError: true });
      return;
    }

    const result = parsePlainTextExam(plainText);
    setParseResult(result);

    if (result.errors && result.errors.length > 0) {
      setStatusMessage({
        text: result.errors[0],
        isError: true
      });
    } else {
      setVisualQuestions(result.questions);
      const typeCounts: Record<string, number> = {};
      result.questions.forEach((q) => {
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
      });

      const breakdown = Object.entries(typeCounts)
        .map(([t, count]) => {
          const label = t === 'opcion_multiple' ? 'Opción múltiple' : t === 'verdadero_falso' ? 'V/F' : t === 'relacionar' ? 'Relacionar' : 'Abiertas';
          return `${count} ${label}`;
        })
        .join(', ');

      setStatusMessage({
        text: `✓ Se interpretaron ${result.questions.length} preguntas (${breakdown}) con 100 puntos calibrados.`,
        isError: false
      });
    }
  };

  // Template Loader
  const handleLoadSample = (type: 'mixed' | 'mc' | 'vf' | 'match' | 'open') => {
    let sample = SAMPLE_MIXED_EXAM;
    let title = 'Examen de Química General (Multi-Reactivo)';
    let desc = 'Evaluación combinada con los 4 tipos de reactivos';

    if (type === 'mc') {
      sample = SAMPLE_MULTIPLE_CHOICE_EXAM;
      title = 'Examen de Química (Opción Múltiple)';
      desc = 'Evaluación con preguntas de opción múltiple tradicional';
    } else if (type === 'vf') {
      sample = SAMPLE_TRUE_FALSE_EXAM;
      title = 'Examen de Química (Verdadero o Falso)';
      desc = 'Reactivos directos de afirmaciones y juicio conceptual';
    } else if (type === 'match') {
      sample = SAMPLE_MATCHING_EXAM;
      title = 'Examen de Química (Relacionar Columnas)';
      desc = 'Reactivos de correspondencia conceptual bicolumna';
    } else if (type === 'open') {
      sample = SAMPLE_OPEN_EXAM;
      title = 'Examen de Química (Preguntas Abiertas y Desarrollo)';
      desc = 'Reactivos de redacción, justificación técnica y rúbrica';
    }

    setPlainText(sample);
    setExamTitle(title);
    setExamDescription(desc);
    const result = parsePlainTextExam(sample);
    setParseResult(result);
    setVisualQuestions(result.questions);
    setStatusMessage({
      text: `Se cargó la plantilla "${title}" con ${result.questions.length} preguntas calibradas.`,
      isError: false
    });
  };

  // Save and Publish Exam
  const handleSaveAndPublish = async () => {
    let finalQuestions: Question[] = [];

    if (editorMode === 'visual') {
      finalQuestions = visualQuestions;
    } else {
      const res = parsePlainTextExam(plainText);
      finalQuestions = res.questions;
    }

    if (!finalQuestions || finalQuestions.length === 0) {
      setStatusMessage({ text: 'No se encontraron preguntas válidas para guardar o activar.', isError: true });
      return;
    }

    const finalTitle = examTitle.trim() || 'Examen Multi-Reactivo';

    // 1. Save to Saved Exams Library
    const saved = await firebaseService.saveExamToLibrary({
      title: finalTitle,
      description: examDescription.trim(),
      questions: finalQuestions,
      durationMinutes: examDurationMinutes
    });

    // 2. Set as active exam for students with unique examId
    await firebaseService.saveActiveExam(finalTitle, finalQuestions, saved.id);

    // 3. Update global session duration
    const currentSession = firebaseService.getGlobalSession();
    await firebaseService.setGlobalSession({
      ...currentSession,
      title: finalTitle,
      durationMinutes: examDurationMinutes,
      updatedAt: Date.now()
    });

    // 4. Clean previous students if requested
    if (clearPreviousStudents) {
      await firebaseService.clearAllStudents();
    }

    onExamLoaded(finalTitle, finalQuestions, saved.id, examDurationMinutes);
    setStatusMessage({ text: '¡Examen guardado en tu biblioteca y activado en tiempo real!', isError: false });

    setTimeout(() => {
      onClose();
    }, 700);
  };

  // Activate Exam from Library
  const handleActivateSavedExam = async (exam: SavedExam) => {
    await firebaseService.activateSavedExam(exam.id, clearPreviousStudents);

    onExamLoaded(exam.title, exam.questions, exam.id, exam.durationMinutes);
    setStatusMessage({ text: `✓ Examen "${exam.title}" activado con éxito.`, isError: false });

    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDeleteSavedExam = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('¿Deseas eliminar este examen de tu biblioteca guardada?')) {
      await firebaseService.deleteSavedExam(id);
      setStatusMessage({ text: 'Examen eliminado de la biblioteca.', isError: false });
    }
  };

  const handleLoadExamIntoEditor = (exam: SavedExam) => {
    setExamTitle(exam.title);
    setExamDescription(exam.description || '');
    setExamDurationMinutes(exam.durationMinutes || 20);
    setVisualQuestions(exam.questions);

    const generated = convertQuestionsToPlainText(exam.questions);
    setPlainText(generated);
    setParseResult({
      questions: exam.questions,
      warnings: [],
      errors: []
    });
    setActiveTab('create');
    setEditorMode('visual');
    setStatusMessage({
      text: `Se cargó el examen "${exam.title}" en el constructor para edición.`,
      isError: false
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-5xl w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Header with Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <span>Gestor y Creador de Exámenes</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-pink-500/20 text-indigo-300 border border-indigo-500/30">
                  4 Tipos de Preguntas
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Opción Múltiple • Verdadero o Falso • Relacionar Columnas • Preguntas Abiertas
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {/* Primary Tab switchers */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'create'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Constructor</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'library'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Mis Exámenes ({savedExams.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto text-xs text-slate-300 flex-1">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold animate-in fade-in ${
                statusMessage.isError
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {statusMessage.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ========================================================
              TAB 1: CREAR / CONSTRUCTOR DE EXAMEN
              ======================================================== */}
          {activeTab === 'create' && (
            <div className="space-y-5">
              {/* Exam General Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-end bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Título del Examen *
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Ej. Examen de Química General - Parcial I"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-semibold text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Tiempo Límite
                  </label>
                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2">
                    <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                    <input
                      type="number"
                      min="1"
                      max="240"
                      value={examDurationMinutes}
                      onChange={(e) => setExamDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-transparent text-white font-bold font-mono text-center text-xs focus:outline-none"
                    />
                    <span className="text-slate-400 font-semibold text-xs">minutos</span>
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Puntaje Total
                  </label>
                  <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono font-bold text-xs ${totalPoints === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {totalPoints} / 100 pts
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCalibratePoints}
                      title="Repartir 100 puntos de manera equitativa entre todos los reactivos"
                      className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 font-bold text-[10px] flex items-center space-x-1 transition-colors"
                    >
                      <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                      <span>Calibrar 100</span>
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-12">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Descripción o Instrucciones Generales
                  </label>
                  <input
                    type="text"
                    value={examDescription}
                    onChange={(e) => setExamDescription(e.target.value)}
                    placeholder="Instrucciones para los alumnos al inicio de la evaluación..."
                    className="w-full px-3.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Mode Toggle & Template Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Visual vs Text Mode Pill */}
                <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('visual')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      editorMode === 'visual'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Constructor Visual ({visualQuestions.length} reactivos)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchMode('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                      editorMode === 'text'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Editor de Texto / Importación</span>
                  </button>
                </div>

                {/* Templates Selector */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Plantillas rápidas:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('mixed')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 font-semibold text-[11px] transition-colors"
                  >
                    🌟 Mixto (4 Tipos)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('mc')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-indigo-300 border border-slate-700 font-semibold text-[11px] transition-colors"
                  >
                    🔘 Opción Múltiple
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('vf')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold text-[11px] transition-colors"
                  >
                    ⚖️ Verdadero / Falso
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('match')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-purple-300 border border-slate-700 font-semibold text-[11px] transition-colors"
                  >
                    🔗 Relacionar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample('open')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-pink-300 border border-slate-700 font-semibold text-[11px] transition-colors"
                  >
                    📝 Abiertas
                  </button>
                </div>
              </div>

              {/* ========================================================
                  MODE A: CONSTRUCTOR VISUAL DE PREGUNTAS
                  ======================================================== */}
              {editorMode === 'visual' && (
                <div className="space-y-5">
                  {/* Top Bar: 4 Add Question Cards */}
                  <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/90">
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center">
                      <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                      <span>Agregar Nuevo Reactivo al Examen:</span>
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* 1. Opción Múltiple */}
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('opcion_multiple')}
                        className="p-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-left transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs mb-1">
                          <CheckSquare className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span>Opción Múltiple</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Opciones A, B, C, D con respuesta única
                        </span>
                      </button>

                      {/* 2. Verdadero o Falso */}
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('verdadero_falso')}
                        className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs mb-1">
                          <HelpCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span>Verdadero o Falso</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Afirmación con juicio conceptual
                        </span>
                      </button>

                      {/* 3. Relacionar Columnas */}
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('relacionar')}
                        className="p-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs mb-1">
                          <ArrowRightLeft className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                          <span>Relacionar Columnas</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Correspondencia bicolumna de pares
                        </span>
                      </button>

                      {/* 4. Pregunta Abierta */}
                      <button
                        type="button"
                        onClick={() => handleAddQuestion('abierta')}
                        className="p-3 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-left transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-center space-x-2 text-pink-300 font-bold text-xs mb-1">
                          <AlignLeft className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                          <span>Pregunta Abierta</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Redacción libre con rúbrica modelo
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Empty state */}
                  {visualQuestions.length === 0 && (
                    <div className="text-center py-12 px-4 rounded-3xl bg-slate-900/60 border border-dashed border-slate-700 space-y-3">
                      <BookOpen className="w-10 h-10 text-slate-500 mx-auto" />
                      <h4 className="text-sm font-bold text-white">No hay reactivos en este examen aún</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Haz clic en cualquiera de los 4 botones de arriba para agregar tu primera pregunta, o carga la plantilla de 4 tipos.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleLoadSample('mixed')}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                      >
                        Cargar Plantilla con los 4 Tipos
                      </button>
                    </div>
                  )}

                  {/* List of Question Cards */}
                  <div className="space-y-4">
                    {visualQuestions.map((q, qIdx) => {
                      const isAdvancedOpen = Boolean(expandedAdvancedIdx[qIdx]);
                      
                      const typeBadge = q.type === 'verdadero_falso'
                        ? { label: 'Verdadero o Falso', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
                        : q.type === 'relacionar'
                        ? { label: 'Relacionar Columnas', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' }
                        : q.type === 'abierta'
                        ? { label: 'Pregunta Abierta', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' }
                        : { label: 'Opción Múltiple', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };

                      return (
                        <div
                          key={q.id || qIdx}
                          className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all hover:border-slate-600"
                        >
                          {/* Card Top Row: Number, Type Selector, Points, Reorder & Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
                            <div className="flex items-center space-x-2">
                              <span className="w-7 h-7 rounded-xl bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                                #{qIdx + 1}
                              </span>

                              {/* Question Type Selector Dropdown */}
                              <select
                                value={q.type}
                                onChange={(e) => handleChangeQuestionType(qIdx, e.target.value as QuestionType)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="opcion_multiple">🔘 Opción Múltiple</option>
                                <option value="verdadero_falso">⚖️ Verdadero o Falso</option>
                                <option value="relacionar">🔗 Relacionar Columnas</option>
                                <option value="abierta">📝 Pregunta Abierta</option>
                              </select>

                              {/* Category / Topic input */}
                              <input
                                type="text"
                                value={q.topic || ''}
                                onChange={(e) => handleUpdateQuestion(qIdx, { topic: e.target.value })}
                                placeholder="Tema o Categoría..."
                                className="px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 w-32 sm:w-44 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Points input */}
                              <div className="flex items-center space-x-1 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                                <span className="text-[10px] text-slate-400 uppercase font-bold">Pts:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={q.points || 25}
                                  onChange={(e) => handleUpdateQuestion(qIdx, { points: Math.max(1, parseInt(e.target.value) || 1) })}
                                  className="w-10 bg-transparent text-amber-400 font-mono font-bold text-xs text-center focus:outline-none"
                                />
                              </div>

                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={qIdx === 0}
                                onClick={() => handleMoveQuestion(qIdx, 'up')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-800/80 hover:bg-slate-800 transition-colors"
                                title="Subir reactivo"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={qIdx === visualQuestions.length - 1}
                                onClick={() => handleMoveQuestion(qIdx, 'down')}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-800/80 hover:bg-slate-800 transition-colors"
                                title="Bajar reactivo"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Duplicate */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(qIdx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 bg-slate-800/80 hover:bg-slate-800 transition-colors"
                                title="Duplicar reactivo"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(qIdx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 bg-slate-800/80 hover:bg-rose-500/10 transition-colors"
                                title="Eliminar reactivo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Question Textarea */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                              Enunciado o Pregunta *
                            </label>
                            <textarea
                              rows={2}
                              value={q.question}
                              onChange={(e) => handleUpdateQuestion(qIdx, { question: e.target.value })}
                              placeholder="Escribe aquí el texto claro de la pregunta..."
                              className="w-full p-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
                            />
                          </div>

                          {/* ========================================================
                              SPECIFIC EDITOR FOR: OPCIÓN MÚLTIPLE
                              ======================================================== */}
                          {q.type === 'opcion_multiple' && (
                            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-bold text-indigo-300 uppercase flex items-center">
                                  <ListChecks className="w-3.5 h-3.5 mr-1" />
                                  <span>Opciones de Respuesta (Marca la opción correcta con el círculo):</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleAddOption(qIdx)}
                                  className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Agregar Opción</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(q.options || []).map((opt, optIdx) => {
                                  const isCorrect = q.correctAnswer === optIdx;
                                  const letter = String.fromCharCode(65 + optIdx);

                                  return (
                                    <div
                                      key={optIdx}
                                      className={`flex items-center space-x-2 p-2 rounded-xl border transition-all ${
                                        isCorrect
                                          ? 'bg-emerald-500/10 border-emerald-500/40'
                                          : 'bg-slate-900 border-slate-800'
                                      }`}
                                    >
                                      {/* Correct selector radio */}
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQuestion(qIdx, { correctAnswer: optIdx })}
                                        className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${
                                          isCorrect
                                            ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/30'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                        title={isCorrect ? 'Esta es la respuesta correcta' : 'Clic para marcar como correcta'}
                                      >
                                        {isCorrect ? '✓' : letter}
                                      </button>

                                      {/* Option text input */}
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                        placeholder={`Texto de la opción ${letter}...`}
                                        className="flex-1 bg-transparent text-white text-xs focus:outline-none px-1"
                                      />

                                      {isCorrect && (
                                        <span className="text-[10px] font-bold text-emerald-400 shrink-0 uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                          Respuesta Correcta
                                        </span>
                                      )}

                                      {/* Remove option button (keep at least 2) */}
                                      {(q.options || []).length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteOption(qIdx, optIdx)}
                                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                                          title="Eliminar esta opción"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ========================================================
                              SPECIFIC EDITOR FOR: VERDADERO O FALSO
                              ======================================================== */}
                          {q.type === 'verdadero_falso' && (
                            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                              <label className="block text-[11px] font-bold text-emerald-300 uppercase mb-1">
                                Selecciona la Respuesta Correcta Oficial para esta afirmación:
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* VERDADERO Card */}
                                {(() => {
                                  const isSelected = q.correctAnswer === 0 || q.correctAnswer === true || q.correctAnswer === 'Verdadero';
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestion(qIdx, { correctAnswer: 0 })}
                                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                        isSelected
                                          ? 'bg-emerald-600/25 border-emerald-500 text-white font-bold ring-2 ring-emerald-500/30 shadow-md'
                                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2.5">
                                        <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs ${
                                          isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
                                        }`}>
                                          ✓
                                        </div>
                                        <div className="text-left">
                                          <span className="text-xs font-bold block">VERDADERO</span>
                                          <span className="text-[10px] text-slate-400">La afirmación es pedagógicamente cierta</span>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                          Clave Oficial
                                        </span>
                                      )}
                                    </button>
                                  );
                                })()}

                                {/* FALSO Card */}
                                {(() => {
                                  const isSelected = q.correctAnswer === 1 || q.correctAnswer === false || q.correctAnswer === 'Falso';
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateQuestion(qIdx, { correctAnswer: 1 })}
                                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                                        isSelected
                                          ? 'bg-rose-600/25 border-rose-500 text-white font-bold ring-2 ring-rose-500/30 shadow-md'
                                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2.5">
                                        <div className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center text-xs ${
                                          isSelected ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-400'
                                        }`}>
                                          ✗
                                        </div>
                                        <div className="text-left">
                                          <span className="text-xs font-bold block">FALSO</span>
                                          <span className="text-[10px] text-slate-400">La afirmación es errónea o incorrecta</span>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                                          Clave Oficial
                                        </span>
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* ========================================================
                              SPECIFIC EDITOR FOR: RELACIONAR COLUMNAS
                              ======================================================== */}
                          {q.type === 'relacionar' && (
                            <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-purple-300 uppercase flex items-center">
                                  <ArrowRightLeft className="w-3.5 h-3.5 mr-1" />
                                  <span>Parejas de Correspondencia (Columna A ➔ Columna B):</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleAddPair(qIdx)}
                                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Agregar Pareja</span>
                                </button>
                              </div>

                              <p className="text-[11px] text-slate-400 italic">
                                Escribe los conceptos en la izquierda y su correspondencia exacta en la derecha. En el examen, los alumnos verán las opciones de la derecha ordenadas aleatoriamente.
                              </p>

                              <div className="space-y-2">
                                {(q.pairs || []).map((pair, pIdx) => (
                                  <div
                                    key={pair.id || pIdx}
                                    className="flex items-center space-x-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800"
                                  >
                                    <span className="w-5 h-5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                      {pIdx + 1}
                                    </span>

                                    {/* Left Item */}
                                    <input
                                      type="text"
                                      value={pair.left}
                                      onChange={(e) => handleUpdatePair(qIdx, pIdx, 'left', e.target.value)}
                                      placeholder="Columna Izquierda (ej. HCl)"
                                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />

                                    <span className="text-purple-400 font-bold shrink-0">➔</span>

                                    {/* Right Match */}
                                    <input
                                      type="text"
                                      value={pair.right}
                                      onChange={(e) => handleUpdatePair(qIdx, pIdx, 'right', e.target.value)}
                                      placeholder="Columna Derecha (ej. Ácido Hidrácido)"
                                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    />

                                    {/* Delete pair */}
                                    {(q.pairs || []).length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeletePair(qIdx, pIdx)}
                                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                                        title="Eliminar pareja"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ========================================================
                              SPECIFIC EDITOR FOR: PREGUNTA ABIERTA
                              ======================================================== */}
                          {q.type === 'abierta' && (
                            <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                              <label className="block text-[11px] font-bold text-pink-300 uppercase">
                                Respuesta Modelo / Criterios de Evaluación (Rúbrica):
                              </label>
                              <textarea
                                rows={3}
                                value={q.referenceAnswer || ''}
                                onChange={(e) => handleUpdateQuestion(qIdx, { referenceAnswer: e.target.value })}
                                placeholder="Escribe aquí los conceptos clave, términos esperados y criterios pedagógicos para evaluar la respuesta del alumno..."
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-pink-200 text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500 leading-relaxed font-sans"
                              />
                              <p className="text-[10px] text-slate-400">
                                💡 Esta guía servirá para la retroalimentación automática y la auditoría docente de las calificaciones.
                              </p>
                            </div>
                          )}

                          {/* Expandable Advanced Options (Formula, Image, Feedback) */}
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedAdvancedIdx((prev) => ({
                                  ...prev,
                                  [qIdx]: !prev[qIdx]
                                }));
                              }}
                              className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center space-x-1.5 font-semibold transition-colors"
                            >
                              {isAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              <span>
                                {isAdvancedOpen ? 'Ocultar material complementario' : '+ Material complementario (Fórmula, Imagen URL, Retroalimentación)'}
                              </span>
                            </button>

                            {isAdvancedOpen && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 animate-in fade-in">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Formula */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                      Fórmula Química o Matemática (Opcional):
                                    </label>
                                    <input
                                      type="text"
                                      value={q.formula || ''}
                                      onChange={(e) => handleUpdateQuestion(qIdx, { formula: e.target.value })}
                                      placeholder="Ej. 2H2 + O2 -> 2H2O"
                                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-pink-400 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>

                                  {/* Image URL */}
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                      URL de Imagen Ilustrativa (Opcional):
                                    </label>
                                    <input
                                      type="url"
                                      value={q.imageUrl || ''}
                                      onChange={(e) => handleUpdateQuestion(qIdx, { imageUrl: e.target.value })}
                                      placeholder="https://images.unsplash.com/..."
                                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>

                                {q.imageUrl && (
                                  <div className="max-w-xs rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                                    <img
                                      src={q.imageUrl}
                                      alt="Vista previa"
                                      className="h-28 w-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Feedback / Explanation */}
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                                    Retroalimentación / Explicación Didáctica:
                                  </label>
                                  <input
                                    type="text"
                                    value={q.explanation || ''}
                                    onChange={(e) => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                                    placeholder="Explicación que ayuda al alumno a entender la respuesta..."
                                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Add Bar */}
                  {visualQuestions.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Agregar reactivo:</span>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('opcion_multiple')}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs transition-colors"
                        >
                          + Opción Múltiple
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('verdadero_falso')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs transition-colors"
                        >
                          + Verdadero o Falso
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('relacionar')}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition-colors"
                        >
                          + Relacionar Columnas
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion('abierta')}
                          className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 font-bold text-xs transition-colors"
                        >
                          + Pregunta Abierta
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleCalibratePoints}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs transition-colors flex items-center space-x-1"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Calibrar a 100 Puntos ({visualQuestions.length} reactivos)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
                  MODE B: EDITOR DE TEXTO / IMPORTACIÓN MASIVA
                  ======================================================== */}
              {editorMode === 'text' && (
                <div className="space-y-4">
                  {/* Quick-Insert Floating Bar */}
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center">
                      <Plus className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      <span>Insertar sintaxis de reactivo modelo:</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const snippet = `\n\nTIPO: OPCION_MULTIPLE\nPREGUNTA: ¿Cuál es el postulado principal de la teoría cinético molecular?\nA) Los choques entre partículas son perfectamente elásticos\nB) Las moléculas no se mueven a temperatura ambiente\nC) Los gases ocupan un volumen fijo e incompresible\nD) La presión no depende de la temperatura\nCORRECTA: A\nRETROALIMENTACION: En el modelo del gas ideal, los choques moleculares no disipan energía cinética neta.`;
                          setPlainText((prev) => prev.trim() + snippet);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-[11px] transition-all"
                      >
                        + Opción Múltiple
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const snippet = `\n\nTIPO: VERDADERO_FALSO\nPREGUNTA: Los enlaces covalentes polares se forman cuando los electrones se comparten de manera desigual.\nCORRECTA: VERDADERO\nRETROALIMENTACION: La asimetría en la distribución de la densidad electrónica origina polos parciales.`;
                          setPlainText((prev) => prev.trim() + snippet);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] transition-all"
                      >
                        + Verdadero o Falso
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const snippet = `\n\nTIPO: RELACIONAR\nPREGUNTA: Relaciona cada propiedad física con su unidad en el Sistema Internacional:\n1. Masa -> Kilogramo (kg)\n2. Presión -> Pascal (Pa)\n3. Temperatura -> Kelvin (K)\n4. Cantidad de Sustancia -> Mol (mol)\nRETROALIMENTACION: Unidades base del Sistema Internacional.`;
                          setPlainText((prev) => prev.trim() + snippet);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 font-bold text-[11px] transition-all"
                      >
                        + Relacionar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const snippet = `\n\nTIPO: ABIERTA\nPREGUNTA: Explica la diferencia entre un enlace iónico y un enlace covalente, incluyendo un ejemplo.\nRESPUESTA_MODELO: El enlace iónico involucra la transferencia completa de electrones de un metal a un no metal (ej. NaCl). El enlace covalente se produce por el compartimiento de electrones entre no metales (ej. H2O).\nRETROALIMENTACION: Se califica la precisión en la transferencia versus compartimiento y los ejemplos.`;
                          setPlainText((prev) => prev.trim() + snippet);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-500/30 text-pink-300 font-bold text-[11px] transition-all"
                      >
                        + Pregunta Abierta
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] font-bold text-slate-300 uppercase">
                        Editor de Texto Plano Inteligente:
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {plainText.length} caracteres
                      </span>
                    </div>
                    <textarea
                      rows={12}
                      value={plainText}
                      onChange={(e) => setPlainText(e.target.value)}
                      placeholder="Escribe o pega tus reactivos con las etiquetas TIPO: OPCION_MULTIPLE, VERDADERO_FALSO, RELACIONAR o ABIERTA..."
                      className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleParse}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white transition-colors"
                    >
                      Interpretar y Actualizar Constructor Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchMode('visual')}
                      className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 rounded-xl text-xs font-bold text-indigo-300 transition-colors"
                    >
                      Ver en Modo Constructor Visual ➔
                    </button>
                  </div>
                </div>
              )}

              {/* Group Reset Option */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearPreviousStudents}
                    onChange={(e) => setClearPreviousStudents(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Reiniciar lista de alumnos anteriores (Grupo Nuevo al activar este examen)</span>
                </label>
              </div>
            </div>
          )}

          {/* ========================================================
              TAB 2: MIS EXÁMENES GUARDADOS (BIBLIOTECA)
              ======================================================== */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Biblioteca de Exámenes Guardados</h4>
                  <p className="text-xs text-slate-400">
                    Selecciona cualquier examen para activarlo al instante o cárgalo en el constructor para editarlo.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>+ Crear Otro Examen</span>
                </button>
              </div>

              <div className="space-y-3">
                {savedExams.map((exam) => {
                  const isCurrentActive = exam.title === currentActiveTitle;
                  const totalPts = exam.questions.reduce((acc, q) => acc + (q.points || 0), 0);
                  const isPreview = previewingExamId === exam.id;

                  // Unique question types
                  const typeBadges = Array.from(new Set(exam.questions.map((q) => q.type)));

                  return (
                    <div
                      key={exam.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrentActive
                          ? 'bg-slate-800/90 border-emerald-500/50 ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/50 border-slate-700/70 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isCurrentActive && (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Actualmente en Vivo</span>
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-400">
                              {exam.questions.length} reactivos • {totalPts} pts • {exam.durationMinutes || 20} min
                            </span>
                            <div className="flex items-center space-x-1">
                              {typeBadges.map((t) => (
                                <span key={t} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800">
                                  {t === 'opcion_multiple' ? 'Opción Múltiple' : t === 'verdadero_falso' ? 'V/F' : t === 'relacionar' ? 'Relacionar' : 'Abiertas'}
                                </span>
                              ))}
                            </div>
                          </div>

                          <h5 className="text-sm font-bold text-white">
                            {exam.title}
                          </h5>
                          {exam.description && (
                            <p className="text-xs text-slate-400">{exam.description}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewingExamId(isPreview ? null : exam.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-slate-200 transition-colors"
                          >
                            {isPreview ? 'Ocultar' : 'Ver Reactivos'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadExamIntoEditor(exam)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-indigo-300 transition-colors flex items-center space-x-1"
                            title="Cargar en el constructor para editar"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleActivateSavedExam(exam)}
                            disabled={isCurrentActive}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                              isCurrentActive
                                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20'
                            }`}
                          >
                            {isCurrentActive ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>En Uso</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>Activar este Examen</span>
                              </>
                            )}
                          </button>

                          {savedExams.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSavedExam(e, exam.id)}
                              className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Eliminar examen de la biblioteca"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expandable question preview */}
                      {isPreview && (
                        <div className="mt-4 pt-3 border-t border-slate-700 space-y-2 max-h-60 overflow-y-auto pr-1">
                          {exam.questions.map((q, qIdx) => (
                            <div key={q.id || qIdx} className="bg-slate-900/70 p-2.5 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-white">
                                  {qIdx + 1}. {q.question}
                                </span>
                                <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                                  {q.type}
                                </span>
                              </div>
                              {q.type === 'opcion_multiple' && q.options && (
                                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                                  {q.options.map((opt, oIdx) => (
                                    <div
                                      key={oIdx}
                                      className={`px-2 py-0.5 rounded ${
                                        oIdx === q.correctAnswer
                                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                                          : 'bg-slate-950/40'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + oIdx)}) {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.type === 'verdadero_falso' && (
                                <p className="text-[11px] text-emerald-300">
                                  Clave: {q.correctAnswer === 0 || q.correctAnswer === true ? 'Verdadero' : 'Falso'}
                                </p>
                              )}
                              {q.type === 'relacionar' && q.pairs && (
                                <div className="text-[11px] text-purple-300 flex flex-wrap gap-2">
                                  {q.pairs.map((p, pIdx) => (
                                    <span key={pIdx} className="bg-slate-950 px-2 py-0.5 rounded">
                                      {p.left} ➔ {p.right}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {q.type === 'abierta' && q.referenceAnswer && (
                                <p className="text-[11px] text-pink-300 italic">
                                  Rúbrica: {q.referenceAnswer}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cerrar
          </button>

          {activeTab === 'create' ? (
            <button
              type="button"
              onClick={handleSaveAndPublish}
              disabled={visualQuestions.length === 0}
              className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>Guardar en Mis Exámenes y Activar</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500">
              {savedExams.length} exámenes guardados listos para aplicar
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
