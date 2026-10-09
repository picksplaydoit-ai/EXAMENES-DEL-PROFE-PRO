import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Flame, 
  Award, 
  ArrowLeft, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Layers, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Info,
  Check,
  X,
  Brain,
  Lightbulb,
  PieChart
} from 'lucide-react';
import { Question, StudentExamState, QuestionType } from '../types';

interface ExamStatisticsViewProps {
  examTitle: string;
  questions: Question[];
  students: StudentExamState[];
  onExportExcel: () => void;
  onBackToProctor: () => void;
}

export interface QuestionAnalysis {
  questionNumber: number;
  question: Question;
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  successRate: number; // 0 - 100
  errorRate: number; // 0 - 100
  difficultyLevel: 'alta' | 'media' | 'baja';
  optionDistribution: Record<string, number>;
  mostCommonWrongAnswer?: string;
  mostCommonWrongCount?: number;
  studentsWhoFailed: { matricula: string; name: string; answerText: string }[];
  studentsWhoSucceeded: { matricula: string; name: string }[];
}

export const ExamStatisticsView: React.FC<ExamStatisticsViewProps> = ({
  examTitle,
  questions,
  students,
  onExportExcel,
  onBackToProctor
}) => {
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'alta' | 'media' | 'baja'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'hardest' | 'easiest' | 'number'>('hardest');
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<Record<number, boolean>>({});

  // Helper to evaluate a question for a student
  const evaluateAnswer = (q: Question, ans: any): { isCorrect: boolean; text: string } => {
    if (ans === undefined || ans === null || ans === '') {
      return { isCorrect: false, text: 'Sin responder' };
    }

    if (q.type === 'opcion_multiple' && q.options) {
      const isCorrect = ans === q.correctAnswer;
      const text = typeof ans === 'number' && q.options[ans]
        ? `${String.fromCharCode(65 + ans)}) ${q.options[ans]}`
        : String(ans);
      return { isCorrect, text };
    }

    if (q.type === 'verdadero_falso') {
      const isCorrect = (ans === q.correctAnswer) ||
        (ans === 0 && (q.correctAnswer === 0 || q.correctAnswer === true || q.correctAnswer === 'Verdadero')) ||
        (ans === 1 && (q.correctAnswer === 1 || q.correctAnswer === false || q.correctAnswer === 'Falso')) ||
        (ans === true && (q.correctAnswer === 0 || q.correctAnswer === true)) ||
        (ans === false && (q.correctAnswer === 1 || q.correctAnswer === false));
      const label = (ans === 0 || ans === true || ans === 'Verdadero') ? 'Verdadero' : (ans === 1 || ans === false || ans === 'Falso') ? 'Falso' : String(ans);
      return { isCorrect, text: label };
    }

    if (q.type === 'relacionar' && q.pairs) {
      const matches: Record<string, string> = ans || {};
      let correctPairs = 0;
      q.pairs.forEach((p) => {
        if (matches[p.id] === p.right) correctPairs++;
      });
      const isCorrect = correctPairs === q.pairs.length;
      return { isCorrect, text: `${correctPairs}/${q.pairs.length} parejas correctas` };
    }

    if (q.type === 'abierta') {
      const hasSubstance = typeof ans === 'string' && ans.trim().length >= 10;
      return { isCorrect: hasSubstance, text: typeof ans === 'string' ? ans : 'Texto' };
    }

    return { isCorrect: false, text: String(ans) };
  };

  // Perform psychometric analysis for each question
  const analysisData = useMemo(() => {
    const list: QuestionAnalysis[] = [];
    const activeStudents = students.filter((s) => s.status !== 'not_started' && s.status !== 'waiting');
    // If no active students yet, consider all registered students
    const evaluatedGroup = activeStudents.length > 0 ? activeStudents : students;

    questions.forEach((q, idx) => {
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      const optionDistribution: Record<string, number> = {};
      const wrongAnswerCounts: Record<string, number> = {};
      const studentsWhoFailed: { matricula: string; name: string; answerText: string }[] = [];
      const studentsWhoSucceeded: { matricula: string; name: string }[] = [];

      evaluatedGroup.forEach((st) => {
        const studentAns = st.answers ? st.answers[q.id] : undefined;
        if (studentAns === undefined || studentAns === null || studentAns === '') {
          unansweredCount++;
          return;
        }

        const evalResult = evaluateAnswer(q, studentAns);

        // Record option distribution for multiple choice & V/F
        if (q.type === 'opcion_multiple' && typeof studentAns === 'number') {
          const letter = String.fromCharCode(65 + studentAns);
          optionDistribution[letter] = (optionDistribution[letter] || 0) + 1;
        } else if (q.type === 'verdadero_falso') {
          const optLabel = (studentAns === 0 || studentAns === true || studentAns === 'Verdadero') ? 'Verdadero' : 'Falso';
          optionDistribution[optLabel] = (optionDistribution[optLabel] || 0) + 1;
        }

        if (evalResult.isCorrect) {
          correctCount++;
          studentsWhoSucceeded.push({ matricula: st.matricula, name: st.fullName });
        } else {
          incorrectCount++;
          studentsWhoFailed.push({
            matricula: st.matricula,
            name: st.fullName,
            answerText: evalResult.text
          });
          wrongAnswerCounts[evalResult.text] = (wrongAnswerCounts[evalResult.text] || 0) + 1;
        }
      });

      const attemptsCount = correctCount + incorrectCount;
      const successRate = attemptsCount > 0 ? Math.round((correctCount / attemptsCount) * 100) : 0;
      const errorRate = 100 - successRate;

      // Difficulty level classification
      let difficultyLevel: 'alta' | 'media' | 'baja' = 'media';
      if (attemptsCount === 0) {
        difficultyLevel = 'media';
      } else if (successRate < 45) {
        difficultyLevel = 'alta'; // High difficulty / Hard
      } else if (successRate > 75) {
        difficultyLevel = 'baja'; // Low difficulty / Easy
      } else {
        difficultyLevel = 'media'; // Moderate
      }

      // Most common wrong answer (main distractor)
      let mostCommonWrongAnswer: string | undefined;
      let mostCommonWrongCount = 0;
      Object.entries(wrongAnswerCounts).forEach(([ansText, count]) => {
        if (count > mostCommonWrongCount) {
          mostCommonWrongCount = count;
          mostCommonWrongAnswer = ansText;
        }
      });

      list.push({
        questionNumber: idx + 1,
        question: q,
        attemptsCount,
        correctCount,
        incorrectCount,
        unansweredCount,
        successRate,
        errorRate,
        difficultyLevel,
        optionDistribution,
        mostCommonWrongAnswer,
        mostCommonWrongCount,
        studentsWhoFailed,
        studentsWhoSucceeded
      });
    });

    return list;
  }, [questions, students]);

  // Overall Global Statistics
  const overallStats = useMemo(() => {
    const totalQuestions = questions.length;
    const evaluatedStudents = students.filter((s) => s.status === 'submitted' || s.status === 'forced_submission_cheat' || s.status === 'in_progress');
    const submittedStudents = students.filter((s) => s.status === 'submitted' || s.status === 'forced_submission_cheat');

    const totalScores = evaluatedStudents.map((s) => s.score || 0);
    const avgScore = totalScores.length > 0 ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0;
    const maxScore = totalScores.length > 0 ? Math.max(...totalScores) : 0;
    const minScore = totalScores.length > 0 ? Math.min(...totalScores) : 0;
    const approvedCount = evaluatedStudents.filter((s) => (s.percentage || 0) >= 60).length;
    const passRate = evaluatedStudents.length > 0 ? Math.round((approvedCount / evaluatedStudents.length) * 100) : 0;

    // Hardest & Easiest questions
    const withAttempts = analysisData.filter((a) => a.attemptsCount > 0);
    const sortedByHardest = [...withAttempts].sort((a, b) => b.errorRate - a.errorRate || a.successRate - b.successRate);
    const sortedByEasiest = [...withAttempts].sort((a, b) => b.successRate - a.successRate);

    const hardestQuestion = sortedByHardest[0] || analysisData[0];
    const easiestQuestion = sortedByEasiest[0] || analysisData[analysisData.length - 1];

    const avgSuccess = withAttempts.length > 0
      ? Math.round(withAttempts.reduce((acc, q) => acc + q.successRate, 0) / withAttempts.length)
      : 0;

    // Topic breakdown
    const topicMap: Record<string, { totalSuccess: number; count: number }> = {};
    analysisData.forEach((q) => {
      const topic = q.question.topic || 'General';
      if (!topicMap[topic]) topicMap[topic] = { totalSuccess: 0, count: 0 };
      topicMap[topic].totalSuccess += q.successRate;
      topicMap[topic].count += 1;
    });

    const topicStats = Object.entries(topicMap).map(([topic, data]) => ({
      topic,
      avgSuccess: Math.round(data.totalSuccess / data.count),
      count: data.count
    })).sort((a, b) => a.avgSuccess - b.avgSuccess);

    return {
      totalQuestions,
      evaluatedCount: evaluatedStudents.length,
      submittedCount: submittedStudents.length,
      avgScore,
      maxScore,
      minScore,
      passRate,
      avgSuccess,
      hardestQuestions: sortedByHardest.slice(0, 3),
      easiestQuestions: sortedByEasiest.slice(0, 3),
      hardestQuestion,
      easiestQuestion,
      topicStats
    };
  }, [analysisData, questions, students]);

  // Filter and Sort questions
  const filteredQuestions = useMemo(() => {
    return analysisData
      .filter((item) => {
        if (difficultyFilter !== 'all' && item.difficultyLevel !== difficultyFilter) return false;
        if (typeFilter !== 'all' && item.question.type !== typeFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchText = item.question.question.toLowerCase();
          const matchTopic = (item.question.topic || '').toLowerCase();
          const matchNum = `p${item.questionNumber}`.toLowerCase();
          if (!matchText.includes(q) && !matchTopic.includes(q) && !matchNum.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'hardest') {
          return b.errorRate - a.errorRate || a.questionNumber - b.questionNumber;
        }
        if (sortBy === 'easiest') {
          return b.successRate - a.successRate || a.questionNumber - b.questionNumber;
        }
        return a.questionNumber - b.questionNumber;
      });
  }, [analysisData, difficultyFilter, typeFilter, searchQuery, sortBy]);

  const toggleExpand = (qNum: number) => {
    setExpandedQuestionIdx((prev) => ({
      ...prev,
      [qNum]: !prev[qNum]
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Navigation */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Diagnóstico Psicometría y Reactivos</span>
              <span>•</span>
              <span className="text-slate-400">{questions.length} reactivos en total</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-3">
              <span>Estadísticas del Examen: {examTitle}</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-3xl">
              Identifica de forma instantánea qué preguntas generaron mayor dificultad (trampas / distractores frecuentes), cuáles fueron dominadas por el grupo y la tasa de acierto de cada reactivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToProctor}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Monitor en Vivo</span>
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 border border-emerald-500/40 transition-all flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Metric 1: Group Dominance Rate */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dominio Global</span>
            <Brain className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            {overallStats.avgSuccess}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Acierto promedio por reactivo</p>
        </div>

        {/* Metric 2: Hardest Question Callout */}
        <div className="bg-slate-800/80 rounded-2xl border border-rose-500/30 p-4 shadow-lg bg-rose-500/5">
          <div className="flex items-center justify-between text-rose-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              <span>Más Difícil</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
              {overallStats.hardestQuestion ? `${overallStats.hardestQuestion.errorRate}% Error` : 'N/A'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400">
            {overallStats.hardestQuestion ? `Pregunta #${overallStats.hardestQuestion.questionNumber}` : 'Sin datos'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {overallStats.hardestQuestion ? overallStats.hardestQuestion.question.question : 'Aún sin intentos'}
          </p>
        </div>

        {/* Metric 3: Easiest Question Callout */}
        <div className="bg-slate-800/80 rounded-2xl border border-emerald-500/30 p-4 shadow-lg bg-emerald-500/5">
          <div className="flex items-center justify-between text-emerald-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Más Fácil</span>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              {overallStats.easiestQuestion ? `${overallStats.easiestQuestion.successRate}% Acierto` : 'N/A'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {overallStats.easiestQuestion ? `Pregunta #${overallStats.easiestQuestion.questionNumber}` : 'Sin datos'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {overallStats.easiestQuestion ? overallStats.easiestQuestion.question.question : 'Aún sin intentos'}
          </p>
        </div>

        {/* Metric 4: Pass Rate */}
        <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Aprobación</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {overallStats.passRate}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Alumnos con puntaje ≥ 60%</p>
        </div>

        {/* Metric 5: Participants Evaluated */}
        <div className="col-span-2 sm:col-span-1 bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Muestra</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-300">
            {overallStats.evaluatedCount} <span className="text-xs text-slate-500 font-normal">alumnos</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {overallStats.submittedCount} con entrega finalizada
          </p>
        </div>
      </div>

      {/* Podium: TOP 3 Preguntas Más Difíciles y TOP 3 Preguntas Más Fáciles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Top Hardest Questions (Los Mayores Retos) */}
        <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Top Preguntas Más Difíciles</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold uppercase">
                    Mayor Tasa de Error
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Reactivos que presentaron mayor reto o posible confusión conceptual para el grupo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {overallStats.hardestQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aún no hay respuestas registradas para determinar las preguntas más difíciles.
              </p>
            ) : (
              overallStats.hardestQuestions.map((item, rank) => (
                <div
                  key={item.questionNumber}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-rose-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs flex items-center justify-center">
                        #{rank + 1}
                      </span>
                      <span className="font-bold text-xs text-white">
                        Reactivo P{item.questionNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.question.type === 'opcion_multiple' ? 'Opción Múltiple' : item.question.type === 'verdadero_falso' ? 'V/F' : item.question.type === 'relacionar' ? 'Relacionar' : 'Abierta'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-rose-400 font-bold">
                        {item.errorRate}% Fallos
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-emerald-400 font-semibold">
                        {item.successRate}% Aciertos
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2">
                    {item.question.question}
                  </p>

                  {/* Distractor callout */}
                  {item.mostCommonWrongAnswer && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-2.5 py-1.5 text-[11px] text-rose-300 flex items-center justify-between">
                      <span className="font-semibold">⚠️ Distractor principal elegido:</span>
                      <span className="font-bold truncate max-w-[200px]" title={item.mostCommonWrongAnswer}>
                        "{item.mostCommonWrongAnswer}" ({item.mostCommonWrongCount} alumnos)
                      </span>
                    </div>
                  )}

                  {/* Progress visual bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${item.successRate}%` }}
                      title={`Aciertos: ${item.successRate}%`}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${item.errorRate}%` }}
                      title={`Errores: ${item.errorRate}%`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Top Easiest Questions (Mayor Dominio) */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>Top Preguntas Más Fáciles</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                    Mayor Dominio
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Conceptos sólidos con la mayor proporción de respuestas correctas en el grupo.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {overallStats.easiestQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aún no hay respuestas registradas para determinar las preguntas más fáciles.
              </p>
            ) : (
              overallStats.easiestQuestions.map((item, rank) => (
                <div
                  key={item.questionNumber}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center">
                        #{rank + 1}
                      </span>
                      <span className="font-bold text-xs text-white">
                        Reactivo P{item.questionNumber}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.question.type === 'opcion_multiple' ? 'Opción Múltiple' : item.question.type === 'verdadero_falso' ? 'V/F' : item.question.type === 'relacionar' ? 'Relacionar' : 'Abierta'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-emerald-400 font-bold">
                        {item.successRate}% Aciertos
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">
                        {item.correctCount}/{item.attemptsCount} alumnos
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 line-clamp-2">
                    {item.question.question}
                  </p>

                  {/* Success callout */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-300 flex items-center justify-between">
                    <span className="font-semibold">✓ Dominio consolidado:</span>
                    <span className="font-bold">
                      {item.correctCount} aciertos de {item.attemptsCount} respuestas
                    </span>
                  </div>

                  {/* Progress visual bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all"
                      style={{ width: `${item.successRate}%` }}
                      title={`Aciertos: ${item.successRate}%`}
                    />
                    <div
                      className="bg-rose-500 h-full transition-all"
                      style={{ width: `${item.errorRate}%` }}
                      title={`Errores: ${item.errorRate}%`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Diagnostic By Topic Summary Bar */}
      {overallStats.topicStats.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Desempeño y Dominio por Categoría / Tema
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">
              {overallStats.topicStats.length} áreas temáticas evaluadas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {overallStats.topicStats.map((t) => (
              <div
                key={t.topic}
                className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 truncate" title={t.topic}>
                    {t.topic}
                  </span>
                  <span className={`font-mono font-bold ${
                    t.avgSuccess >= 70 ? 'text-emerald-400' : t.avgSuccess >= 45 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {t.avgSuccess}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      t.avgSuccess >= 70 ? 'bg-emerald-500' : t.avgSuccess >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${t.avgSuccess}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>{t.count} {t.count === 1 ? 'reactivo' : 'reactivos'}</span>
                  <span>{t.avgSuccess < 50 ? 'Requiere refuerzo' : t.avgSuccess >= 75 ? 'Excelente' : 'Aceptable'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Questions Breakdown Table & Search Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-white">
              Análisis Exhaustivo de Cada Reactivo ({filteredQuestions.length} de {questions.length})
            </h3>
            <p className="text-xs text-slate-400">
              Explora las respuestas de cada reactivo, opciones elegidas por los alumnos y justificación conceptual.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pregunta o tema..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filters and Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Dificultad:
            </span>
            <button
              type="button"
              onClick={() => setDifficultyFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                difficultyFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Todos ({analysisData.length})
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('alta')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                difficultyFilter === 'alta'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-rose-300 hover:text-white'
              }`}
            >
              <span>🔴 Alta / Difíciles ({analysisData.filter((q) => q.difficultyLevel === 'alta').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('media')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                difficultyFilter === 'media'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-amber-300 hover:text-white'
              }`}
            >
              <span>🟡 Moderadas ({analysisData.filter((q) => q.difficultyLevel === 'media').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setDifficultyFilter('baja')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                difficultyFilter === 'baja'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-emerald-300 hover:text-white'
              }`}
            >
              <span>🟢 Baja / Fáciles ({analysisData.filter((q) => q.difficultyLevel === 'baja').length})</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">Todos los Tipos</option>
              <option value="opcion_multiple">Opción Múltiple</option>
              <option value="verdadero_falso">Verdadero o Falso</option>
              <option value="relacionar">Relacionar</option>
              <option value="abierta">Abiertas</option>
            </select>

            {/* Sort selector */}
            <div className="flex items-center space-x-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-semibold focus:outline-none"
              >
                <option value="hardest" className="bg-slate-900">Más Difíciles primero</option>
                <option value="easiest" className="bg-slate-900">Más Fáciles primero</option>
                <option value="number" className="bg-slate-900">Número de Reactivo (#)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-10 bg-slate-950/40 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-400">No se encontraron reactivos con los filtros aplicados.</p>
            </div>
          ) : (
            filteredQuestions.map((item) => {
              const isExpanded = Boolean(expandedQuestionIdx[item.questionNumber]);

              const diffBadge = item.difficultyLevel === 'alta'
                ? { label: 'DIFICULTAD ALTA (DURA)', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }
                : item.difficultyLevel === 'baja'
                ? { label: 'DIFICULTAD BAJA (FÁCIL)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
                : { label: 'DIFICULTAD MEDIA', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };

              return (
                <div
                  key={item.questionNumber}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 transition-all hover:border-slate-700"
                >
                  {/* Top Bar of Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center space-x-2">
                      <span className="w-7 h-7 rounded-xl bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center">
                        #{item.questionNumber}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffBadge.bg}`}>
                        {diffBadge.label}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {item.question.type === 'opcion_multiple' ? 'Opción Múltiple' : item.question.type === 'verdadero_falso' ? 'V/F' : item.question.type === 'relacionar' ? 'Relacionar' : 'Abierta'}
                      </span>
                      {item.question.topic && (
                        <span className="text-[11px] text-indigo-300 font-semibold hidden sm:inline">
                          • {item.question.topic}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Metric percentages */}
                      <div className="flex items-center space-x-2 font-mono text-xs">
                        <span className="text-emerald-400 font-bold">
                          ✓ {item.successRate}% Acierto
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="text-rose-400 font-bold">
                          ✗ {item.errorRate}% Error
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleExpand(item.questionNumber)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center space-x-1"
                      >
                        <span>{isExpanded ? 'Ocultar' : 'Ver Detalles'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                      {item.question.question}
                    </h4>
                  </div>

                  {/* Progress Bar & Breakdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{item.correctCount} alumnos acertaron</span>
                      <span>{item.incorrectCount} alumnos fallaron {item.unansweredCount > 0 && `• ${item.unansweredCount} sin responder`}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all"
                        style={{ width: `${item.successRate}%` }}
                        title={`Aciertos: ${item.successRate}%`}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all"
                        style={{ width: `${item.errorRate}%` }}
                        title={`Errores: ${item.errorRate}%`}
                      />
                    </div>
                  </div>

                  {/* Multiple Choice Options Distribution Chips */}
                  {item.question.type === 'opcion_multiple' && item.question.options && (
                    <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {item.question.options.map((opt, oIdx) => {
                        const letter = String.fromCharCode(65 + oIdx);
                        const isCorrect = item.question.correctAnswer === oIdx;
                        const count = item.optionDistribution[letter] || 0;
                        const pct = item.attemptsCount > 0 ? Math.round((count / item.attemptsCount) * 100) : 0;

                        return (
                          <div
                            key={oIdx}
                            className={`p-2 rounded-xl text-[11px] border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold'
                                : count > 0 && pct >= 30
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <div className="flex items-center space-x-1.5 truncate pr-1">
                              <span className={`w-5 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center ${
                                isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {letter}
                              </span>
                              <span className="truncate" title={opt}>{opt}</span>
                            </div>
                            <span className="font-mono font-bold shrink-0 text-[10px]">
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Expanded Breakdown Accordion */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-800 space-y-3 animate-in fade-in">
                      {/* Pedagogical Explanation */}
                      {item.question.explanation && (
                        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200 space-y-1">
                          <span className="font-bold flex items-center space-x-1.5 text-indigo-300">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Justificación Oficial & Rúbrica:</span>
                          </span>
                          <p>{item.question.explanation}</p>
                        </div>
                      )}

                      {/* Lists of Students */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Students Who Missed */}
                        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-rose-300 font-bold">
                            <span className="flex items-center space-x-1">
                              <X className="w-3.5 h-3.5 text-rose-400" />
                              <span>Alumnos que fallaron ({item.studentsWhoFailed.length})</span>
                            </span>
                          </div>
                          {item.studentsWhoFailed.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Ningún alumno falló este reactivo.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {item.studentsWhoFailed.map((st, sIdx) => (
                                <div key={sIdx} className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2 py-1 rounded">
                                  <span className="text-white font-medium">{st.name} ({st.matricula})</span>
                                  <span className="text-rose-400 font-mono truncate max-w-[120px]" title={st.answerText}>
                                    {st.answerText}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Students Who Succeeded */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between text-emerald-300 font-bold">
                            <span className="flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Alumnos que acertaron ({item.studentsWhoSucceeded.length})</span>
                            </span>
                          </div>
                          {item.studentsWhoSucceeded.length === 0 ? (
                            <p className="text-[11px] text-slate-500">Ningún alumno acertó este reactivo.</p>
                          ) : (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                              {item.studentsWhoSucceeded.map((st, sIdx) => (
                                <div key={sIdx} className="text-[11px] bg-slate-900/80 px-2 py-1 rounded text-slate-300">
                                  {st.name} <span className="text-slate-500 font-mono">({st.matricula})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
