import { Question } from '../types';

export const SAMPLE_PLAIN_TEXT_EXAM = `PREGUNTA: ¿Qué tipo de enlace químico se forma entre un metal y un no metal por transferencia completa de electrones?
A) Enlace Covalente Polar
B) Enlace Iónico (Electrovalente)
C) Enlace Metálico
D) Enlace Covalente Apolar
CORRECTA: B
RETROALIMENTACION: El enlace iónico se genera debido a la alta diferencia de electronegatividad entre metales y no metales, transfiriendo electrones y formando iones.

PREGUNTA: De acuerdo con la Ley de Conservación de la Materia de Lavoisier, ¿cuáles son los coeficientes estequiométricos para balancear la combustión del propano: _ C3H8 + _ O2 -> _ CO2 + _ H2O?
A) 1, 5, 3, 4
B) 1, 3, 3, 4
C) 2, 7, 6, 8
D) 1, 10, 3, 8
CORRECTA: A
RETROALIMENTACION: 1 C3H8 + 5 O2 -> 3 CO2 + 4 H2O produce 3 carbonos, 8 hidrógenos y 10 átomos de oxígeno en ambos miembros de la ecuación.

PREGUNTA: Si una solución acuosa a 25°C tiene una concentración de iones hidronio [H3O+] = 1 x 10^-3 M, ¿cuál es su pH y cómo se clasifica?
A) pH = 11, solución fuertemente básica
B) pH = 3, solución ácida
C) pH = 7, solución neutra
D) pH = -3, solución anfótera
CORRECTA: B
RETROALIMENTACION: pH = -log[H3O+] = -log(10^-3) = 3. Al ser menor a 7 a 25°C, la disolución es netamente ácida.

PREGUNTA: ¿Cuántos protones y cuántos neutrones contiene el núcleo del átomo de carbono-14 (14_6 C)?
A) 6 protones y 6 neutrones
B) 8 protones y 6 neutrones
C) 6 protones y 8 neutrones
D) 14 protones y 0 neutrones
CORRECTA: C
RETROALIMENTACION: El número atómico Z es 6 (6 protones). La cantidad de neutrones es N = A - Z = 14 - 6 = 8 neutrones.

PREGUNTA: ¿Cómo se denomina el cambio de estado de la materia en el cual una sustancia pasa directamente de fase sólida a gas sin pasar por líquido?
A) Fusión
B) Sublimación
C) Condensación
D) Evaporación
CORRECTA: B
RETROALIMENTACION: La sublimación es la transición directa de fase sólida a gas (ejemplo: dióxido de carbono sólido o hielo seco).`;

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

  // Split by "PREGUNTA:" (case insensitive)
  const rawBlocks = normalized.split(/(?=^PREGUNTA\s*:)/gmi).map((b) => b.trim()).filter(Boolean);

  if (rawBlocks.length === 0) {
    return {
      questions: [],
      errors: ['No se detectó la etiqueta "PREGUNTA:". Asegúrate de que cada pregunta inicie con PREGUNTA: [Texto].']
    };
  }

  rawBlocks.forEach((block, index) => {
    const qNum = index + 1;
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);

    let questionText = '';
    const optionsMap: Record<string, string> = {};
    let correctLetter = '';
    let explanationText = '';

    let currentSection: 'question' | 'explanation' | 'none' = 'none';

    for (const line of lines) {
      // PREGUNTA:
      const qMatch = line.match(/^PREGUNTA\s*:\s*(.+)$/i);
      if (qMatch) {
        questionText = qMatch[1].trim();
        currentSection = 'question';
        continue;
      }

      // OPTION: A), B), C), D) or A. B. C. D.
      const optMatch = line.match(/^([A-Da-d])[\)\.\:\-]\s*(.+)$/);
      if (optMatch) {
        currentSection = 'none';
        const letter = optMatch[1].toUpperCase();
        optionsMap[letter] = optMatch[2].trim();
        continue;
      }

      // CORRECTA:
      const correctMatch = line.match(/^(?:CORRECTA|RESPUESTA|RESPUESTA CORRECTA)\s*:\s*([A-Da-d0-9])/i);
      if (correctMatch) {
        currentSection = 'none';
        correctLetter = correctMatch[1].toUpperCase();
        continue;
      }

      // RETROALIMENTACION:
      const retroMatch = line.match(/^(?:RETROALIMENTACION|RETROALIMENTACIÓN|EXPLICACION|EXPLICACIÓN)\s*:\s*(.*)$/i);
      if (retroMatch) {
        explanationText = retroMatch[1].trim();
        currentSection = 'explanation';
        continue;
      }

      // Multi-line continuation
      if (currentSection === 'question') {
        questionText += ' ' + line;
      } else if (currentSection === 'explanation') {
        explanationText += ' ' + line;
      }
    }

    // Validation
    if (!questionText) {
      errors.push(`Bloque #${qNum}: Falta el texto de la pregunta (PREGUNTA:).`);
      return;
    }

    const optionLetters = ['A', 'B', 'C', 'D'];
    const availableOptions: string[] = [];

    // Collect available options in order A, B, C, D
    for (const l of optionLetters) {
      if (optionsMap[l]) {
        availableOptions.push(optionsMap[l]);
      }
    }

    if (availableOptions.length < 2) {
      errors.push(`Pregunta #${qNum} ("${questionText.slice(0, 30)}..."): Debe tener al menos 2 opciones (A, B, C, D). Se encontraron ${availableOptions.length}.`);
      return;
    }

    // Map correct answer index
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
      errors.push(`Pregunta #${qNum}: La opción correcta "${correctLetter || 'vacía'}" no es válida. Debe ser A, B, C o D.`);
      return;
    }

    // Topic extraction or default
    let topic = 'Química General';
    if (questionText.toLowerCase().includes('enlace')) topic = 'Enlaces Químicos';
    else if (questionText.toLowerCase().includes('balance') || questionText.toLowerCase().includes('combustion')) topic = 'Estequiometría';
    else if (questionText.toLowerCase().includes('ph') || questionText.toLowerCase().includes('acido')) topic = 'Ácidos y Bases';
    else if (questionText.toLowerCase().includes('atomo') || questionText.toLowerCase().includes('proton')) topic = 'Estructura Atómica';
    else if (questionText.toLowerCase().includes('estado') || questionText.toLowerCase().includes('fase')) topic = 'Fases y Materia';

    questions.push({
      id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      topic,
      question: questionText,
      options: availableOptions,
      correctAnswer: correctIndex,
      explanation: explanationText || `La respuesta correcta es la opción ${String.fromCharCode(65 + correctIndex)}: ${availableOptions[correctIndex]}.`,
      points: 20 // will be scaled dynamically
    });
  });

  // Calculate dynamic point distribution so total is 100 points
  if (questions.length > 0) {
    const ptsPerQ = Math.round(100 / questions.length);
    questions.forEach((q, idx) => {
      // Last question compensates rounding to ensure exactly 100
      if (idx === questions.length - 1) {
        q.points = 100 - ptsPerQ * (questions.length - 1);
      } else {
        q.points = ptsPerQ;
      }
    });
  }

  return { questions, errors };
}
