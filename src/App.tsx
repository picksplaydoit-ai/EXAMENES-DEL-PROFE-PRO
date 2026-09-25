/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StudentView } from './components/StudentView';
import { TeacherView } from './components/TeacherView';
import { FirebaseModal } from './components/FirebaseModal';
import { VercelDeployModal } from './components/VercelDeployModal';
import { firebaseService } from './services/firebaseService';
import { ShieldCheck, GraduationCap, Monitor, ExternalLink, HelpCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher'>('student');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  useEffect(() => {
    setIsFirebaseConnected(firebaseService.isConfigured());

    // Check URL parameters (e.g. if student scanned QR code)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      if (roleParam === 'teacher') {
        setCurrentRole('teacher');
      } else if (roleParam === 'student') {
        setCurrentRole('student');
      }
    }
  }, []);

  const handleRoleChange = (role: 'student' | 'teacher') => {
    setCurrentRole(role);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', role);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleConfigSaved = () => {
    setIsFirebaseConnected(firebaseService.isConfigured());
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenFirebaseConfig={() => setIsFirebaseModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        isFirebaseConnected={isFirebaseConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentRole === 'student' ? (
          <StudentView onSwitchToTeacher={() => handleRoleChange('teacher')} />
        ) : (
          <TeacherView 
            onOpenFirebaseConfig={() => setIsFirebaseModalOpen(true)}
            isFirebaseConnected={isFirebaseConnected}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/60 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">QuímicaQuiz Anti-Trampas</span>
            <span>•</span>
            <span>Supervisión proctoring con <code className="text-indigo-400">visibilitychange</code> + Generador QR</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setIsDeployModalOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-1"
            >
              <span>Descargar HTML Autónomo / Vercel</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsFirebaseModalOpen(true)}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              {isFirebaseConnected ? 'Firebase Conectado' : 'Configurar Firebase RTDB'}
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onConfigSaved={handleConfigSaved}
      />

      <VercelDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}
