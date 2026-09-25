import React from 'react';
import { FlaskConical, ShieldAlert, Monitor, GraduationCap, Database, UploadCloud, Download, CheckCircle2, AlertTriangle } from 'lucide-react';

interface NavbarProps {
  currentRole: 'student' | 'teacher';
  onRoleChange: (role: 'student' | 'teacher') => void;
  onOpenFirebaseConfig: () => void;
  onOpenDeployModal: () => void;
  isFirebaseConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  onOpenFirebaseConfig,
  onOpenDeployModal,
  isFirebaseConnected
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  Química<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">Quiz</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <ShieldAlert className="w-3 h-3 mr-1 text-emerald-400" />
                  Anti-Trampas v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Evaluaciones con supervisión en vivo por cambio de pestañas
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Role Switcher Pill */}
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 flex items-center">
              <button
                type="button"
                onClick={() => onRoleChange('student')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'student'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Vista Alumno</span>
              </button>
              <button
                type="button"
                onClick={() => onRoleChange('teacher')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  currentRole === 'teacher'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Panel Profesor</span>
              </button>
            </div>

            {/* Firebase Connection Status Pill */}
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              title="Configuración de Firebase Realtime Database"
              className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isFirebaseConnected
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {isFirebaseConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Firebase RTDB</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Modo Local / Configurar</span>
                </>
              )}
            </button>

            {/* Deploy & Export Button */}
            <button
              type="button"
              onClick={onOpenDeployModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all shadow-sm"
              title="Desplegar en Vercel y descargar código"
            >
              <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Desplegar en Vercel</span>
              <span className="sm:hidden">Vercel</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
