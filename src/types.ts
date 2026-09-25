export interface Question {
  id: string;
  topic: string;
  question: string;
  formula?: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points: number;
}

export interface CheatLog {
  timestamp: number;
  reason: string;
  warningNumber: number;
}

export type StudentStatus = 'not_started' | 'in_progress' | 'submitted' | 'forced_submission_cheat';

export interface StudentExamState {
  id: string; // usually normalized matricula/code
  matricula: string;
  fullName: string;
  examId: string;
  examTitle: string;
  status: StudentStatus;
  startedAt: number;
  submittedAt?: number;
  currentQuestionIndex: number;
  answers: Record<string, number>; // questionId -> selectedIndex
  score: number;
  maxScore: number;
  percentage: number;
  cheatWarningsCount: number;
  cheatLogs: CheatLog[];
  lastActive: number;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
