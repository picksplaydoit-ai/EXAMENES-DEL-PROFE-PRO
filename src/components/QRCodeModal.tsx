import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  X, 
  Play, 
  Users, 
  Clock, 
  Pause, 
  StopCircle, 
  Hourglass,
  FileSpreadsheet,
  RotateCcw
} from 'lucide-react';
import { GlobalSessionState } from '../types';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  examTitle: string;
  globalSession?: GlobalSessionState;
  waitingStudentsCount?: number;
  initialDurationMinutes?: number;
  onStartExam?: (durationMinutes: number) => void;
  onPauseExam?: () => void;
  onFinishExam?: () => void;
  onExportExcel?: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  examTitle,
  globalSession,
  waitingStudentsCount = 0,
  initialDurationMinutes = 20,
  onStartExam,
  onPauseExam,
  onFinishExam,
  onExportExcel
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [studentUrl, setStudentUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDurationMinutes);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(initialDurationMinutes * 60);
  const [hasStartedAction, setHasStartedAction] = useState(false);

  useEffect(() => {
    if (globalSession?.durationMinutes) {
      setDurationMinutes(globalSession.durationMinutes);
    }
  }, [globalSession?.durationMinutes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create clean student URL with student_only mode (completely isolated from teacher view)
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('role', 'student');
      url.searchParams.set('mode', 'student_only');
      setStudentUrl(url.toString());

      QRCode.toDataURL(
        url.toString(),
        {
          width: 440,
          margin: 2,
          color: {
            dark: '#090d16', // deep dark
            light: '#ffffff'
          }
        },
        (err, dataUrl) => {
          if (!err && dataUrl) {
            setQrDataUrl(dataUrl);
          }
        }
      );
    }
  }, [isOpen]);

  // Synchronized countdown timer when session is active
  useEffect(() => {
    if (globalSession?.status !== 'active') return;

    const tick = () => {
      if (globalSession.endsAt) {
        const diff = Math.max(0, Math.floor((globalSession.endsAt - Date.now()) / 1000));
        setRemainingSeconds(diff);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [globalSession?.status, globalSession?.endsAt]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Examen_${examTitle.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartClick = () => {
    if (onStartExam) {
      setHasStartedAction(true);
      onStartExam(durationMinutes);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isSessionActive = globalSession?.status === 'active';
  const isSessionFinished = globalSession?.status === 'finished';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-indigo-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl text-center relative my-4 max-h-[96vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <QrCode className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
            Proyector de Aula • Código QR
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-black text-white px-6">
          {examTitle}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Muestra este código a tus alumnos. Al escanearlo acceden <strong className="text-emerald-400">únicamente al portal de alumnos</strong> sin vista ni controles de profesor.
        </p>

        {/* QR Code Container */}
        <div className="my-4 p-3.5 bg-white rounded-2xl shadow-2xl inline-block border-4 border-indigo-500/30">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Código QR del Examen"
              className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto"
            />
          ) : (
            <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400 text-xs">
              Generando código QR...
            </div>
          )}
        </div>

        {/* ========================================================
            DIRECT EXAM LAUNCHER (DIRECTO DESDE EL QR)
            ======================================================== */}
        <div className="mb-4 bg-slate-950/80 border border-indigo-500/30 rounded-2xl p-4 text-left space-y-3">
          {/* Header Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isSessionActive
                  ? 'bg-emerald-400 animate-ping'
                  : isSessionFinished
                  ? 'bg-amber-400'
                  : 'bg-indigo-400'
              }`} />
              <span className="text-xs font-bold text-white">
                {isSessionActive 
                  ? 'Examen en Vivo (Alumnos respondiendo)' 
                  : isSessionFinished
                  ? 'Examen Concluido'
                  : 'Sala de Espera Lista'}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 font-bold">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{waitingStudentsCount} {waitingStudentsCount === 1 ? 'alumno conectado' : 'alumnos conectados'}</span>
            </div>
          </div>

          {/* Action state: Waiting room -> Start Exam Button */}
          {!isSessionActive && !isSessionFinished && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                  <span className="text-xs text-slate-300 font-semibold">Duración del examen:</span>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setDurationMinutes((prev) => Math.max(5, prev - 5))}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs font-bold text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setDurationMinutes((prev) => prev + 5)}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-400 font-semibold ml-1">min</span>
                  </div>
                </div>

                <div className="text-[11px] text-emerald-400 font-semibold text-right">
                  {waitingStudentsCount > 0 ? '✓ Alumnos formados listos' : 'Esperando escaneos...'}
                </div>
              </div>

              {/* Big, direct START EXAM button */}
              <button
                type="button"
                onClick={handleStartClick}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 shadow-xl shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 transform active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>🚀 INICIAR EXAMEN AHORA (PARA TODOS LOS ALUMNOS)</span>
              </button>
            </div>
          )}

          {/* Action state: Active Exam -> Live Countdown & Finish/Pause */}
          {isSessionActive && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between bg-slate-900 p-3 rounded-xl border border-indigo-500/40">
                <div className="flex items-center space-x-2.5">
                  <Hourglass className="w-5 h-5 text-pink-400 animate-spin-slow" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Tiempo Restante</span>
                    <span className="text-lg font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-300">
                      {formatTimer(remainingSeconds)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 uppercase font-bold block">Estado en vivo</span>
                  <span className="text-xs text-white font-semibold">Examen en Curso</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onFinishExam && (
                  <button
                    type="button"
                    onClick={onFinishExam}
                    className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-md shadow-rose-600/30 transition-all flex items-center justify-center space-x-1.5"
                  >
                    <StopCircle className="w-4 h-4 text-white" />
                    <span>Finalizar y Descargar Excel</span>
                  </button>
                )}

                {onPauseExam && (
                  <button
                    type="button"
                    onClick={onPauseExam}
                    className="py-2.5 px-3.5 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center space-x-1.5"
                  >
                    <Pause className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pausar</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action state: Finished Exam */}
          {isSessionFinished && (
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between">
                <span>El examen ha concluido. Todos los envíos están registrados.</span>
              </div>
              <div className="flex items-center space-x-2">
                {onExportExcel && (
                  <button
                    type="button"
                    onClick={onExportExcel}
                    className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md transition-all flex items-center justify-center space-x-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-white" />
                    <span>Descargar Resultados en Excel (.xlsx)</span>
                  </button>
                )}
                {onPauseExam && (
                  <button
                    type="button"
                    onClick={onPauseExam}
                    className="py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Nueva Sala</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Link preview & Copy */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-300 mb-4">
          <span className="truncate max-w-[260px] sm:max-w-[320px] font-mono text-[11px] text-indigo-300">
            {studentUrl}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="ml-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shrink-0 transition-colors flex items-center space-x-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar Enlace'}</span>
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Imagen QR</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
