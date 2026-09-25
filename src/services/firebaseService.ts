import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, remove, Database } from 'firebase/database';
import { 
  getFirestore, 
  initializeFirestore,
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  deleteDoc, 
  collection, 
  getDocFromServer,
  Unsubscribe as FirestoreUnsubscribe 
} from 'firebase/firestore';
import { StudentExamState, FirebaseConfig, Question, GlobalSessionState, SavedExam } from '../types';
import { CHEMISTRY_QUESTIONS, PREDEFINED_SAVED_EXAMS } from '../data/questions';
import defaultAppletConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'quimica_firebase_config_v1';
const STORAGE_KEY_STUDENTS_LOCAL = 'quimica_students_local_db';
const STORAGE_KEY_EXAM_DATA = 'quimica_exam_data_v1';
const STORAGE_KEY_SAVED_EXAMS = 'quimica_saved_exams_library_v1';
const STORAGE_KEY_SESSION_DATA = 'quimica_global_session_v1';
const CHANNEL_NAME = 'quimica_live_proctor_channel';

// Paths in Firebase
const DB_BASE_PATH = 'exams/quimica_general_2026/students';
const DB_EXAM_PATH = 'exams/quimica_general_2026/exam_data';
const DB_SESSION_PATH = 'exams/quimica_general_2026/global_session';

export interface ExamDataPayload {
  title: string;
  questions: Question[];
  updatedAt: number;
}

class FirebaseDualService {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private firestore: Firestore | null = null;
  private config: FirebaseConfig | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private localStudentsCache: Record<string, StudentExamState> = {};
  private savedExams: SavedExam[] = [];
  
  private activeExamData: ExamDataPayload = {
    title: 'Examen de Química General',
    questions: CHEMISTRY_QUESTIONS,
    updatedAt: Date.now()
  };

  private globalSession: GlobalSessionState = {
    status: 'waiting_room',
    durationMinutes: 20,
    title: 'Examen de Química General',
    updatedAt: Date.now()
  };

  private activeListeners: Set<(students: Record<string, StudentExamState>) => void> = new Set();
  private examListeners: Set<(data: ExamDataPayload) => void> = new Set();
  private sessionListeners: Set<(session: GlobalSessionState) => void> = new Set();
  private savedExamsListeners: Set<(exams: SavedExam[]) => void> = new Set();

  private rtdbStudentsUnsub: (() => void) | null = null;
  private rtdbExamUnsub: (() => void) | null = null;
  private rtdbSessionUnsub: (() => void) | null = null;

  private firestoreStudentsUnsub: FirestoreUnsubscribe | null = null;
  private firestoreExamUnsub: FirestoreUnsubscribe | null = null;
  private firestoreSessionUnsub: FirestoreUnsubscribe | null = null;

  constructor() {
    this.initBroadcastChannel();
    this.loadSavedExamsFromStorage();
    this.loadExamFromStorage();
    this.loadSessionFromStorage();
    this.loadLocalCache();
    this.initDefaultConfig();
    this.initNetworkRecovery();
  }

