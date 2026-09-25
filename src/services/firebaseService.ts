import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, Database, Unsubscribe } from 'firebase/database';
import { StudentExamState, FirebaseConfig, Question } from '../types';
import { CHEMISTRY_QUESTIONS } from '../data/questions';

const STORAGE_KEY_FIREBASE_CONFIG = 'quimica_firebase_config_v1';
const STORAGE_KEY_STUDENTS_LOCAL = 'quimica_students_local_db';
const STORAGE_KEY_EXAM_DATA = 'quimica_exam_data_v1';
const CHANNEL_NAME = 'quimica_live_proctor_channel';

// Path in Firebase Realtime Database
const DB_BASE_PATH = 'exams/quimica_general_2026/students';
const DB_EXAM_PATH = 'exams/quimica_general_2026/exam_data';

export interface ExamDataPayload {
  title: string;
  questions: Question[];
  updatedAt: number;
}

class FirebaseRealtimeService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private config: FirebaseConfig | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private localStudentsCache: Record<string, StudentExamState> = {};
  private activeExamData: ExamDataPayload = {
    title: 'Examen de Química General',
    questions: CHEMISTRY_QUESTIONS,
    updatedAt: Date.now()
  };

  private activeListeners: Set<(students: Record<string, StudentExamState>) => void> = new Set();
  private examListeners: Set<(data: ExamDataPayload) => void> = new Set();
  private firebaseUnsub: Unsubscribe | null = null;
  private firebaseExamUnsub: Unsubscribe | null = null;

  constructor() {
    this.initBroadcastChannel();
    this.loadConfigFromStorage();
    this.loadExamFromStorage();
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STUDENT_UPDATE') {
            const student = event.data.payload as StudentExamState;
            this.localStudentsCache[student.id] = student;
            this.notifyListeners();
          } else if (event.data?.type === 'STUDENTS_RESET') {
            this.localStudentsCache = event.data.payload || {};
            this.notifyListeners();
          } else if (event.data?.type === 'EXAM_DATA_UPDATE') {
            this.activeExamData = event.data.payload as ExamDataPayload;
            this.notifyExamListeners();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or restricted:', err);
      }
    }
  }

  private loadConfigFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS_LOCAL);
      if (savedStudents) {
        this.localStudentsCache = JSON.parse(savedStudents);
      }
    } catch {
      // Ignore
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved) as FirebaseConfig;
        if (parsed.apiKey && (parsed.databaseURL || parsed.projectId)) {
          this.config = parsed;
          this.initFirebase(parsed);
        }
      }
    } catch {
      // Ignore
    }
  }

  private loadExamFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXAM_DATA);
      if (saved) {
        const parsed = JSON.parse(saved) as ExamDataPayload;
        if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          this.activeExamData = parsed;
        }
      }
    } catch {
      // Ignore
    }
  }

  public initFirebase(config: FirebaseConfig): boolean {
    try {
      this.config = config;
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0];
      } else {
        this.app = initializeApp(config);
      }

      this.db = getDatabase(this.app, config.databaseURL);
      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));

      this.setupFirebaseListener();
      this.setupFirebaseExamListener();
      return true;
    } catch (err) {
      console.error('Error al inicializar Firebase Realtime Database:', err);
      return false;
    }
  }

  public saveConfig(config: FirebaseConfig): boolean {
    return this.initFirebase(config);
  }

  public getConfig(): FirebaseConfig | null {
    return this.config;
  }

  public isConfigured(): boolean {
    return !!(this.config && this.config.apiKey && (this.config.databaseURL || this.config.projectId));
  }

  public clearConfig() {
    this.config = null;
    this.db = null;
    this.app = null;
    if (this.firebaseUnsub) {
      this.firebaseUnsub();
      this.firebaseUnsub = null;
    }
    if (this.firebaseExamUnsub) {
      this.firebaseExamUnsub();
      this.firebaseExamUnsub = null;
    }
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    this.notifyListeners();
  }

  // --- EXAM QUESTIONS MANAGEMENT ---

  public getActiveExam(): ExamDataPayload {
    return this.activeExamData;
  }

  public async saveActiveExam(title: string, questions: Question[]): Promise<void> {
    const payload: ExamDataPayload = {
      title: title.trim() || 'Examen de Química',
      questions,
      updatedAt: Date.now()
    };
    this.activeExamData = payload;

    // 1. Save local
    try {
      localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(payload));
    } catch {
      // Ignore
    }

    // 2. Broadcast to tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EXAM_DATA_UPDATE',
          payload
        });
      } catch {
        // Ignore
      }
    }

    this.notifyExamListeners();

    // 3. Save to Firebase RTDB
    if (this.db) {
      try {
        const examRef = ref(this.db, DB_EXAM_PATH);
        await set(examRef, payload);
      } catch (err) {
        console.error('Error guardando examen en Firebase:', err);
      }
    }
  }

  public subscribeToExam(callback: (data: ExamDataPayload) => void): () => void {
    this.examListeners.add(callback);
    callback(this.activeExamData);

    if (this.db && !this.firebaseExamUnsub) {
      this.setupFirebaseExamListener();
    }

    return () => {
      this.examListeners.delete(callback);
    };
  }

  private setupFirebaseExamListener() {
    if (!this.db) return;
    if (this.firebaseExamUnsub) {
      this.firebaseExamUnsub();
    }

    try {
      const examRef = ref(this.db, DB_EXAM_PATH);
      this.firebaseExamUnsub = onValue(examRef, (snapshot) => {
        const val = snapshot.val() as ExamDataPayload;
        if (val && Array.isArray(val.questions) && val.questions.length > 0) {
          this.activeExamData = val;
          try {
            localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(val));
          } catch {
            // Ignore
          }
          this.notifyExamListeners();
        }
      });
    } catch (err) {
      console.error('Error setupFirebaseExamListener:', err);
    }
  }

  private notifyExamListeners() {
    const copy = { ...this.activeExamData };
    this.examListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error('Error in exam listener:', err);
      }
    });
  }

  // --- STUDENT RESULTS MANAGEMENT ---

  public async syncStudent(student: StudentExamState): Promise<void> {
    this.localStudentsCache[student.id] = student;
    this.saveLocalCache();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STUDENT_UPDATE',
          payload: student
        });
      } catch {
        // Ignore
      }
    }

    this.notifyListeners();

    if (this.db) {
      try {
        const studentRef = ref(this.db, `${DB_BASE_PATH}/${student.id}`);
        await set(studentRef, student);
      } catch (err) {
        console.error('Error escribiendo en Firebase Realtime Database:', err);
      }
    }
  }

  public async deleteStudent(studentId: string): Promise<void> {
    delete this.localStudentsCache[studentId];
    this.saveLocalCache();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STUDENTS_RESET',
          payload: this.localStudentsCache
        });
      } catch {
        // Ignore
      }
    }
    this.notifyListeners();

    if (this.db) {
      try {
        const studentRef = ref(this.db, `${DB_BASE_PATH}/${studentId}`);
        await remove(studentRef);
      } catch (err) {
        console.error('Error eliminando de Firebase:', err);
      }
    }
  }

  public async resetStudentAttempt(studentId: string): Promise<void> {
    await this.deleteStudent(studentId);
  }

  public subscribeToStudents(callback: (students: Record<string, StudentExamState>) => void): () => void {
    this.activeListeners.add(callback);
    callback({ ...this.localStudentsCache });

    if (this.db && !this.firebaseUnsub) {
      this.setupFirebaseListener();
    }

    return () => {
      this.activeListeners.delete(callback);
    };
  }

  private setupFirebaseListener() {
    if (!this.db) return;

    if (this.firebaseUnsub) {
      this.firebaseUnsub();
    }

    try {
      const studentsRef = ref(this.db, DB_BASE_PATH);
      this.firebaseUnsub = onValue(studentsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          this.localStudentsCache = val;
          this.saveLocalCache();
          this.notifyListeners();
        } else {
          this.localStudentsCache = {};
          this.saveLocalCache();
          this.notifyListeners();
        }
      }, (error) => {
        console.error('Firebase Realtime Database listener error:', error);
      });
    } catch (err) {
      console.error('Error setting up Firebase Realtime Database listener:', err);
    }
  }

  private notifyListeners() {
    const copy = { ...this.localStudentsCache };
    this.activeListeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  private saveLocalCache() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS_LOCAL, JSON.stringify(this.localStudentsCache));
    } catch {
      // Ignore
    }
  }

  // Clear all students to reuse exam with a fresh group!
  public async clearAllStudents(): Promise<void> {
    this.localStudentsCache = {};
    this.saveLocalCache();
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STUDENTS_RESET',
          payload: {}
        });
      } catch {
        // Ignore
      }
    }
    this.notifyListeners();

    if (this.db) {
      try {
        const baseRef = ref(this.db, DB_BASE_PATH);
        await remove(baseRef);
      } catch (err) {
        console.error('Error limpiando base de datos:', err);
      }
    }
  }

  // Seed sample mock students for instant demonstration in teacher view
  public seedDemoStudents() {
    const demo: Record<string, StudentExamState> = {
      'DEMO-101': {
        id: 'DEMO-101',
        matricula: 'A01748291',
        fullName: 'Sofía Martínez R.',
        examId: 'quimica_general_2026',
        examTitle: this.activeExamData.title,
        status: 'submitted',
        startedAt: Date.now() - 15 * 60 * 1000,
        submittedAt: Date.now() - 2 * 60 * 1000,
        currentQuestionIndex: this.activeExamData.questions.length - 1,
        answers: {
          [this.activeExamData.questions[0]?.id || 'q0']: this.activeExamData.questions[0]?.correctAnswer || 0,
          [this.activeExamData.questions[1]?.id || 'q1']: this.activeExamData.questions[1]?.correctAnswer || 0,
          [this.activeExamData.questions[2]?.id || 'q2']: this.activeExamData.questions[2]?.correctAnswer || 0,
        },
        score: 100,
        maxScore: 100,
        percentage: 100,
        cheatWarningsCount: 0,
        cheatLogs: [],
        lastActive: Date.now() - 2 * 60 * 1000
      },
      'DEMO-102': {
        id: 'DEMO-102',
        matricula: 'A01332456',
        fullName: 'Carlos Eduardo Vega',
        examId: 'quimica_general_2026',
        examTitle: this.activeExamData.title,
        status: 'in_progress',
        startedAt: Date.now() - 8 * 60 * 1000,
        currentQuestionIndex: 2,
        answers: {
          [this.activeExamData.questions[0]?.id || 'q0']: this.activeExamData.questions[0]?.correctAnswer || 0,
        },
        score: 40,
        maxScore: 100,
        percentage: 40,
        cheatWarningsCount: 1,
        cheatLogs: [
          {
            timestamp: Date.now() - 4 * 60 * 1000,
            reason: 'Cambio de pestaña / ventana desenfocada',
            warningNumber: 1
          }
        ],
        lastActive: Date.now() - 30 * 1000
      },
      'DEMO-103': {
        id: 'DEMO-103',
        matricula: 'A01987654',
        fullName: 'Mateo Gómez Lara',
        examId: 'quimica_general_2026',
        examTitle: this.activeExamData.title,
        status: 'forced_submission_cheat',
        startedAt: Date.now() - 12 * 60 * 1000,
        submittedAt: Date.now() - 5 * 60 * 1000,
        currentQuestionIndex: 1,
        answers: {
          [this.activeExamData.questions[0]?.id || 'q0']: this.activeExamData.questions[0]?.correctAnswer || 0,
        },
        score: 20,
        maxScore: 100,
        percentage: 20,
        cheatWarningsCount: 3,
        cheatLogs: [
          {
            timestamp: Date.now() - 10 * 60 * 1000,
            reason: 'Cambio de pestaña / minimizado',
            warningNumber: 1
          },
          {
            timestamp: Date.now() - 8 * 60 * 1000,
            reason: 'Cambio a navegador secundario o app externa',
            warningNumber: 2
          },
          {
            timestamp: Date.now() - 5 * 60 * 1000,
            reason: 'Tercera infracción: Expulsión automática',
            warningNumber: 3
          }
        ],
        lastActive: Date.now() - 5 * 60 * 1000
      }
    };

    Object.values(demo).forEach((st) => this.syncStudent(st));
  }
}

export const firebaseService = new FirebaseRealtimeService();
