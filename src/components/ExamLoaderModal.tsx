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
  Save
} from 'lucide-react';
import { parsePlainTextExam, SAMPLE_PLAIN_TEXT_EXAM, ParseResult } from '../services/examParser';
import { firebaseService } from '../services/firebaseService';
import { Question, SavedExam } from '../types';

interface ExamLoaderModalProps {
  isOpen: boolean;
  initialTab?: 'create' | 'library';
  onClose: () => void;
  onExamLoaded: (title: string, questions: Question[]) => void;
}

export const ExamLoaderModal: React.FC<ExamLoaderModalProps> = ({
  isOpen,
  initialTab = 'create',
  onClose,
  onExamLoaded
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'library'>(initialTab);
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  
  // Create / Edit Form State
  const [examTitle, setExamTitle] = useState('Examen de Química General');
  const [examDescription, setExamDescription] = useState('Evaluación de opción múltiple');
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(20);
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

  const handleParse = () => {
    if (!plainText.trim()) {
      setStatusMessage({ text: 'Por favor pega tus preguntas de opción múltiple.', isError: true });
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
      setStatusMessage({
        text: `✓ ¡Excelente! Se interpretaron ${result.questions.length} preguntas de opción múltiple sin errores. Listo para guardar o activar.`,
        isError: false
      });
    }
  };

  const handleLoadSample = () => {
    setPlainText(SAMPLE_PLAIN_TEXT_EXAM);
    setExamTitle('Examen de Química General (Enlaces y Reacciones)');
    setExamDescription('Evaluación oficial de química con preguntas de opción múltiple');
    const result = parsePlainTextExam(SAMPLE_PLAIN_TEXT_EXAM);
    setParseResult(result);
    setStatusMessage({
      text: 'Se cargó la plantilla con 4 preguntas 100% de opción múltiple sin errores. ¡Puedes editarla o publicarla directamente!',
      isError: false
    });
  };

  const handleSaveAndPublish = async () => {
    let currentResult = parseResult;
    if (!currentResult || currentResult.questions.length === 0) {
      currentResult = parsePlainTextExam(plainText);
      setParseResult(currentResult);
    }

    if (!currentResult || currentResult.questions.length === 0) {
      setStatusMessage({ text: 'No se encontraron preguntas válidas para publicar.', isError: true });
      return;
    }

    const finalTitle = examTitle.trim() || 'Examen de Opción Múltiple';

    // 1. Save to Saved Exams Library so the teacher keeps it
    await firebaseService.saveExamToLibrary({
      title: finalTitle,
      description: examDescription.trim(),
      questions: currentResult.questions,
      durationMinutes: examDurationMinutes
    });

    // 2. Set as active exam for all students
    await firebaseService.saveActiveExam(finalTitle, currentResult.questions);

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

    onExamLoaded(finalTitle, currentResult.questions);
    setStatusMessage({ text: '¡Examen guardado en tu biblioteca y activado en tiempo real!', isError: false });

    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleActivateSavedExam = async (exam: SavedExam) => {
    if (clearPreviousStudents) {
      await firebaseService.clearAllStudents();
    }

    await firebaseService.saveActiveExam(exam.title, exam.questions);
    
    const currentSession = firebaseService.getGlobalSession();
    await firebaseService.setGlobalSession({
      ...currentSession,
      title: exam.title,
      durationMinutes: exam.durationMinutes || 20,
      updatedAt: Date.now()
    });

    onExamLoaded(exam.title, exam.questions);
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

    // Convert back into plain text
    const textLines: string[] = [];
    exam.questions.forEach((q, idx) => {
      textLines.push(`PREGUNTA: ${q.question}`);
      if (q.imageUrl) textLines.push(`IMAGEN: ${q.imageUrl}`);
      if (q.formula) textLines.push(`FORMULA: ${q.formula}`);
      if (q.options) {
        q.options.forEach((opt, oIdx) => {
          textLines.push(`${String.fromCharCode(65 + oIdx)}) ${opt}`);
        });
      }
      if (q.correctAnswer !== undefined) {
        textLines.push(`CORRECTA: ${String.fromCharCode(65 + q.correctAnswer)}`);
      }
      if (q.explanation) {
        textLines.push(`RETROALIMENTACION: ${q.explanation}`);
      }
      textLines.push('');
    });

    const generated = textLines.join('\n');
    setPlainText(generated);
    setParseResult({
      questions: exam.questions,
      warnings: [],
      errors: []
    });
    setActiveTab('create');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header with Navigation Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Gestor y Creador de Exámenes (Opción Múltiple)
              </h3>
              <p className="text-xs text-slate-400">
                Guarda distintos exámenes, crea nuevos exámenes o carga preguntas desde texto plano sin errores
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Tab switchers */}
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
                <span>Crear Nuevo Examen</span>
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
                <span>Mis Exámenes Guardados ({savedExams.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Status Toast */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
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
              TAB 1: CREAR NUEVO EXAMEN (TEXTO PLANO / OPCION MULTIPLE)
              ======================================================== */}
          {activeTab === 'create' && (
            <div className="space-y-5">
              {/* Exam Title & Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Título del Examen (Opción Múltiple) *
                  </label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="Ej. Examen de Química General - Parcial I"
                    className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Tiempo Límite
                  </label>
                  <div className="flex items-center space-x-2 bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-1.5">
                    <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={examDurationMinutes}
                      onChange={(e) => setExamDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-transparent text-white font-bold font-mono text-center text-xs focus:outline-none"
                    />
                    <span className="text-slate-400 font-semibold text-xs">min</span>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="w-full py-2.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Cargar Plantilla Ejemplo</span>
                  </button>
                </div>
              </div>

              {/* Format Helper Banner */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 text-[11px] space-y-1 text-slate-300">
                <div className="flex items-center text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Acepta únicamente preguntas de Opción Múltiple (cero errores):</span>
                </div>
                <p className="text-slate-400">
                  Puedes redactar las opciones como <strong>A)</strong>, <strong>B)</strong>, <strong>C)</strong>, <strong>D)</strong> o enumeradas (1., 2.). Especifica la clave con <strong>CORRECTA: B</strong> (o asterisco <code className="text-pink-300">* B)</code>).
                </p>
              </div>

              {/* Large Text Area */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Pega aquí las preguntas de opción múltiple:
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {plainText.length} caracteres
                  </span>
                </div>
                <textarea
                  rows={9}
                  value={plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  placeholder="PREGUNTA: ¿Cuál es el número de Avogadro?&#10;A) 6.022 x 10^23&#10;B) 3.00 x 10^8&#10;C) 1.602 x 10^-19&#10;D) 9.81 m/s^2&#10;CORRECTA: A&#10;RETROALIMENTACION: Es el número de partículas en 1 mol de sustancia."
                  className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed"
                />
              </div>

              {/* Action row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleParse}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white transition-colors"
                >
                  Interpretar y Ver Vista Previa
                </button>

                <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearPreviousStudents}
                    onChange={(e) => setClearPreviousStudents(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Reiniciar lista de alumnos anteriores (Grupo Nuevo)</span>
                </label>
              </div>

              {/* Live Preview of parsed questions */}
              {parseResult && parseResult.questions.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" />
                      Preguntas de Opción Múltiple Detectadas ({parseResult.questions.length})
                    </h4>
                    <span className="text-[11px] font-mono text-indigo-400 font-bold">
                      Total: 100 Puntos Calibrados
                    </span>
                  </div>

                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {parseResult.questions.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white">
                            {idx + 1}. {q.question}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 shrink-0 ml-2">
                            {q.points} pts
                          </span>
                        </div>

                        {q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = optIdx === q.correctAnswer;
                              return (
                                <div
                                  key={optIdx}
                                  className={`p-1.5 px-2 rounded-lg flex items-center space-x-1.5 ${
                                    isCorrect
                                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                                      : 'bg-slate-900/60 text-slate-400'
                                  }`}
                                >
                                  <span className="font-mono font-bold text-[10px] w-4">{String.fromCharCode(65 + optIdx)})</span>
                                  <span className="truncate">{opt}</span>
                                  {isCorrect && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {q.explanation && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded">
                            💡 Retroalimentación: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              TAB 2: MIS EXÁMENES GUARDADOS (BIBLIOTECA & ACTIVACIÓN)
              ======================================================== */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Biblioteca de Exámenes Disponibles</h4>
                  <p className="text-xs text-slate-400">
                    Selecciona cualquier examen para activarlo al instante para los alumnos conectados.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nuevo Examen</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {savedExams.map((exam) => {
                  const isCurrentActive = exam.title === currentActiveTitle;
                  const totalPts = exam.questions.reduce((acc, q) => acc + q.points, 0) || 100;
                  const isPreview = previewingExamId === exam.id;

                  return (
                    <div
                      key={exam.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrentActive
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/30'
                          : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                <span>Actualmente en Vivo</span>
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-slate-400">
                              {exam.questions.length} reactivos • {totalPts} pts • {exam.durationMinutes || 20} min
                            </span>
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
                            {isPreview ? 'Ocultar Preguntas' : 'Ver Preguntas'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLoadExamIntoEditor(exam)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-700/80 hover:bg-slate-700 text-indigo-300 transition-colors"
                            title="Editar preguntas en el editor"
                          >
                            Editar
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
                        <div className="mt-4 pt-3 border-t border-slate-700 space-y-2 max-h-48 overflow-y-auto pr-1">
                          {exam.questions.map((q, qIdx) => (
                            <div key={q.id || qIdx} className="bg-slate-900/70 p-2.5 rounded-xl text-xs space-y-1">
                              <p className="font-semibold text-white">
                                {qIdx + 1}. {q.question}
                              </p>
                              {q.options && (
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
              disabled={!plainText.trim()}
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