  private initNetworkRecovery() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.flushOfflineQueue();
        this.fetchActiveExam(true);
      });
      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          this.flushOfflineQueue();
        }
      }, 5000);
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
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
            } else if (event.data?.type === 'SESSION_UPDATE') {
              this.globalSession = event.data.payload as GlobalSessionState;
              this.notifySessionListeners();
            }
          };
        } catch (err) {
          console.warn('BroadcastChannel not supported or restricted:', err);
        }
      }

      // Cross-tab synchronization via localStorage events (vital for same-device student & teacher testing)
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY_EXAM_DATA && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue) as ExamDataPayload;
            if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
              this.activeExamData = parsed;
              this.notifyExamListeners();
            }
          } catch {
            // Ignore
          }
        } else if (event.key === STORAGE_KEY_SESSION_DATA && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue) as GlobalSessionState;
            if (parsed && parsed.status) {
              this.globalSession = parsed;
              this.notifySessionListeners();
            }
          } catch {
            // Ignore
          }
        } else if (event.key === STORAGE_KEY_STUDENTS_LOCAL && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (parsed) {
              this.localStudentsCache = parsed;
              this.notifyListeners();
            }
          } catch {
            // Ignore
          }
        }
      });

      // Custom window event listener for in-app synchronous updates
      window.addEventListener('quimica:exam_sync', (event: any) => {
        if (event.detail) {
          this.activeExamData = event.detail;
          this.notifyExamListeners();
        }
      });
      window.addEventListener('quimica:session_sync', (event: any) => {
        if (event.detail) {
          this.globalSession = event.detail;
          this.notifySessionListeners();
        }
      });
    }
  }

  private loadLocalCache() {
    if (typeof window === 'undefined') return;
    try {
      const savedStudents = localStorage.getItem(STORAGE_KEY_STUDENTS_LOCAL);
      if (savedStudents) {
        this.localStudentsCache = JSON.parse(savedStudents);
      }
    } catch {
      // Ignore
    }
  }

  private initDefaultConfig() {
    if (typeof window === 'undefined') return;

    // Check localStorage first
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved) as FirebaseConfig;
        if (parsed.apiKey && (parsed.projectId || parsed.databaseURL)) {
          this.initFirebase(parsed);
          return;
        }
      }
    } catch {
      // Ignore
    }

    // Auto-connect with provisioned firebase-applet-config.json
    if (defaultAppletConfig && defaultAppletConfig.apiKey && defaultAppletConfig.projectId) {
      const autoConfig: FirebaseConfig = {
        apiKey: defaultAppletConfig.apiKey,
        authDomain: defaultAppletConfig.authDomain || `${defaultAppletConfig.projectId}.firebaseapp.com`,
        projectId: defaultAppletConfig.projectId,
        storageBucket: defaultAppletConfig.storageBucket,
        messagingSenderId: defaultAppletConfig.messagingSenderId,
        appId: defaultAppletConfig.appId,
        firestoreDatabaseId: defaultAppletConfig.firestoreDatabaseId
      };
      this.initFirebase(autoConfig);
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

  private loadSessionFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION_DATA);
      if (saved) {
        const parsed = JSON.parse(saved) as GlobalSessionState;
        if (parsed && parsed.status) {
          this.globalSession = parsed;
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

      // Initialize Firestore if available
      try {
        if (config.firestoreDatabaseId) {
          try {
            this.firestore = initializeFirestore(this.app, {
              experimentalAutoDetectLongPolling: true
            }, config.firestoreDatabaseId);
          } catch {
            this.firestore = getFirestore(this.app, config.firestoreDatabaseId);
          }
        } else {
          try {
            this.firestore = initializeFirestore(this.app, {
              experimentalAutoDetectLongPolling: true
            });
          } catch {
            this.firestore = getFirestore(this.app);
          }
        }
        this.testFirestoreConnection();
        this.setupFirestoreListeners();
      } catch (fErr) {
        console.warn('Firestore initialization note:', fErr);
      }

      // Initialize Realtime Database if databaseURL is provided
      if (config.databaseURL) {
        try {
          this.db = getDatabase(this.app, config.databaseURL);
          this.setupRTDBListeners();
        } catch (rErr) {
          console.warn('RTDB initialization note:', rErr);
        }
      }

      localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
      return true;
    } catch (err) {
      console.error('Error al inicializar Firebase:', err);
      return false;
    }
  }

  private async testFirestoreConnection() {
    if (!this.firestore) return;
    try {
      await getDocFromServer(doc(this.firestore, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('offline') || msg.includes('unavailable') || (error as { code?: string }).code === 'unavailable') {
          console.warn('Firestore: funcionando en modo offline / caché local mientras se estabiliza la conexión.');
        } else if ((error as { code?: string }).code === 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'test/connection');
        } else {
          console.warn('Firestore aviso de conexión:', error.message);
        }
      }
    }
  }

  public saveConfig(config: FirebaseConfig): boolean {
    return this.initFirebase(config);
  }

  public getConfig(): FirebaseConfig | null {
    return this.config;
  }

  public isConfigured(): boolean {
    return !!(this.config && this.config.apiKey && (this.config.projectId || this.config.databaseURL));
  }

  public isFirestoreActive(): boolean {
    return !!this.firestore;
  }

  public clearConfig() {
    this.config = null;
    this.db = null;
    this.firestore = null;
    this.app = null;

    if (this.rtdbStudentsUnsub) this.rtdbStudentsUnsub();
    if (this.rtdbExamUnsub) this.rtdbExamUnsub();
    if (this.rtdbSessionUnsub) this.rtdbSessionUnsub();

    if (this.firestoreStudentsUnsub) this.firestoreStudentsUnsub();
    if (this.firestoreExamUnsub) this.firestoreExamUnsub();
    if (this.firestoreSessionUnsub) this.firestoreSessionUnsub();

    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    this.notifyListeners();
  }

  // --- GLOBAL EXAM SESSION (KAHOOT STYLE WAITING ROOM & TIMER) ---

  public getGlobalSession(): GlobalSessionState {
    return this.globalSession;
  }

  public async setGlobalSession(session: GlobalSessionState): Promise<void> {
    this.globalSession = session;
    try {
      localStorage.setItem(STORAGE_KEY_SESSION_DATA, JSON.stringify(session));
    } catch {
      // Ignore
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SESSION_UPDATE',
          payload: session
        });
      } catch {
        // Ignore
      }
    }
    this.notifySessionListeners();

    // Sync to Firestore
    if (this.firestore) {
      try {
        const sessionDocRef = doc(this.firestore, 'exams', 'quimica_general_2026', 'session', 'current');
        await setDoc(sessionDocRef, session, { merge: true });
      } catch (err) {
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.WRITE, 'exams/quimica_general_2026/session/current');
        } else {
          console.warn('Error guardando sesión en Firestore:', err);
        }
      }
    }

    // Sync to RTDB fallback
    if (this.db) {
      try {
        const sessionRef = ref(this.db, DB_SESSION_PATH);
        await set(sessionRef, session);
      } catch (err) {
        console.error('Error guardando sesión en RTDB:', err);
      }
    }
  }

  public async startExamForEveryone(durationMinutes: number): Promise<void> {
    const startedAt = Date.now();
    const endsAt = startedAt + durationMinutes * 60 * 1000;

    const newSession: GlobalSessionState = {
      status: 'active',
      durationMinutes,
      startedAt,
      endsAt,
      title: this.activeExamData.title,
      updatedAt: startedAt
    };

    // Transition all waiting students to 'in_progress'
    const studentPromises: Promise<void>[] = [];
    Object.values(this.localStudentsCache).forEach((student) => {
      if (student.status === 'waiting') {
        student.status = 'in_progress';
        student.startedAt = startedAt;
        studentPromises.push(this.syncStudent(student));
      }
    });

    await Promise.all(studentPromises);
    await this.setGlobalSession(newSession);
  }

  public async resetSessionToWaitingRoom(): Promise<void> {
    const newSession: GlobalSessionState = {
      status: 'waiting_room',
      durationMinutes: this.globalSession.durationMinutes || 20,
      title: this.activeExamData.title,
      updatedAt: Date.now()
    };
    await this.setGlobalSession(newSession);
  }

  public subscribeToGlobalSession(callback: (session: GlobalSessionState) => void): () => void {
    this.sessionListeners.add(callback);
    callback(this.globalSession);

    return () => {
      this.sessionListeners.delete(callback);
    };
  }

  private notifySessionListeners() {
    const copy = { ...this.globalSession };
    this.sessionListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error('Error in session listener:', err);
      }
    });
  }

  // --- EXAM QUESTIONS MANAGEMENT ---

  public getActiveExam(): ExamDataPayload {
    return this.activeExamData;
  }

  public async fetchActiveExam(forceServer: boolean = false): Promise<ExamDataPayload> {
    if (this.firestore) {
      try {
        const examDocRef = doc(this.firestore, 'exams', 'quimica_general_2026');
        let snap;
        if (forceServer) {
          try {
            snap = await getDocFromServer(examDocRef);
          } catch {
            snap = await getDoc(examDocRef);
          }
        } else {
          snap = await getDoc(examDocRef);
        }

        if (snap && snap.exists()) {
          const val = snap.data() as ExamDataPayload;
          if (val && Array.isArray(val.questions) && val.questions.length > 0) {
            this.activeExamData = val;
            try {
              localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(val));
            } catch {}
            this.notifyExamListeners();
            return val;
          }
        }
      } catch (err) {
        console.warn('Nota al consultar examen activo en Firestore:', err);
      }
    }
    return this.activeExamData;
  }

  public async saveActiveExam(title: string, questions: Question[]): Promise<void> {
    const payload: ExamDataPayload = {
      title: title.trim() || 'Examen de Química',
      questions,
      updatedAt: Date.now()
    };
    this.activeExamData = payload;

    try {
      localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(payload));
    } catch {
      // Ignore
    }

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

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('quimica:exam_sync', { detail: payload }));
      } catch {
        // Ignore
      }
    }

    // Save to Firestore (full overwrite so new questions replace old ones cleanly)
    if (this.firestore) {
      try {
        const examDocRef = doc(this.firestore, 'exams', 'quimica_general_2026');
        await setDoc(examDocRef, payload);
      } catch (err) {
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.WRITE, 'exams/quimica_general_2026');
        } else {
          console.warn('Error guardando examen en Firestore:', err);
        }
      }
    }

    // Save to RTDB
    if (this.db) {
      try {
        const examRef = ref(this.db, DB_EXAM_PATH);
        await set(examRef, payload);
      } catch (err) {
        console.error('Error guardando examen en RTDB:', err);
      }
    }
  }

  public subscribeToExam(callback: (data: ExamDataPayload) => void): () => void {
    this.examListeners.add(callback);
    callback(this.activeExamData);

    return () => {
      this.examListeners.delete(callback);
    };
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

  // --- SAVED EXAMS LIBRARY (GUARDAR DISTINTOS EXÁMENES & CREAR NUEVO EXAMEN) ---

  private loadSavedExamsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_EXAMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.savedExams = parsed;
          return;
        }
      }
    } catch {
      // Ignore
    }
    // Default to predefined chemistry exams
    this.savedExams = [...PREDEFINED_SAVED_EXAMS];
    this.saveSavedExamsToStorage();
  }

  private saveSavedExamsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_EXAMS, JSON.stringify(this.savedExams));
    } catch {
      // Ignore
    }
  }

  public getSavedExams(): SavedExam[] {
    return [...this.savedExams];
  }

  public async saveExamToLibrary(exam: {
    id?: string;
    title: string;
    description?: string;
    questions: Question[];
    durationMinutes?: number;
  }): Promise<SavedExam> {
    const now = Date.now();
    const cleanTitle = exam.title.trim() || 'Examen Sin Título';
    const examId = exam.id || `exam_${now}_${Math.random().toString(36).substring(2, 7)}`;

    const existingIndex = this.savedExams.findIndex((e) => e.id === examId);
    let savedItem: SavedExam;

    if (existingIndex >= 0) {
      savedItem = {
        ...this.savedExams[existingIndex],
        title: cleanTitle,
        description: exam.description || this.savedExams[existingIndex].description,
        questions: exam.questions,
        durationMinutes: exam.durationMinutes || this.savedExams[existingIndex].durationMinutes || 20,
        updatedAt: now
      };
      this.savedExams[existingIndex] = savedItem;
    } else {
      savedItem = {
        id: examId,
        title: cleanTitle,
        description: exam.description || 'Evaluación de opción múltiple',
        questions: exam.questions,
        durationMinutes: exam.durationMinutes || 20,
        createdAt: now,
        updatedAt: now
      };
      this.savedExams.unshift(savedItem);
    }

    this.saveSavedExamsToStorage();
    this.notifySavedExamsListeners();
    return savedItem;
  }

  public async deleteSavedExam(id: string): Promise<void> {
    this.savedExams = this.savedExams.filter((e) => e.id !== id);
    if (this.savedExams.length === 0) {
      this.savedExams = [...PREDEFINED_SAVED_EXAMS];
    }
    this.saveSavedExamsToStorage();
    this.notifySavedExamsListeners();
  }

  public async activateSavedExam(id: string, clearStudents: boolean = false): Promise<SavedExam | null> {
    const target = this.savedExams.find((e) => e.id === id);
    if (!target) return null;

    await this.saveActiveExam(target.title, target.questions);
    if (target.durationMinutes) {
      this.globalSession.durationMinutes = target.durationMinutes;
      await this.setGlobalSession({
        ...this.globalSession,
        durationMinutes: target.durationMinutes,
        title: target.title
      });
    }

    if (clearStudents) {
      await this.clearAllStudents();
    }

    return target;
  }

  public subscribeToSavedExams(callback: (exams: SavedExam[]) => void): () => void {
    this.savedExamsListeners.add(callback);
    callback(this.getSavedExams());

    return () => {
      this.savedExamsListeners.delete(callback);
    };
  }

  private notifySavedExamsListeners() {
    const copy = [...this.savedExams];
    this.savedExamsListeners.forEach((fn) => {
      try {
        fn(copy);
      } catch (err) {
        console.error('Error in savedExams listener:', err);
      }
    });
  }

  // --- STUDENT RESULTS MANAGEMENT ---

  private queueOfflineStudent(student: StudentExamState) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('quimica_offline_sync_queue');
      const q = raw ? JSON.parse(raw) : {};
      q[student.id] = student;
      localStorage.setItem('quimica_offline_sync_queue', JSON.stringify(q));
    } catch {
      // Ignore
    }
  }

  public async flushOfflineQueue(): Promise<void> {
    if (typeof window === 'undefined' || !this.firestore) return;
    try {
      const raw = localStorage.getItem('quimica_offline_sync_queue');
      if (!raw) return;
      const q = JSON.parse(raw) as Record<string, StudentExamState>;
      const ids = Object.keys(q);
      if (ids.length === 0) return;

      for (const id of ids) {
        const st = q[id];
        try {
          const studentDocRef = doc(this.firestore, 'exams', 'quimica_general_2026', 'students', id);
          await setDoc(studentDocRef, st, { merge: true });
          delete q[id];
        } catch {
          // Keep in queue for next flush attempt
        }
      }
      localStorage.setItem('quimica_offline_sync_queue', JSON.stringify(q));
    } catch {
      // Ignore
    }
  }

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

    // Check if offline: queue immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.queueOfflineStudent(student);
      return;
    }

    // Sync to Firestore
    if (this.firestore) {
      try {
        const studentDocRef = doc(this.firestore, 'exams', 'quimica_general_2026', 'students', student.id);
        await setDoc(studentDocRef, student, { merge: true });
      } catch (err) {
        this.queueOfflineStudent(student);
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.WRITE, `exams/quimica_general_2026/students/${student.id}`);
        } else {
          console.warn('Sync diferido por fallo de red; encolado para reintento automático:', err);
        }
      }
    }

    // Sync to RTDB
    if (this.db) {
      try {
        const studentRef = ref(this.db, `${DB_BASE_PATH}/${student.id}`);
        await set(studentRef, student);
      } catch (err) {
        console.error('Error escribiendo en Firebase RTDB:', err);
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

    // Delete from Firestore
    if (this.firestore) {
      try {
        const studentDocRef = doc(this.firestore, 'exams', 'quimica_general_2026', 'students', studentId);
        await deleteDoc(studentDocRef);
      } catch (err) {
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.DELETE, `exams/quimica_general_2026/students/${studentId}`);
        } else {
          console.warn('Error eliminando de Firestore:', err);
        }
      }
    }

    // Delete from RTDB
    if (this.db) {
      try {
        const studentRef = ref(this.db, `${DB_BASE_PATH}/${studentId}`);
        await remove(studentRef);
      } catch (err) {
        console.error('Error eliminando de RTDB:', err);
      }
    }
  }

  public async resetStudentAttempt(studentId: string): Promise<void> {
    await this.deleteStudent(studentId);
  }

  public subscribeToStudents(callback: (students: Record<string, StudentExamState>) => void): () => void {
    this.activeListeners.add(callback);
    callback({ ...this.localStudentsCache });

    return () => {
      this.activeListeners.delete(callback);
    };
  }

  // --- FIRESTORE REAL-TIME SNAPSHOT LISTENERS ---

  private setupFirestoreListeners() {
    if (!this.firestore) return;

    if (this.firestoreStudentsUnsub) this.firestoreStudentsUnsub();
    if (this.firestoreExamUnsub) this.firestoreExamUnsub();
    if (this.firestoreSessionUnsub) this.firestoreSessionUnsub();

    try {
      // 1. Students collection listener
      const studentsColRef = collection(this.firestore, 'exams', 'quimica_general_2026', 'students');
      this.firestoreStudentsUnsub = onSnapshot(studentsColRef, (snapshot) => {
        const updated: Record<string, StudentExamState> = {};
        snapshot.forEach((docSnap) => {
          updated[docSnap.id] = docSnap.data() as StudentExamState;
        });
        if (Object.keys(updated).length > 0 || snapshot.metadata.fromCache === false) {
          this.localStudentsCache = updated;
          this.saveLocalCache();
          this.notifyListeners();
        }
      }, (error) => {
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'exams/quimica_general_2026/students');
        } else {
          console.warn('Firestore students listener warning:', error);
        }
      });

      // 2. Exam document listener
      const examDocRef = doc(this.firestore, 'exams', 'quimica_general_2026');
      
      // Fetch immediately on boot so student doesn't wait for onSnapshot
      getDoc(examDocRef).then((snap) => {
        if (snap.exists()) {
          const val = snap.data() as ExamDataPayload;
          if (val && Array.isArray(val.questions) && val.questions.length > 0) {
            this.activeExamData = val;
            try {
              localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(val));
            } catch {}
            this.notifyExamListeners();
          }
        } else {
          // Document does not exist in Firestore yet: seed it with activeExamData
          setDoc(examDocRef, this.activeExamData).catch((err) => {
            console.warn('Auto-seed exam doc notice:', err);
          });
        }
      }).catch((err) => {
        console.warn('Initial exam getDoc note (will rely on snapshot/cache):', err);
      });

      this.firestoreExamUnsub = onSnapshot(examDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const val = docSnap.data() as ExamDataPayload;
          if (val && Array.isArray(val.questions) && val.questions.length > 0) {
            this.activeExamData = val;
            try {
              localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(val));
            } catch {}
            this.notifyExamListeners();
          }
        }
      }, (error) => {
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'exams/quimica_general_2026');
        } else {
          console.warn('Firestore exam listener warning (operating offline):', error);
        }
      });

      // 3. Session document listener
      const sessionDocRef = doc(this.firestore, 'exams', 'quimica_general_2026', 'session', 'current');
      
      getDoc(sessionDocRef).then((snap) => {
        if (snap.exists()) {
          const val = snap.data() as GlobalSessionState;
          if (val && val.status) {
            this.globalSession = val;
            try {
              localStorage.setItem(STORAGE_KEY_SESSION_DATA, JSON.stringify(val));
            } catch {}
            this.notifySessionListeners();
          }
        } else {
          setDoc(sessionDocRef, this.globalSession).catch((err) => {
            console.warn('Auto-seed session doc notice:', err);
          });
        }
      }).catch((err) => {
        console.warn('Initial session getDoc note:', err);
      });

      this.firestoreSessionUnsub = onSnapshot(sessionDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const val = docSnap.data() as GlobalSessionState;
          if (val && val.status) {
            this.globalSession = val;
            try {
              localStorage.setItem(STORAGE_KEY_SESSION_DATA, JSON.stringify(val));
            } catch {}
            this.notifySessionListeners();
          }
        }
      }, (error) => {
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, 'exams/quimica_general_2026/session/current');
        } else {
          console.warn('Firestore session listener warning:', error);
        }
      });
    } catch (err) {
      console.error('Error configurando listeners de Firestore:', err);
    }
  }

  // --- RTDB FALLBACK LISTENERS ---

  private setupRTDBListeners() {
    if (!this.db) return;
    if (this.rtdbStudentsUnsub) this.rtdbStudentsUnsub();
    if (this.rtdbExamUnsub) this.rtdbExamUnsub();
    if (this.rtdbSessionUnsub) this.rtdbSessionUnsub();

    try {
      const studentsRef = ref(this.db, DB_BASE_PATH);
      this.rtdbStudentsUnsub = onValue(studentsRef, (snapshot) => {
        const val = snapshot.val();
        if (val && !this.firestore) {
          this.localStudentsCache = val || {};
          this.saveLocalCache();
          this.notifyListeners();
        }
      });

      const examRef = ref(this.db, DB_EXAM_PATH);
      this.rtdbExamUnsub = onValue(examRef, (snapshot) => {
        const val = snapshot.val();
        if (val && Array.isArray(val.questions) && val.questions.length > 0 && !this.firestore) {
          this.activeExamData = val;
          try {
            localStorage.setItem(STORAGE_KEY_EXAM_DATA, JSON.stringify(val));
          } catch {}
          this.notifyExamListeners();
        }
      });

      const sessionRef = ref(this.db, DB_SESSION_PATH);
      this.rtdbSessionUnsub = onValue(sessionRef, (snapshot) => {
        const val = snapshot.val();
        if (val && val.status && !this.firestore) {
          this.globalSession = val;
          try {
            localStorage.setItem(STORAGE_KEY_SESSION_DATA, JSON.stringify(val));
          } catch {}
          this.notifySessionListeners();
        }
      });
    } catch (err) {
      console.error('Error configurando listener RTDB:', err);
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

  // Clear all students to reuse exam with a fresh group
  public async clearAllStudents(): Promise<void> {
    const studentIds = Object.keys(this.localStudentsCache);
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

    // Delete documents in Firestore
    if (this.firestore) {
      try {
        const deletePromises = studentIds.map((id) => 
          deleteDoc(doc(this.firestore!, 'exams', 'quimica_general_2026', 'students', id))
        );
        await Promise.all(deletePromises);
      } catch (err) {
        if ((err as { code?: string })?.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.DELETE, 'exams/quimica_general_2026/students');
        } else {
          console.warn('Error limpiando Firestore students:', err);
        }
      }
    }

    // Delete in RTDB
    if (this.db) {
      try {
        const baseRef = ref(this.db, DB_BASE_PATH);
        await remove(baseRef);
      } catch (err) {
        console.error('Error limpiando RTDB:', err);
      }
    }

    await this.resetSessionToWaitingRoom();
  }

  // Seed sample mock students for instant demonstration
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
          [this.activeExamData.questions[0]?.id || 'q0']: 1,
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
          [this.activeExamData.questions[0]?.id || 'q0']: 1,
        },
        score: 50,
        maxScore: 100,
        percentage: 50,
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
        status: 'waiting',
        joinedWaitingAt: Date.now() - 2 * 60 * 1000,
        currentQuestionIndex: 0,
        answers: {},
        score: 0,
        maxScore: 100,
        percentage: 0,
        cheatWarningsCount: 0,
        cheatLogs: [],
        lastActive: Date.now() - 10 * 1000
      }
    };

    Object.values(demo).forEach((st) => this.syncStudent(st));
  }
}

export const firebaseService = new FirebaseDualService();
