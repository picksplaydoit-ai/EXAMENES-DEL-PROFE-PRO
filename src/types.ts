export type QuestionType = 'opcion_multiple' | 'verdadero_falso' | 'abierta' | 'relacionar';

export interface ColumnPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  topic: string;
  question: string;
  imageUrl?: string;
  formula?: string;
  options?: string[]; // for opcion_multiple and verdadero_falso
  correctAnswer?: number | boolean | string; // for opcion_multiple and verdadero_falso (0/true/'Verdadero', 1/false/'Falso')
  referenceAnswer?: string; // for abierta
  pairs?: ColumnPair[]; // for relacionar
  explanation: string;
  points: number;
}

export interface CheatLog {
  timestamp: number;
  reason: string;
  warningNumber: number;
}

export interface SavedExam {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  durationMinutes: number;
  createdAt: number;
  updatedAt: number;
}

export type StudentStatus = 'not_started' | 'waiting' | 'in_progress' | 'submitted' | 'forced_submission_cheat';

export interface StudentExamState {
  id: string; // usually normalized matricula/code
  matricula: string;
  fullName: string;
  examId: string;
  examTitle: string;
  status: StudentStatus;
  joinedWaitingAt?: number;
  startedAt?: number;
  submittedAt?: number;
  currentQuestionIndex: number;
  answers: Record<string, any>; // questionId -> answer (number, string, or Record<string, string>)
  score: number;
  maxScore: number;
  percentage: number;
  cheatWarningsCount: number;
  cheatLogs: CheatLog[];
  lastActive: number;
}

export interface GlobalSessionState {
  status: 'waiting_room' | 'active' | 'finished';
  durationMinutes: number;
  startedAt?: number;
  endsAt?: number;
  title: string;
  updatedAt: number;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}

export interface QuestionStatItem {
  questionNumber: number;
  question: Question;
  attemptsCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  successRate: number; // 0 to 100 (%)
  errorRate: number; // 0 to 100 (%)
  difficultyLevel: 'alta' | 'media' | 'baja'; // 'alta' = high difficulty / hard, 'media' = moderate, 'baja' = low difficulty / easy
  optionDistribution?: Record<string, number>; // counts per option key (e.g. A: 4, B: 10, C: 2)
  mostCommonWrongAnswer?: string;
  evaluatedStudentCount: number;
}
