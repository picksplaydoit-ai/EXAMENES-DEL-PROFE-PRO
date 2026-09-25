import { Question, QuestionType, ColumnPair } from '../types';

export const SAMPLE_PLAIN_TEXT_EXAM = `-- TIPO: OPCION_MULTIPLE --
PREGUNTA: ¿Qué tipo de enlace químico se forma entre un metal y un no metal por transferencia completa de electrones?
IMAGEN: https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80
A) Enlace Covalente Polar
B) Enlace Iónico (Electrovalente)
C) Enlace Metálico
D) Enlace Covalente Apolar
CORRECTA: B
RETROALIMENTACION: El enlace iónico resulta de la gran diferencia de electronegatividad, donde el metal cede electrones formando iones unidos por atracción electrostática.

-- TIPO: RELACIONAR --
PREGUNTA: Relaciona cada sustancia química con su clasificación correspondiente:
IMAGEN: https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80
PAR: NaCl | Sal binaria iónica
PAR: H2SO4 | Ácido oxácido
PAR: He | Gas noble
PAR: NaOH | Base o hidróxido
RETROALIMENTACION: NaCl es sal neutra, H2SO4 es un ácido fuerte, He es un gas inerte con octeto/dueto completo, y NaOH es un álcali cáustico.

-- TIPO: ABIERTA --
PREGUNTA: Explica brevemente el principio de conservación de la materia formulado por Antoine Lavoisier y su importancia al balancear reacciones.
IMAGEN: https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80
RESPUESTA_MODELO: La materia no se crea ni se destruye, solo se transforma. La cantidad total de átomos en reactivos debe ser igual a la de productos.
RETROALIMENTACION: En cualquier reacción química, la suma de las masas de las sustancias reaccionantes es exactamente igual a la suma de las masas de los productos.

-- TIPO: OPCION_MULTIPLE --
PREGUNTA: Si una solución acuosa a 25°C tiene una concentración [H3O+] = 1 x 10^-3 M, ¿cuál es su pH y cómo se clasifica?
IMAGEN: https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop&q=80
A) pH = 11, solución fuertemente básica
B) pH = 3, solución ácida
C) pH = 7, solución neutra
D) pH = -3, solución anfótera
CORRECTA: B
RETROALIMENTACION: pH = -log[H3O+] = -log(10^-3) = 3. Todo pH menor a 7 a 25°C indica una disolución ácida.`;

export interface ParseResult {
  questions: Question[];
  errors: string[];
}

