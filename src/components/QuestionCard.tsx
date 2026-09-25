import React, { useState } from 'react';
import { Question } from '../types';
import { CheckCircle2, Flame, ImageIcon, HelpCircle, ArrowRightLeft, AlignLeft, Check } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  currentAnswer: any;
  onAnswerChange: (questionId: string, answer: any) => void;
  disabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionNumber,
  currentAnswer,
  onAnswerChange,
  disabled = false
}) => {
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  // Type badge color and text
  const getTypeBadge = () => {
    switch (question.type) {
      case 'relacionar':
        return { label: 'Relacionar Columnas', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'abierta':
        return { label: 'Pregunta Abierta', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
      case 'opcion_multiple':
      default:
        return { label: 'Opción Múltiple', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
    }
  };

  const badge = getTypeBadge();

  return (
    <div className="bg-slate-800/90 rounded-3xl border border-slate-700 p-6 sm:p-8 shadow-xl">
      {/* Top Header: Topic, Points, Type */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.color}`}>
            {badge.label}
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            {question.topic}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
          Valor: {question.points} pts
        </span>
      </div>

      {/* Question Text */}
      <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed mb-4">
        {questionNumber}. {question.question}
      </h2>

      {/* Chemical Formula / Subtitle (if present) */}
      {question.formula && (
        <div className="mb-6 p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 flex items-center justify-center">
          <span className="font-mono text-sm sm:text-base font-bold text-pink-400 tracking-wider">
            {question.formula}
          </span>
        </div>
      )}

      {/* Image Preview (if present) */}
      {question.imageUrl && (
        <div className="mb-6">
          <div className="relative group max-w-xl mx-auto rounded-2xl overflow-hidden border border-slate-700 bg-slate-950">
            <img
              src={question.imageUrl}
              alt="Material gráfico de la pregunta"
              className="w-full max-h-72 object-contain bg-slate-900 mx-auto transition-transform group-hover:scale-105 duration-300 cursor-pointer"
              onClick={() => setIsImageZoomed(true)}
              onError={(e) => {
                // If broken image, hide smoothly
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div
              onClick={() => setIsImageZoomed(true)}
              className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[10px] text-white flex items-center space-x-1 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3 text-pink-400" />
              <span>Clic para ampliar</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          TYPE 1: OPCION_MULTIPLE
          ======================================================== */}
      {question.type === 'opcion_multiple' && question.options && (
        <div className="space-y-3 mb-6">
          {question.options.map((opt, optIdx) => {
            // When options are randomized, map displayed position to original master index
            const originalIndex = (question as any).shuffledOptions
              ? (question as any).shuffledOptions[optIdx]?.originalIndex
              : optIdx;
            const isSelected = currentAnswer === originalIndex;
            const letter = String.fromCharCode(65 + optIdx);
            return (
              <button
                key={optIdx}
                type="button"
                disabled={disabled}
                onClick={() => onAnswerChange(question.id, originalIndex)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center space-x-3.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border-indigo-500 text-white shadow-md shadow-indigo-600/10 ring-1 ring-indigo-500'
                    : 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-900 hover:border-slate-600'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center font-mono shrink-0 transition-colors ${
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
      )}

      {/* ========================================================
          TYPE 2: ABIERTA (DESARROLLO)
          ======================================================== */}
      {question.type === 'abierta' && (
        <div className="mb-6 space-y-2">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center">
            <AlignLeft className="w-3.5 h-3.5 mr-1.5 text-pink-400" />
            <span>Tu respuesta desarrollada:</span>
          </label>
          <textarea
            rows={5}
            disabled={disabled}
            value={currentAnswer || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            placeholder="Escribe aquí tu respuesta argumentada con claridad técnica..."
            className="w-full p-4 bg-slate-900/90 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all leading-relaxed"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Se evaluará de acuerdo a los criterios pedagógicos del tema.</span>
            <span>{(currentAnswer || '').length} caracteres</span>
          </div>
        </div>
      )}

      {/* ========================================================
          TYPE 3: RELACIONAR COLUMNAS
          ======================================================== */}
      {question.type === 'relacionar' && question.pairs && (
        <div className="mb-6 space-y-4">
          <p className="text-xs text-slate-400">
            Selecciona la correspondencia adecuada para cada elemento de la columna izquierda:
          </p>

          <div className="space-y-3">
            {question.pairs.map((pair, idx) => {
              const studentMatches: Record<string, string> = currentAnswer || {};
              const currentPick = studentMatches[pair.id] || '';

              // Available right side options
              const rightOptions = question.pairs!.map((p) => p.right);

              return (
                <div
                  key={pair.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {pair.left}
                    </span>
                  </div>

                  <div className="sm:w-1/2">
                    <select
                      disabled={disabled}
                      value={currentPick}
                      onChange={(e) => {
                        const updated = {
                          ...studentMatches,
                          [pair.id]: e.target.value
                        };
                        onAnswerChange(question.id, updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">-- Seleccionar coincidencia --</option>
                      {rightOptions.map((optRight, rIdx) => (
                        <option key={rIdx} value={optRight}>
                          {optRight}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {isImageZoomed && question.imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="max-w-4xl max-h-[90vh] p-2 relative">
            <img
              src={question.imageUrl}
              alt="Imagen ampliada"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl"
            />
            <p className="text-center text-xs text-slate-400 mt-2">
              Haz clic en cualquier parte para cerrar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
