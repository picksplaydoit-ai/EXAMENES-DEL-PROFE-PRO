import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Sparkles, 
  Atom, 
  CheckCircle2, 
  LogOut,
  Flame
} from 'lucide-react';
import { StudentExamState, GlobalSessionState } from '../types';
import { soundManager } from '../services/soundEffects';

interface StudentWaitingRoomProps {
  student: StudentExamState;
  session: GlobalSessionState;
  connectedStudents: StudentExamState[];
  onExitWaitingRoom: () => void;
}

export const StudentWaitingRoom: React.FC<StudentWaitingRoomProps> = ({
  student,
  session,
  connectedStudents,
  onExitWaitingRoom
}) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const waitingPeers = connectedStudents.filter(
    (s) => s.status === 'waiting' || s.status === 'in_progress'
  );

  const toggleMusic = () => {
    const active = soundManager.toggleLobbyGroove();
    setIsMusicPlaying(active);
  };

  useEffect(() => {
    return () => {
      soundManager.stopLobbyGroove();
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/90 via-purple-900/80 to-pink-900/90 border-2 border-indigo-500/40 p-6 sm:p-10 shadow-2xl text-center backdrop-blur-xl">
        {/* Animated glowing bubbles */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-700" />

        {/* Music toggle button */}
        <button
          type="button"
          onClick={toggleMusic}
          className={`absolute top-4 right-4 p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 ${
            isMusicPlaying
              ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-md shadow-pink-500/20'
              : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
          }`}
          title="Música de espera estilo Kahoot"
        >
          {isMusicPlaying ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMusicPlaying ? 'Música activa' : 'Música'}</span>
        </button>

        {/* Student Avatar Card */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-xl shadow-indigo-500/30 mb-4 animate-bounce">
          <Atom className="w-10 h-10 animate-spin-slow" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold uppercase tracking-wider mb-2">
          ✓ ¡Estás en la Sala de Espera!
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          {student.fullName}
        </h1>
        <p className="text-sm font-mono text-indigo-300 mt-1">
          Matrícula: {student.matricula}
        </p>

        <div className="mt-3 inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-200">
          <span>Examen: <strong className="text-white">{student.examTitle || session.title || 'Evaluación'}</strong></span>
          <span>•</span>
          <span className="text-amber-300 font-semibold">🛡️ Orden anti-copia activo</span>
        </div>

        {/* Waiting Message */}
        <div className="mt-6 max-w-lg mx-auto bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-center space-x-2 text-indigo-300 font-bold text-sm sm:text-base animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
            <span>Esperando a que el profesor inicie el examen...</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Permanece en esta pantalla. En cuanto el docente presione <strong>"Comenzar Examen para Todos"</strong>, tu prueba se activará automáticamente con el temporizador global sincronizado.
          </p>
        </div>

        {/* Exam Params Quick Info */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mt-6 text-xs text-slate-300">
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4 text-pink-400" />
            <span>Duración: <strong className="text-white">{session.durationMinutes} min</strong></span>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>En sala: <strong className="text-white">{waitingPeers.length} alumnos</strong></span>
          </div>
        </div>
      </div>

      {/* Connected Peers Lobby Grid */}
      <div className="mt-8 bg-slate-800/80 rounded-3xl border border-slate-700/80 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Compañeros en la Sala ({waitingPeers.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>En tiempo real</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-1">
          {waitingPeers.map((peer) => {
            const isMe = peer.matricula === student.matricula;
            return (
              <div
                key={peer.id}
                className={`p-3 rounded-2xl border flex items-center space-x-2.5 transition-all ${
                  isMe
                    ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold ring-2 ring-indigo-500/40'
                    : 'bg-slate-900/70 border-slate-700/70 text-slate-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                    isMe
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-indigo-400 border border-slate-700'
                  }`}
                >
                  {peer.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="truncate text-xs">
                  <p className="truncate font-semibold">{peer.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{peer.matricula}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Anti-cheat Advice Footer */}
      <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4 text-xs text-amber-200">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Recordatorio de Proctoring:</strong> Durante el examen está prohibido cambiar de pestaña o salir del navegador. A la 3ra advertencia se enviará automáticamente.
          </span>
        </div>
        <button
          type="button"
          onClick={onExitWaitingRoom}
          className="text-xs text-slate-400 hover:text-white shrink-0 underline"
        >
          Salir
        </button>
      </div>
    </div>
  );
};
