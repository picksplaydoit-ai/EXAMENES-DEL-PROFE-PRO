import React, { useState } from 'react';
import { 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  X, 
  Send, 
  RotateCcw, 
  Info,
  Check,
  Flame
} from 'lucide-react';
import { parsePlainTextExam, SAMPLE_PLAIN_TEXT_EXAM, ParseResult } from '../services/examParser';
import { firebaseService } from '../services/firebaseService';
import { Question } from '../types';

interface ExamLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExamLoaded: (title: string, questions: Question[]) => void;
}

export const ExamLoaderModal: React.FC<ExamLoaderModalProps> = ({
  isOpen,
  onClose,
  onExamLoaded
}) => {
  const [examTitle, setExamTitle] = useState('Examen de Química General');
  const [plainText, setPlainText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [clearPreviousStudents, setClearPreviousStudents] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    if (!plainText.trim()) {
      setStatusMessage({ text: 'El texto está vacío. Por favor pega tu examen.', isError: true });
      return;
    }

    const result = parsePlainTextExam(plainText);
    setParseResult(result);

    if (result.errors.length > 0) {
      setStatusMessage({
        text: `Se detectaron ${result.errors.length} advertencia(s). Revisa el formato abajo.`,
        isError: true
      });
    } else {
      setStatusMessage({
        text: `¡Excelente! Se interpretaron ${result.questions.length} preguntas correctamente. Haz clic en "Publicar Examen" para aplicarlo.`,
        isError: false
      });
    }
  };

  const handleLoadSample = () => {
    setPlainText(SAMPLE_PLAIN_TEXT_EXAM);
    const result = parsePlainTextExam(SAMPLE_PLAIN_TEXT_EXAM);
    setParseResult(result);
    setStatusMessage({
      text: 'Se cargó la plantilla de ejemplo con 5 preguntas de Química. ¡Puedes editarla o publicarla directamente!',
      isError: false
    });
  };

  const handleSaveAndPublish = async () => {
    // If not parsed yet, parse now
    let currentResult = parseResult;
    if (!currentResult || currentResult.questions.length === 0) {
      currentResult = parsePlainTextExam(plainText);
      setParseResult(currentResult);
    }

    if (!currentResult || currentResult.questions.length === 0) {
      setStatusMessage({ text: 'No se encontraron preguntas válidas para publicar.', isError: true });
      return;
    }

    if (currentResult.errors.length > 0) {
      if (!confirm(`Hay errores en algunas preguntas. ¿Deseas publicar únicamente las ${currentResult.questions.length} preguntas que se interpretaron correctamente?`)) {
        return;
      }
    }

    // Save into Firebase Realtime Database and notify
    await firebaseService.saveActiveExam(examTitle, currentResult.questions);

    // If requested, clean previous student attempts so the new exam starts fresh
    if (clearPreviousStudents) {
      await firebaseService.clearAllStudents();
    }

    onExamLoaded(examTitle, currentResult.questions);
    setStatusMessage({ text: '¡Examen publicado con éxito en tiempo real!', isError: false });

    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Cargar Examen desde Texto Plano (Bloc de Notas o Chat)
              </h3>
              <p className="text-xs text-slate-400">
                Pega tus preguntas redactadas en texto plano y el sistema las transformará en un examen interactivo en vivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-300">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-medium ${
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

          {/* Title & Template Action */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Título o Asignatura del Examen *
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="Ej. Química General I - Examen Parcial"
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={handleLoadSample}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Cargar Plantilla de Ejemplo</span>
              </button>
            </div>
          </div>

          {/* Format Helper Banner */}
          <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/80 text-[11px] space-y-1.5 text-slate-300">
            <div className="flex items-center text-amber-300 font-bold">
              <Info className="w-3.5 h-3.5 mr-1 text-amber-400" />
              <span>Estructura que reconoce el analizador:</span>
            </div>
            <pre className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800">
{`PREGUNTA: ¿Cuál es el enlace entre un metal y un no metal?
A) Covalente polar
B) Iónico
C) Metálico
D) Covalente apolar
CORRECTA: B
RETROALIMENTACION: Se produce por transferencia de electrones.`}
            </pre>
          </div>

          {/* Large Text Area */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-bold text-slate-300 uppercase">
                Pega aquí el contenido en texto plano:
              </label>
              <span className="text-[11px] text-slate-500">
                {plainText.length} caracteres
              </span>
            </div>
            <textarea
              rows={9}
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              placeholder="PREGUNTA: ¿Texto de tu pregunta?&#10;A) Opción 1&#10;B) Opción 2&#10;C) Opción 3&#10;D) Opción 4&#10;CORRECTA: A&#10;RETROALIMENTACION: Explicación pedagógica..."
              className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed"
            />
          </div>

          {/* Action Row */}
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

          {/* Parsed Questions Live Preview */}
          {parseResult && (
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-400" />
                  Vista Previa de Preguntas Detectadas ({parseResult.questions.length})
                </h4>
                <span className="text-[11px] font-mono text-indigo-400 font-bold">
                  Total: 100 Puntos distribuidos
                </span>
              </div>

              {parseResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1 text-xs">
                  <p className="font-bold">⚠️ Se detectaron detalles en el formato:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
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

                    {q.options && q.options.length > 0 && (
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

                    {q.type === 'relacionar' && q.pairs && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] p-2 rounded bg-slate-900/60 border border-slate-800">
                        {q.pairs.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center justify-between text-slate-300">
                            <span className="font-semibold">{p.left}:</span>
                            <span className="text-pink-300">{p.right}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'abierta' && q.referenceAnswer && (
                      <div className="text-[11px] p-2 rounded bg-purple-950/20 border border-purple-500/30 text-purple-300">
                        <span className="font-bold">Criterio esperado:</span> {q.referenceAnswer}
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

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={!plainText.trim()}
            className="px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Publicar y Cargar Examen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
