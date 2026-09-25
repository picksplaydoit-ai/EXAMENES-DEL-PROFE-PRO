import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RotateCcw, 
  FileSpreadsheet, 
  Search, 
  Eye, 
  Clock, 
  Download, 
  PlusCircle, 
  Sparkles,
  ExternalLink,
  HelpCircle,
  Database,
  X,
  AlertOctagon,
  FileText,
  QrCode,
  Layers,
  RefreshCw
} from 'lucide-react';
import { StudentExamState, Question } from '../types';
import { firebaseService, ExamDataPayload } from '../services/firebaseService';
import { ExamLoaderModal } from './ExamLoaderModal';
import { QRCodeModal } from './QRCodeModal';

interface TeacherViewProps {
  onOpenFirebaseConfig: () => void;
  isFirebaseConnected: boolean;
}

export const TeacherView: React.FC<TeacherViewProps> = ({
  onOpenFirebaseConfig,
  isFirebaseConnected
}) => {
  const [students, setStudents] = useState<Record<string, StudentExamState>>({});
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentExamState | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'cheated' | 'completed'>('all');
  const [lastIncidentStudent, setLastIncidentStudent] = useState<{ name: string; time: number; warnings: number } | null>(null);

  // Active Exam State
  const [examData, setExamData] = useState<ExamDataPayload>(firebaseService.getActiveExam());
  const [isExamLoaderOpen, setIsExamLoaderOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [clearSuccessToast, setClearSuccessToast] = useState(false);

  // Subscribe to real-time student changes & exam changes
  useEffect(() => {
    const unsubStudents = firebaseService.subscribeToStudents((updatedStudents) => {
      setStudents(updatedStudents);

      // Detect recent incident in the last 12 seconds
      const now = Date.now();
      let mostRecentCheat: { name: string; time: number; warnings: number } | null = null;

      Object.values(updatedStudents).forEach((st) => {
        if (st.cheatLogs && st.cheatLogs.length > 0) {
          const lastLog = st.cheatLogs[st.cheatLogs.length - 1];
          if (now - lastLog.timestamp < 12000) {
            if (!mostRecentCheat || lastLog.timestamp > mostRecentCheat.time) {
              mostRecentCheat = {
                name: st.fullName,
                time: lastLog.timestamp,
                warnings: st.cheatWarningsCount
              };
            }
          }
        }
      });

      if (mostRecentCheat) {
        setLastIncidentStudent(mostRecentCheat);
      }
    });

    const unsubExam = firebaseService.subscribeToExam((data) => {
      setExamData(data);
    });

    return () => {
      unsubStudents();
      unsubExam();
    };
  }, []);

  const studentList = Object.values(students);
  const activeQuestions = examData.questions || [];
  const totalExamPoints = activeQuestions.reduce((acc, q) => acc + q.points, 0) || 100;

  // Metrics
  const totalStudents = studentList.length;
  const inProgressCount = studentList.filter((s) => s.status === 'in_progress').length;
  const completedCount = studentList.filter((s) => s.status === 'submitted').length;
  const cheatedCount = studentList.filter((s) => s.status === 'forced_submission_cheat' || s.cheatWarningsCount >= 3).length;
  
  const averageScore = totalStudents > 0
    ? Math.round(studentList.reduce((acc, s) => acc + (s.score || 0), 0) / totalStudents)
    : 0;

  // Filter students
  const filteredStudents = studentList.filter((st) => {
    const matchesSearch = 
      st.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.matricula.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'in_progress') return st.status === 'in_progress';
    if (statusFilter === 'cheated') return st.cheatWarningsCount > 0;
    if (statusFilter === 'completed') return st.status === 'submitted' || st.status === 'forced_submission_cheat';

    return true;
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (studentList.length === 0) {
      alert('No hay alumnos registrados para exportar.');
      return;
    }

    const headers = ['Matricula', 'Nombre Completo', 'Estado', 'Puntaje Obtenido', 'Puntaje Maximo', 'Porcentaje', 'Faltas Anti-Trampas', 'Hora Inicio', 'Hora Envio'];
    const rows = studentList.map((st) => [
      `"${st.matricula}"`,
      `"${st.fullName}"`,
      `"${st.status === 'forced_submission_cheat' ? 'Expulsado por Faltas' : st.status === 'submitted' ? 'Completado' : 'En Curso'}"`,
      st.score,
      st.maxScore || totalExamPoints,
      `${st.percentage}%`,
      st.cheatWarningsCount,
      st.startedAt ? `"${new Date(st.startedAt).toLocaleTimeString()}"` : '""',
      st.submittedAt ? `"${new Date(st.submittedAt).toLocaleTimeString()}"` : '""'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_${examData.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetStudent = async (studentId: string) => {
    if (confirm(`¿Reiniciar el examen de este alumno? Podrá volver a ingresar desde cero.`)) {
      await firebaseService.resetStudentAttempt(studentId);
      if (selectedStudentForModal?.id === studentId) {
        setSelectedStudentForModal(null);
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (confirm(`¿Eliminar este registro permanentemente?`)) {
      await firebaseService.deleteStudent(studentId);
      if (selectedStudentForModal?.id === studentId) {
        setSelectedStudentForModal(null);
      }
    }
  };

  // CONTROL DE BASE DE DATOS: Limpiar / Reiniciar Resultados
  const handleClearDatabaseResults = async () => {
    const confirmation = confirm(
      '⚠️ ¿Estás seguro de LIMPIAR Y REINICIAR los resultados de todos los alumnos?\n\n' +
      'Esta acción borrará los intentos y notas de los alumnos anteriores en Firebase Realtime Database para que puedas aplicar el examen a un NUEVO GRUPO.\n\n' +
      '(Las preguntas del examen NO se borrarán).'
    );

    if (confirmation) {
      await firebaseService.clearAllStudents();
      setSelectedStudentForModal(null);
      setClearSuccessToast(true);
      setTimeout(() => setClearSuccessToast(false), 3500);
    }
  };

  const handleSeedDemo = () => {
    firebaseService.seedDemoStudents();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert when database reset */}
      {clearSuccessToast && (
        <div className="bg-emerald-600 border border-emerald-400 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs sm:text-sm font-bold">
              ¡Base de datos de alumnos reiniciada con éxito! La plataforma está limpia para recibir al nuevo grupo.
            </span>
          </div>
          <button type="button" onClick={() => setClearSuccessToast(false)} className="text-emerald-100 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Alert when incident detected in real-time */}
      {lastIncidentStudent && (
        <div className="bg-gradient-to-r from-rose-900/90 to-red-900/90 border-2 border-rose-500 rounded-2xl p-4 shadow-xl text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-600">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase font-extrabold tracking-wider text-rose-300">
                🚨 Alerta Anti-Trampas en Vivo
              </p>
              <p className="text-sm font-bold">
                El alumno <span className="underline">{lastIncidentStudent.name}</span> acaba de salir de la pestaña del examen.
                {lastIncidentStudent.warnings >= 3 ? (
                  <span className="ml-2 font-black text-white bg-rose-700 px-2 py-0.5 rounded text-xs">
                    ¡EXPULSIÓN AUTOMÁTICA EJECUTADA!
                  </span>
                ) : (
                  <span className="ml-2 text-rose-200 text-xs">
                    (Infracción {lastIncidentStudent.warnings} de 3)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastIncidentStudent(null)}
            className="text-xs text-rose-300 hover:text-white px-2 py-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* EXAM CONTROL & QR COMMAND BAR */}
      <div className="bg-gradient-to-br from-slate-800/90 via-slate-850 to-slate-900 rounded-3xl border border-slate-700/80 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Active Exam Metadata */}
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Examen Activo en Tiempo Real
                </span>
                <span className="text-xs text-slate-400">
                  • {activeQuestions.length} reactivos ({totalExamPoints} pts)
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {examData.title}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cualquier cambio realizado en las preguntas se sincroniza automáticamente con los alumnos conectados.
              </p>
            </div>
          </div>

          {/* Action Buttons: Load Exam, QR Code & Reset Database */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Load Plain Text Exam */}
            <button
              type="button"
              onClick={() => setIsExamLoaderOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-md shadow-indigo-600/25 transition-all flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Cargar Examen (Texto Plano)</span>
            </button>

            {/* View QR Code */}
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 shadow-sm transition-all flex items-center space-x-2"
            >
              <QrCode className="w-4 h-4 text-pink-400" />
              <span>Mostrar Código QR</span>
            </button>

            {/* Clear Database Results */}
            <button
              type="button"
              onClick={handleClearDatabaseResults}
              title="Borra los intentos anteriores de los alumnos para iniciar con un nuevo grupo"
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Limpiar / Nuevo Grupo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header & Real-time Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Monitor de Supervisión en Vivo
            </h1>
            <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Firebase RTDB en Vivo</span>
            </span>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Supervisa el avance de los alumnos y detecta cambios de pestaña al instante.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {studentList.length === 0 && (
            <button
              type="button"
              onClick={handleSeedDemo}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Cargar Alumnos Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Alumnos</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalStudents}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Registrados en la prueba</p>
        </div>

        {/* In Progress */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">En Examen</span>
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">
            {inProgressCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Respondiendo activamente</p>
        </div>

        {/* Completed Normally */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Completados</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400">
            {completedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Entregados con éxito</p>
        </div>

        {/* Cheated / Expelled */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sancionados</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-400">
            {cheatedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Expulsados por 3 faltas</p>
        </div>

        {/* Group Average */}
        <div className="col-span-2 sm:col-span-1 bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 sm:p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Promedio</span>
            <span className="text-xs font-mono font-bold text-pink-400">PTS</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            {averageScore} <span className="text-sm text-slate-500 font-normal">/ {totalExamPoints}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Calificación promedio</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-800/90 rounded-2xl border border-slate-700/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o matrícula..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Todos ({totalStudents})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'in_progress'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            En Examen ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('cheated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'cheated'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Con Faltas ({studentList.filter((s) => s.cheatWarningsCount > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === 'completed'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Finalizados ({completedCount + cheatedCount})
          </button>
        </div>
      </div>

      {/* Real-time Students Table / Cards */}
      <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 shadow-xl overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500 mb-4">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">No hay alumnos conectados</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Muestra el <strong>Código QR</strong> a tus alumnos o comparte el enlace. Cuando ingresen su matrícula aparecerán aquí al instante con su avance y faltas sincronizadas.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Mostrar Código QR</span>
              </button>

              <button
                type="button"
                onClick={handleSeedDemo}
                className="px-4 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Generar Alumnos de Ejemplo (Demo)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Alumno / Matrícula</th>
                  <th className="py-3.5 px-4">Estado en Vivo</th>
                  <th className="py-3.5 px-4">Progreso</th>
                  <th className="py-3.5 px-4">Calificación</th>
                  <th className="py-3.5 px-4">Faltas Anti-Trampas</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-xs text-slate-200">
                {filteredStudents.map((st) => {
                  const answeredCount = Object.keys(st.answers || {}).length;
                  const totalQCount = activeQuestions.length || 1;
                  const progressPct = Math.round((answeredCount / totalQCount) * 100);

                  return (
                    <tr 
                      key={st.id} 
                      className={`hover:bg-slate-700/30 transition-colors ${
                        st.cheatWarningsCount >= 3 ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      {/* Name & Matricula */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            st.status === 'forced_submission_cheat'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : st.status === 'submitted'
                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            {st.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {st.fullName}
                            </div>
                            <div className="text-[11px] font-mono text-indigo-300">
                              {st.matricula}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {st.status === 'in_progress' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1.5" />
                            En Examen
                          </span>
                        ) : st.status === 'forced_submission_cheat' ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-400" />
                            Expulsado (3 faltas)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                            Completado
                          </span>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="py-4 px-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span>{answeredCount} / {totalQCount}</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-sm text-white">
                          {st.score} <span className="text-[11px] font-normal text-slate-400">/ {totalExamPoints}</span>
                        </div>
                        <span className={`text-[11px] font-bold ${st.percentage >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {st.percentage}%
                        </span>
                      </td>

                      {/* Cheat Warnings Counter Pill */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {st.cheatWarningsCount === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              0 Faltas (Limpio)
                            </span>
                          ) : st.cheatWarningsCount === 1 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
                              1 / 3 Falta
                            </span>
                          ) : st.cheatWarningsCount === 2 ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                              <AlertTriangle className="w-3 h-3 mr-1 text-orange-400" />
                              2 / 3 Faltas (En Riesgo)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-md shadow-rose-600/30">
                              <AlertOctagon className="w-3 h-3 mr-1 text-white animate-bounce" />
                              3 / 3 FALTAS (BLOQUEADO)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentForModal(st)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            title="Ver respuestas e historial de advertencias"
                          >
                            <Eye className="w-4 h-4 text-indigo-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetStudent(st.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            title="Reiniciar intento (permitir volver a hacer el examen)"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-400" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(st.id)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          STUDENT AUDIT & DETAILS MODAL
          ======================================================== */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  {selectedStudentForModal.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">
                    {selectedStudentForModal.fullName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Matrícula: <span className="text-indigo-300 font-semibold">{selectedStudentForModal.matricula}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Score & Violations Quick Bar */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Calificación</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {selectedStudentForModal.score} <span className="text-sm font-normal text-slate-400">/ {totalExamPoints} ({selectedStudentForModal.percentage}%)</span>
                  </div>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Infracciones Registradas</span>
                  <div className={`text-2xl font-black mt-1 ${
                    selectedStudentForModal.cheatWarningsCount >= 3 ? 'text-rose-400' : selectedStudentForModal.cheatWarningsCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {selectedStudentForModal.cheatWarningsCount} / 3
                  </div>
                </div>
              </div>

              {/* Cheating Timeline Log */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-1.5 text-rose-400" />
                  Bitácora de Salidas de Pestaña (Anti-Trampas)
                </h4>

                {(!selectedStudentForModal.cheatLogs || selectedStudentForModal.cheatLogs.length === 0) ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    <span>Sin incidencias. El alumno no abandonó la pestaña durante el examen.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedStudentForModal.cheatLogs.map((log, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-slate-300 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-rose-400 mr-2">Infracción #{log.warningNumber}:</span>
                          <span>{log.reason}</span>
                        </div>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Answers Breakdown against active questions */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center">
                  <HelpCircle className="w-4 h-4 mr-1.5 text-indigo-400" />
                  Respuestas del Alumno ({Object.keys(selectedStudentForModal.answers || {}).length} / {activeQuestions.length})
                </h4>

                <div className="space-y-3">
                  {activeQuestions.map((q, idx) => {
                    const pickedIdx = selectedStudentForModal.answers ? selectedStudentForModal.answers[q.id] : undefined;
                    const isCorrect = pickedIdx === q.correctAnswer;
                    const hasAnswered = pickedIdx !== undefined;

                    return (
                      <div key={q.id} className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">
                            {idx + 1}. {q.question}
                          </span>
                          {hasAnswered ? (
                            isCorrect ? (
                              <span className="text-emerald-400 font-bold shrink-0 ml-2">Correcta (+{q.points}pts)</span>
                            ) : (
                              <span className="text-rose-400 font-bold shrink-0 ml-2">Incorrecta (0pts)</span>
                            )
                          ) : (
                            <span className="text-slate-500 italic shrink-0 ml-2">Sin responder</span>
                          )}
                        </div>

                        {hasAnswered && (
                          <div className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-slate-700/60 font-mono">
                            <p>
                              • Marcó: <span className={isCorrect ? 'text-emerald-400' : 'text-rose-400'}>{q.options[pickedIdx]}</span>
                            </p>
                            {!isCorrect && (
                              <p className="text-emerald-400">
                                • Correcta era: {q.options[q.correctAnswer]}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleResetStudent(selectedStudentForModal.id)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Intento del Alumno</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ExamLoaderModal
        isOpen={isExamLoaderOpen}
        onClose={() => setIsExamLoaderOpen(false)}
        onExamLoaded={(title, questions) => {
          setExamData({ title, questions, updatedAt: Date.now() });
        }}
      />

      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        examTitle={examData.title}
      />
    </div>
  );
};
