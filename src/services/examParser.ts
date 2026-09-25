import { Question } from '../types';

export const SAMPLE_PLAIN_TEXT_EXAM = `PREGUNTA: ¿Qué tipo de enlace químico se forma entre un metal y un no metal por transferencia completa de electrones?
IMAGEN: https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80
A) Enlace Covalente Polar
B) Enlace Iónico (Electrovalente)
C) Enlace Metálico
D) Enlace Covalente Apolar
CORRECTA: B
RETROALIMENTACION: El enlace iónico resulta de la gran diferencia de electronegatividad, donde el metal cede electrones formando iones unidos por atracción electrostática.

PREGUNTA: ¿Cuál de las siguientes sustancias químicas corresponde a un ácido oxácido diprótico fuerte?
A) NaCl (Cloruro de sodio)
B) H2SO4 (Ácido sulfúrico)
C) He (Gas helio)
D) NaOH (Hidróxido de sodio)
CORRECTA: B
RETROALIMENTACION: El H2SO4 es un ácido oxácido con azufre en estado de oxidación +6 que se disocia liberando protones.

PREGUNTA: Según la Ley de Conservación de la Materia formulada por Antoine Lavoisier, ¿qué principio se cumple en toda reacción química?
A) La masa total de los reactivos es exactamente igual a la de los productos
B) La materia desaparece paulatinamente al formarse los enlaces
C) Los reactivos siempre pesan el doble que los productos
D) Solo los metales conservan su masa en solución
CORRECTA: A
RETROALIMENTACION: La materia no se crea ni se destruye, solo se transforma en átomos reordenados.

PREGUNTA: Si una solución acuosa a 25°C tiene una concentración [H3O+] = 1 x 10^-3 M, ¿cuál es su pH y cómo se clasifica?
IMAGEN: https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop&q=80
A) pH = 11, solución fuertemente básica
B) pH = 3, solución ácida
C) pH = 7, solución neutra
D) pH = 14, solución alcalina
CORRECTA: B
RETROALIMENTACION: pH = -log[H3O+] = -log(10^-3) = 3. Todo pH menor a 7 a 25°C indica disolución ácida.`;

export interface ParseResult {
  questions: Question[];
  warnings: string[];
  errors: string[]; // For UI backwards compatibility, always empty or non-blocking
}

/**
 * Robust, zero-error parser dedicated exclusively to Multiple-Choice questions.
 * Handles diverse styles (A), a), 1., PREGUNTA:, ¿...?, asterisks for correct answers, etc.)
 */
