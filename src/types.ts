export type QuestionType = 'opcion_multiple' | 'abierta' | 'relacionar';

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
  options?: string[]; // for opcion_multiple
  correctAnswer?: number; // for opcion_multiple
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
