import { Question } from '../types';

export interface ShuffledOption {
  originalIndex: number;
  text: string;
}

export interface RandomizedQuestion extends Question {
  originalIndex: number; // 0-based index in master exam
  shuffledOptions?: ShuffledOption[];
}

/**
 * Deterministic 32-bit PRNG (Mulberry32)
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash a string (matricula + examTitle + version) to a 32-bit integer seed
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Seeded Fisher-Yates array shuffle
 */
function seededShuffle<T>(array: T[], prng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Randomize questions and options for a specific student.
 * Guarantees that:
 * 1. Each student gets questions in a different order (question numbers are distinct per student).
 * 2. Each question's options (A, B, C, D) are in a different order per student.
 * 3. The permutation is strictly deterministic for a given student matrícula + exam version,
 *    meaning internet drops, page refreshes, and app reopenings never alter their question or option order.
 */
export function randomizeExamForStudent(
  questions: Question[],
  studentIdentifier: string,
  examVersion: string | number = '1'
): RandomizedQuestion[] {
  if (!questions || questions.length === 0) return [];

  const cleanId = (studentIdentifier || 'STUDENT_DEFAULT').trim().toUpperCase();
  const seed = hashString(`${cleanId}_${examVersion}`);
  const prng = mulberry32(seed);

  // 1. Tag each question with its original master index
  const tagged: RandomizedQuestion[] = questions.map((q, idx) => ({
    ...q,
    originalIndex: idx
  }));

  // 2. Shuffle questions so question numbers are different for each student
  const shuffledQuestions = seededShuffle(tagged, prng);

  // 3. For each question of type 'opcion_multiple', shuffle its options
  return shuffledQuestions.map((q) => {
    if (q.type === 'opcion_multiple' && Array.isArray(q.options) && q.options.length > 0) {
      const taggedOptions: ShuffledOption[] = q.options.map((opt, oIdx) => ({
        originalIndex: oIdx,
        text: opt
      }));

      const shuffledOpts = seededShuffle(taggedOptions, prng);

      return {
        ...q,
        options: shuffledOpts.map((so) => so.text),
        shuffledOptions: shuffledOpts
      };
    }
    return q;
  });
}