export function parsePlainTextExam(text: string): ParseResult {
  const warnings: string[] = [];
  const questions: Question[] = [];

  if (!text || !text.trim()) {
    return {
      questions: [],
      warnings: [],
      errors: ['El texto está vacío. Pega tus preguntas de opción múltiple.']
    };
  }

  // Normalize line breaks
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into raw blocks:
  // Detect delimiters like "PREGUNTA:", "Pregunta 1:", "1.", "1)", "-- TIPO", or double linebreaks before a question-like line
  const lines = cleanText.split('\n');
  const rawBlocks: string[][] = [];
  let currentBlock: string[] = [];

  const isQuestionStart = (line: string): boolean => {
    const l = line.trim();
    if (!l) return false;
    // PREGUNTA: ...
    if (/^(?:--\s*TIPO.*?--|PREGUNTA\s*\d*\s*[:\.]|REACTIVO\s*\d*\s*[:\.]|ITEM\s*\d*\s*[:\.])/i.test(l)) {
      return true;
    }
    // Numbered questions: 1. ¿... or 1) ¿... or 1.- ...
    if (/^\d+[\.\)\-]\s+/.test(l)) {
      return true;
    }
    // Standalone question marks ¿...?
    if (/^¿.+[?]$/.test(l)) {
      return true;
    }
    return false;
  };

  for (const line of lines) {
    if (isQuestionStart(line) && currentBlock.length > 0) {
      rawBlocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock);
  }

  // If no blocks were split by start tags, fallback to double-newline separation
  const blocksToProcess = rawBlocks.length > 0 
    ? rawBlocks 
    : cleanText.split(/\n\s*\n/).map((b) => b.split('\n'));

  blocksToProcess.forEach((blockLines, index) => {
    const qNum = index + 1;
    const nonEmptyLines = blockLines.map((l) => l.trim()).filter(Boolean);
    if (nonEmptyLines.length === 0) return;

    let questionText = '';
    let imageUrl = '';
    let formula = '';
    let explanationText = '';
    let explicitCorrectKey = '';
    const rawOptions: { letter: string; text: string; isMarkedCorrect?: boolean }[] = [];

    let isCollectingQuestion = false;
    let isCollectingExplanation = false;

    for (const line of nonEmptyLines) {
      // Ignore type tags since all questions are strictly Multiple-Choice
      if (/^--\s*TIPO.*?--$/i.test(line)) {
        continue;
      }

      // Check for image
      const imgMatch = line.match(/^(?:IMAGEN|IMAGE|IMG|FOTO)\s*[:\=]\s*(https?:\/\/[^\s]+)$/i);
      if (imgMatch) {
        imageUrl = imgMatch[1].trim();
        continue;
      }

      // Check for formula
      const formulaMatch = line.match(/^(?:FORMULA|FÓRMULA|ECUACION|ECUACIÓN)\s*[:\=]\s*(.+)$/i);
      if (formulaMatch) {
        formula = formulaMatch[1].trim();
        continue;
      }

      // Check for Explicit Question tag
      const qTagMatch = line.match(/^(?:PREGUNTA\s*\d*\s*[:\.]|REACTIVO\s*\d*\s*[:\.]|ITEM\s*\d*\s*[:\.]|\d+[\.\)\-]\s+)(.+)$/i);
      if (qTagMatch) {
        questionText = qTagMatch[1].trim();
        isCollectingQuestion = true;
        isCollectingExplanation = false;
        continue;
      }

      // Check for Correct Answer key
      const correctMatch = line.match(/^(?:CORRECTA|RESPUESTA(?:\s+CORRECTA)?|CLAVE|SOLUCION|SOLUCIÓN|OPCION\s+CORRECTA|R)\s*[:\=\-]\s*([A-Fa-f0-9])/i);
      if (correctMatch) {
        explicitCorrectKey = correctMatch[1].toUpperCase();
        isCollectingQuestion = false;
        isCollectingExplanation = false;
        continue;
      }

      // Check for Explanation / Feedback
      const retroMatch = line.match(/^(?:RETROALIMENTACION|RETROALIMENTACIÓN|EXPLICACION|EXPLICACIÓN|JUSTIFICACION|JUSTIFICACIÓN)\s*[:\=]\s*(.*)$/i);
      if (retroMatch) {
        explanationText = retroMatch[1].trim();
        isCollectingExplanation = true;
        isCollectingQuestion = false;
        continue;
      }

      // Check for Option format:
      // A) Option, [A] Option, (A) Option, A. Option, A - Option, or * A) Option (asterisk for correct)
      const optMatch = line.match(/^(\*)?\s*(?:\[?([A-Fa-f])\]?[\)\.\:\-]|(?:\(([A-Fa-f])\)))\s*(.+)$/);
      if (optMatch) {
        isCollectingQuestion = false;
        isCollectingExplanation = false;
        const isAsterisk = Boolean(optMatch[1]);
        const letter = (optMatch[2] || optMatch[3]).toUpperCase();
        let optionText = optMatch[4].trim();

        // Check if marked as correct in the text e.g. "Oxígeno (Correcta)"
        let marked = isAsterisk;
        if (/\((?:correcta|respuesta|verdadera|clave)\)/i.test(optionText)) {
          marked = true;
          optionText = optionText.replace(/\((?:correcta|respuesta|verdadera|clave)\)/i, '').trim();
        }

        rawOptions.push({
          letter,
          text: optionText,
          isMarkedCorrect: marked
        });
        continue;
      }

      // If we don't have a question text yet, the first line is the question text!
      if (!questionText) {
        // Strip leading number if present like "1. ¿Qué es...?"
        questionText = line.replace(/^\d+[\.\)\-]\s*/, '').trim();
        isCollectingQuestion = true;
        continue;
      }

      // Continuation lines
      if (isCollectingExplanation) {
        explanationText += ' ' + line;
      } else if (isCollectingQuestion) {
        questionText += ' ' + line;
      } else if (rawOptions.length > 0) {
        // Multi-line option continuation
        rawOptions[rawOptions.length - 1].text += ' ' + line;
      }
    }

    // Clean up question text
    questionText = questionText.trim();
    if (!questionText) {
      // If block had no text, skip gracefully
      return;
    }

    // Process Options: strictly Multiple Choice
    const finalOptions: string[] = [];
    let detectedCorrectIdx = -1;

    // Check if options were parsed
    if (rawOptions.length >= 2) {
      rawOptions.forEach((opt, optIdx) => {
        finalOptions.push(opt.text);
        if (opt.isMarkedCorrect) {
          detectedCorrectIdx = optIdx;
        } else if (explicitCorrectKey && opt.letter === explicitCorrectKey) {
          detectedCorrectIdx = optIdx;
        }
      });
    } else if (rawOptions.length === 1) {
      // Only 1 option provided, safely add fallback options so it doesn't crash
      finalOptions.push(rawOptions[0].text);
      finalOptions.push('Ninguna de las opciones anteriores');
      detectedCorrectIdx = 0;
      warnings.push(`Pregunta #${qNum}: Se agregó una segunda opción automática para cumplir formato de opción múltiple.`);
    } else {
      // No standard A) B) letters detected; try to convert lines or create True/False options
      finalOptions.push('Verdadero');
      finalOptions.push('Falso');
      detectedCorrectIdx = 0;
      warnings.push(`Pregunta #${qNum}: Se adaptó a Verdadero/Falso al no detectar incisos A) y B).`);
    }

    // If explicit key was numeric e.g. CORRECTA: 1
    if (detectedCorrectIdx === -1 && explicitCorrectKey) {
      const numKey = parseInt(explicitCorrectKey, 10);
      if (!isNaN(numKey) && numKey >= 1 && numKey <= finalOptions.length) {
        detectedCorrectIdx = numKey - 1;
      } else if (['A', 'B', 'C', 'D', 'E', 'F'].includes(explicitCorrectKey)) {
        detectedCorrectIdx = explicitCorrectKey.charCodeAt(0) - 65;
      }
    }

    // Safety fallback: if no correct option specified, default to 0 (Option A) with zero errors
    if (detectedCorrectIdx < 0 || detectedCorrectIdx >= finalOptions.length) {
      detectedCorrectIdx = 0;
      warnings.push(`Pregunta #${qNum}: Se asignó la opción A como respuesta correcta por defecto.`);
    }

    const correctLetter = String.fromCharCode(65 + detectedCorrectIdx);
    const finalExplanation = explanationText.trim() 
      || `La respuesta correcta es la opción ${correctLetter}: ${finalOptions[detectedCorrectIdx]}.`;

    questions.push({
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'opcion_multiple',
      topic: 'Opción Múltiple',
      question: questionText,
      imageUrl: imageUrl || undefined,
      formula: formula || undefined,
      options: finalOptions,
      correctAnswer: detectedCorrectIdx,
      explanation: finalExplanation,
      points: 25 // will be rebalanced below
    });
  });

  // If no questions were successfully created, return helpful error
  if (questions.length === 0) {
    return {
      questions: [],
      warnings: [],
      errors: ['No se detectaron preguntas válidas. Puedes cargar la plantilla de ejemplo para guiarte.']
    };
  }

  // Rebalance points to sum exactly 100 points
  const pointsPerQuestion = Math.max(1, Math.round(100 / questions.length));
  let runningSum = 0;
  questions.forEach((q, idx) => {
    if (idx === questions.length - 1) {
      q.points = Math.max(1, 100 - runningSum);
    } else {
      q.points = pointsPerQuestion;
      runningSum += pointsPerQuestion;
    }
  });

  return {
    questions,
    warnings,
    errors: []
  };
}