export function parsePlainTextExam(text: string): ParseResult {
  const errors: string[] = [];
  const questions: Question[] = [];

  if (!text || !text.trim()) {
    return { questions: [], errors: ['El texto está vacío. Por favor pega las preguntas del examen.'] };
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into blocks either by "-- TIPO:" or by "PREGUNTA:"
  // Regex looks for either ^--\s*TIPO: or ^PREGUNTA\s*:
  const rawBlocks = normalized
    .split(/(?=^(?:--\s*TIPO\s*:|PREGUNTA\s*:))/gmi)
    .map((b) => b.trim())
    .filter(Boolean);

  if (rawBlocks.length === 0) {
    return {
      questions: [],
      errors: ['No se detectaron preguntas. Asegúrate de incluir etiquetas "PREGUNTA:" o "-- TIPO: --".']
    };
  }

  rawBlocks.forEach((block, index) => {
    const qNum = index + 1;
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    let explicitType: QuestionType | null = null;
    let questionText = '';
    let imageUrl = '';
    let correctLetter = '';
    let referenceAnswer = '';
    let explanationText = '';
    const optionsMap: Record<string, string> = {};
    const pairs: ColumnPair[] = [];

    let currentSection: 'question' | 'explanation' | 'reference' | 'none' = 'none';

    for (const line of lines) {
      // -- TIPO: OPCION_MULTIPLE / ABIERTA / RELACIONAR --
      const typeMatch = line.match(/^--\s*TIPO\s*:\s*([A-Za-z_]+)\s*--?$/i);
      if (typeMatch) {
        const rawType = typeMatch[1].toLowerCase();
        if (rawType.includes('opcion') || rawType.includes('multiple')) {
          explicitType = 'opcion_multiple';
        } else if (rawType.includes('abierta') || rawType.includes('desarrollo')) {
          explicitType = 'abierta';
        } else if (rawType.includes('relacion') || rawType.includes('columna') || rawType.includes('parear')) {
          explicitType = 'relacionar';
        }
        continue;
      }

      // IMAGEN: https://...
      const imgMatch = line.match(/^(?:IMAGEN|IMAGE|IMG)\s*:\s*(https?:\/\/[^\s]+)$/i);
      if (imgMatch) {
        imageUrl = imgMatch[1].trim();
        continue;
      }

      // PREGUNTA: ...
      const qMatch = line.match(/^PREGUNTA\s*:\s*(.+)$/i);
      if (qMatch) {
        questionText = qMatch[1].trim();
        currentSection = 'question';
        continue;
      }

      // PAR: Elemento A | Elemento B
      const pairMatch = line.match(/^(?:PAR|PAIR|COLUMNA)\s*:\s*(.+?)\s*\|\s*(.+)$/i);
      if (pairMatch) {
        currentSection = 'none';
        pairs.push({
          id: `pair_${pairs.length + 1}`,
          left: pairMatch[1].trim(),
          right: pairMatch[2].trim()
        });
        continue;
      }

      // OPTION: A) Opción 1, B) Opción 2...
      const optMatch = line.match(/^([A-Da-d])[\)\.\:\-]\s*(.+)$/);
      if (optMatch) {
        currentSection = 'none';
        const letter = optMatch[1].toUpperCase();
        optionsMap[letter] = optMatch[2].trim();
        continue;
      }

      // CORRECTA: A/B/C/D
      const correctMatch = line.match(/^(?:CORRECTA|RESPUESTA|RESPUESTA CORRECTA)\s*:\s*([A-Da-d0-9])/i);
      if (correctMatch) {
        currentSection = 'none';
        correctLetter = correctMatch[1].toUpperCase();
        continue;
      }

      // RESPUESTA_MODELO / RESPUESTA_ESPERADA:
      const refMatch = line.match(/^(?:RESPUESTA_MODELO|RESPUESTA_ESPERADA|CRITERIO)\s*:\s*(.*)$/i);
      if (refMatch) {
        referenceAnswer = refMatch[1].trim();
        currentSection = 'reference';
        continue;
      }

      // RETROALIMENTACION:
      const retroMatch = line.match(/^(?:RETROALIMENTACION|RETROALIMENTACIÓN|EXPLICACION|EXPLICACIÓN)\s*:\s*(.*)$/i);
      if (retroMatch) {
        explanationText = retroMatch[1].trim();
        currentSection = 'explanation';
        continue;
      }

      // Continuation lines
      if (currentSection === 'question') {
        questionText += ' ' + line;
      } else if (currentSection === 'explanation') {
        explanationText += ' ' + line;
      } else if (currentSection === 'reference') {
        referenceAnswer += ' ' + line;
      }
    }

    if (!questionText) {
      errors.push(`Bloque #${qNum}: Falta el enunciado de la pregunta (PREGUNTA:).`);
      return;
    }

    // Determine type if not explicit
    let detectedType: QuestionType = explicitType || 'opcion_multiple';
    if (!explicitType) {
      if (pairs.length >= 2) {
        detectedType = 'relacionar';
      } else if (Object.keys(optionsMap).length >= 2) {
        detectedType = 'opcion_multiple';
      } else {
        detectedType = 'abierta';
      }
    }

    // Process per question type
    if (detectedType === 'relacionar') {
      if (pairs.length < 2) {
        errors.push(`Pregunta #${qNum} (Relacionar): Se requieren al menos 2 pares con formato "PAR: Izquierda | Derecha".`);
        return;
      }

      questions.push({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'relacionar',
        topic: 'Relación de Conceptos',
        question: questionText,
        imageUrl: imageUrl || undefined,
        pairs,
        explanation: explanationText || 'Relaciona cada elemento de la izquierda con su par exacto a la derecha.',
        points: 25
      });
    } else if (detectedType === 'abierta') {
      questions.push({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'abierta',
        topic: 'Pregunta de Desarrollo',
        question: questionText,
        imageUrl: imageUrl || undefined,
        referenceAnswer: referenceAnswer || undefined,
        explanation: explanationText || referenceAnswer || 'Pregunta abierta evaluada con base en criterios pedagógicos.',
        points: 25
      });
    } else {
      // OPCION_MULTIPLE
      const optionLetters = ['A', 'B', 'C', 'D'];
      const availableOptions: string[] = [];

      for (const l of optionLetters) {
        if (optionsMap[l]) availableOptions.push(optionsMap[l]);
      }

      if (availableOptions.length < 2) {
        errors.push(`Pregunta #${qNum} (Opción Múltiple): Debe tener al menos 2 opciones (A, B).`);
        return;
      }

      let correctIndex = -1;
      if (correctLetter) {
        if (['A', 'B', 'C', 'D'].includes(correctLetter)) {
          correctIndex = correctLetter.charCodeAt(0) - 65;
        } else {
          const num = parseInt(correctLetter, 10);
          if (!isNaN(num) && num >= 1 && num <= availableOptions.length) {
            correctIndex = num - 1;
          }
        }
      }

      if (correctIndex < 0 || correctIndex >= availableOptions.length) {
        errors.push(`Pregunta #${qNum}: La opción correcta "${correctLetter || 'vacía'}" no es válida para las opciones disponibles.`);
        return;
      }

      questions.push({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'opcion_multiple',
        topic: 'Opción Múltiple',
        question: questionText,
        imageUrl: imageUrl || undefined,
        options: availableOptions,
        correctAnswer: correctIndex,
        explanation: explanationText || `La respuesta correcta es la opción ${String.fromCharCode(65 + correctIndex)}: ${availableOptions[correctIndex]}.`,
        points: 25
      });
    }
  });

  // Calculate dynamic point distribution to equal 100 points
  if (questions.length > 0) {
    const ptsPerQ = Math.round(100 / questions.length);
    questions.forEach((q, idx) => {
      if (idx === questions.length - 1) {
        q.points = 100 - ptsPerQ * (questions.length - 1);
      } else {
        q.points = ptsPerQ;
      }
    });
  }

  return { questions, errors };
}
