import { Question, QuestionType, ColumnPair } from '../types';

export const SAMPLE_MIXED_EXAM = `TIPO: OPCION_MULTIPLE
PREGUNTA: ¿Qué tipo de enlace químico se forma entre un metal y un no metal por transferencia completa de electrones?
IMAGEN: https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80
A) Enlace Covalente Polar
B) Enlace Iónico (Electrovalente)
C) Enlace Metálico
D) Enlace Covalente Apolar
CORRECTA: B
RETROALIMENTACION: El enlace iónico resulta de la gran diferencia de electronegatividad, donde el metal cede electrones formando iones unidos por atracción electrostática.

TIPO: VERDADERO_FALSO
PREGUNTA: El agua (H2O) es una molécula polar debido a la diferencia de electronegatividad entre el oxígeno y el hidrógeno, y a su geometría molecular angular.
CORRECTA: VERDADERO
RETROALIMENTACION: La geometría doblada (104.5°) impide que los dipolos se anulen entre sí, creando un momento dipolar permanente.

TIPO: RELACIONAR
PREGUNTA: Relaciona cada fórmula química con su función inorgánica correspondiente:
1. HCl -> Ácido Hidrácido
2. NaOH -> Base o Hidróxido
3. NaCl -> Sal Haloidea Binaria
4. H2SO4 -> Ácido Oxácido
RETROALIMENTACION: Cada compuesto se clasifica por su grupo funcional: los hidrácidos contienen H con no metal, las bases contienen OH, las sales combinan metal y no metal, y los oxácidos contienen H, no metal y O.

TIPO: ABIERTA
PREGUNTA: Explica el Principio de Le Chatelier y cómo responde un sistema en equilibrio químico cuando se incrementa la presión.
RESPUESTA_MODELO: El Principio de Le Chatelier postula que ante cualquier perturbación externa en un sistema en equilibrio, este reaccionará desplazándose hacia la dirección que minimice el cambio. Al aumentar la presión, el equilibrio se desplazará hacia el lado que contenga el menor número de moles gaseosos.
RETROALIMENTACION: Se evalúa la comprensión del desplazamiento del equilibrio dinámico y el efecto del volumen en reacciones gaseosas.`;

export const SAMPLE_MULTIPLE_CHOICE_EXAM = `PREGUNTA: ¿Cuál de las siguientes sustancias químicas corresponde a un ácido oxácido diprótico fuerte?
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

export const SAMPLE_TRUE_FALSE_EXAM = `TIPO: VERDADERO_FALSO
PREGUNTA: Los gases nobles poseen una capa de valencia completa con 8 electrones (excepto el helio con 2), lo que les otorga una alta estabilidad química.
CORRECTA: VERDADERO
RETROALIMENTACION: Su configuración electrónica de octeto completo los hace químicamente inertes bajo condiciones estándar.

TIPO: VERDADERO_FALSO
PREGUNTA: En una reacción exotérmica, la energía total de los productos es mayor que la energía de los reactivos.
CORRECTA: FALSO
RETROALIMENTACION: En las reacciones exotérmicas se libera energía al entorno, por lo que los productos poseen menor entalpía que los reactivos (ΔH < 0).

TIPO: VERDADERO_FALSO
PREGUNTA: El enlace metálico se explica mediante el modelo de 'mar de electrones' deslocalizados que fluyen entre cationes metálicos fijos.
CORRECTA: VERDADERO
RETROALIMENTACION: Esta deslocalización electrónica explica su alta conductividad eléctrica y térmica, así como la ductilidad y maleabilidad.`;

export const SAMPLE_MATCHING_EXAM = `TIPO: RELACIONAR
PREGUNTA: Relaciona cada científico con su aporte histórico a la teoría atómica y química moderna:
1. John Dalton -> Primer modelo atómico con base científica (esferas macizas)
2. J.J. Thomson -> Descubrimiento del electrón (modelo de budín de pasas)
3. Ernest Rutherford -> Descubrimiento del núcleo atómico positivo mediante lámina de oro
4. Niels Bohr -> Niveles discretos y cuantizados de energía para los electrones
RETROALIMENTACION: La evolución de los modelos atómicos permitió comprender la estructura cuántica de la materia.

TIPO: RELACIONAR
PREGUNTA: Relaciona cada tipo de solución con su capacidad de disolución a una temperatura dada:
1. Solución Insaturada -> Contiene menor cantidad de soluto que la que el solvente puede disolver
2. Solución Saturada -> Contiene la máxima cantidad de soluto soluble en equilibrio
3. Solución Sobresaturada -> Contiene temporalmente más soluto disuelto que el límite de saturación
RETROALIMENTACION: La solubilidad depende de las interacciones soluto-solvente y de la temperatura.`;

export const SAMPLE_OPEN_EXAM = `TIPO: ABIERTA
PREGUNTA: Describe el proceso de óxido-reducción (redox), definiendo con precisión qué es un agente oxidante y qué es un agente reductor.
RESPUESTA_MODELO: Un proceso redox implica la transferencia de electrones entre especies químicas. La oxidación es la pérdida de electrones (aumento de estado de oxidación) y la reducción es la ganancia de electrones. El agente reductor es la especie que se oxida (cede electrones) y el agente oxidante es la especie que se reduce (acepta electrones).
RETROALIMENTACION: Se califica la precisión en la definición de transferencia de electrones y roles de los agentes redox.

TIPO: ABIERTA
PREGUNTA: Explica la diferencia fundamental entre un cambio físico y un cambio químico en la materia, proporcionando un ejemplo de cada uno en la vida cotidiana.
RESPUESTA_MODELO: En un cambio físico la composición química y los enlaces intramoleculares de la sustancia no se alteran, solo su estado de agregación o forma (ej. evaporación o congelación del agua). En un cambio químico ocurre una ruptura y formación de nuevos enlaces, transformando las sustancias iniciales en sustancias con propiedades distintas (ej. combustión de leña o corrosión del hierro).
RETROALIMENTACION: Se califica la identificación clara de la alteración molecular versus cambios de fase.`;

// For backwards compatibility
export const SAMPLE_PLAIN_TEXT_EXAM = SAMPLE_MIXED_EXAM;

export interface ParseResult {
  questions: Question[];
  warnings: string[];
  errors: string[];
}

/**
 * Universal, zero-error parser supporting 4 question types:
 * 1. OPCION_MULTIPLE (Multiple Choice)
 * 2. VERDADERO_FALSO (True / False)
 * 3. RELACIONAR (Matching Columns)
 * 4. ABIERTA (Open-ended essay / short answer)
 */
export function parsePlainTextExam(text: string): ParseResult {
  const warnings: string[] = [];
  const questions: Question[] = [];

  if (!text || !text.trim()) {
    return {
      questions: [],
      warnings: [],
      errors: ['El texto está vacío. Pega o escribe tus preguntas para continuar.']
    };
  }

  // Normalize line breaks
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into raw blocks:
  // Detect delimiters like "TIPO:", "PREGUNTA:", "Pregunta 1:", "1.", "1)", etc.
  const lines = cleanText.split('\n');
  const rawBlocks: string[][] = [];
  let currentBlock: string[] = [];

  const isBlockStart = (line: string): boolean => {
    const l = line.trim();
    if (!l) return false;
    // TIPO: ...
    if (/^(?:TIPO|TYPE)\s*[:\=]/i.test(l)) {
      return true;
    }
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
    if (isBlockStart(line) && currentBlock.length > 0) {
      rawBlocks.push(currentBlock);
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    rawBlocks.push(currentBlock);
  }

  const blocksToProcess = rawBlocks.length > 0 
    ? rawBlocks 
    : cleanText.split(/\n\s*\n/).map((b) => b.split('\n'));

  blocksToProcess.forEach((blockLines, index) => {
    const qNum = index + 1;
    const nonEmptyLines = blockLines.map((l) => l.trim()).filter(Boolean);
    if (nonEmptyLines.length === 0) return;

    let explicitType: QuestionType | null = null;
    let questionText = '';
    let imageUrl = '';
    let formula = '';
    let explanationText = '';
    let explicitCorrectKey = '';
    let referenceAnswerText = '';
    const rawOptions: { letter: string; text: string; isMarkedCorrect?: boolean }[] = [];
    const rawPairs: ColumnPair[] = [];

    let isCollectingQuestion = false;
    let isCollectingExplanation = false;
    let isCollectingReference = false;

    for (const line of nonEmptyLines) {
      // 1. Detect explicit Question Type
      const typeMatch = line.match(/^(?:TIPO|TYPE)\s*[:\=]\s*(.+)$/i);
      if (typeMatch) {
        const val = typeMatch[1].trim().toLowerCase();
        if (val.includes('vf') || val.includes('verdadero') || val.includes('falso') || val.includes('true') || val.includes('false')) {
          explicitType = 'verdadero_falso';
        } else if (val.includes('relacion') || val.includes('columna') || val.includes('match') || val.includes('pareja')) {
          explicitType = 'relacionar';
        } else if (val.includes('abiert') || val.includes('desarroll') || val.includes('ensayo') || val.includes('open')) {
          explicitType = 'abierta';
        } else {
          explicitType = 'opcion_multiple';
        }
        continue;
      }

      // 2. Check for image
      const imgMatch = line.match(/^(?:IMAGEN|IMAGE|IMG|FOTO)\s*[:\=]\s*(https?:\/\/[^\s]+)$/i);
      if (imgMatch) {
        imageUrl = imgMatch[1].trim();
        continue;
      }

      // 3. Check for formula
      const formulaMatch = line.match(/^(?:FORMULA|FÓRMULA|ECUACION|ECUACIÓN)\s*[:\=]\s*(.+)$/i);
      if (formulaMatch) {
        formula = formulaMatch[1].trim();
        continue;
      }

      // 4. Check for Reference Answer / Rubric (for open questions)
      const refMatch = line.match(/^(?:RESPUESTA_MODELO|RESPUESTA\s+MODELO|RUBRICA|RÚBRICA|CRITERIO|RESPUESTA_ESPERADA|RESPUESTA\s+ESPERADA)\s*[:\=]\s*(.+)$/i);
      if (refMatch) {
        referenceAnswerText = refMatch[1].trim();
        isCollectingReference = true;
        isCollectingQuestion = false;
        isCollectingExplanation = false;
        continue;
      }

      // 5. Check for Correct Answer key
      const correctMatch = line.match(/^(?:CORRECTA|RESPUESTA(?:\s+CORRECTA)?|CLAVE|SOLUCION|SOLUCIÓN|OPCION\s+CORRECTA|R)\s*[:\=\-]\s*(.+)$/i);
      if (correctMatch) {
        explicitCorrectKey = correctMatch[1].trim().toUpperCase();
        isCollectingQuestion = false;
        isCollectingExplanation = false;
        isCollectingReference = false;
        continue;
      }

      // 6. Check for Explanation / Feedback
      const retroMatch = line.match(/^(?:RETROALIMENTACION|RETROALIMENTACIÓN|EXPLICACION|EXPLICACIÓN|JUSTIFICACION|JUSTIFICACIÓN)\s*[:\=]\s*(.*)$/i);
      if (retroMatch) {
        explanationText = retroMatch[1].trim();
        isCollectingExplanation = true;
        isCollectingQuestion = false;
        isCollectingReference = false;
        continue;
      }

      // 7. Check for Column Pairs (for matching questions)
      // Matches: "1. Left -> Right", "1. Left = Right", "Left -> Right", "PAREJA: Left -> Right"
      const pairMatch = line.match(/^(?:PAREJA\s*\d*\s*[:\.]\s*|\d+[\.\)\-]\s+|[A-Za-z][\.\)]\s+)?(.+?)\s*(?:->|➔|=>|=|:)\s*(.+)$/);
      // Ensure it's not a generic tag like "PREGUNTA:" or "RETROALIMENTACION:"
      if (pairMatch && !/^(?:PREGUNTA|TIPO|IMAGEN|FORMULA|CORRECTA|RETROALIMENTACION|EXPLICACION|RESPUESTA)/i.test(line)) {
        const leftSide = pairMatch[1].trim();
        const rightSide = pairMatch[2].trim();
        if (leftSide && rightSide) {
          rawPairs.push({
            id: `p_${index}_${rawPairs.length + 1}`,
            left: leftSide.replace(/^\d+[\.\)\-]\s*/, '').trim(),
            right: rightSide.trim()
          });
          isCollectingQuestion = false;
          isCollectingExplanation = false;
          isCollectingReference = false;
          continue;
        }
      }

      // 8. Check for Explicit Question tag
      const qTagMatch = line.match(/^(?:PREGUNTA\s*\d*\s*[:\.]|REACTIVO\s*\d*\s*[:\.]|ITEM\s*\d*\s*[:\.]|\d+[\.\)\-]\s+)(.+)$/i);
      if (qTagMatch && !/^(?:A|B|C|D|E|F)[\)\.]/i.test(line)) {
        questionText = qTagMatch[1].trim();
        isCollectingQuestion = true;
        isCollectingExplanation = false;
        isCollectingReference = false;
        continue;
      }

      // 9. Check for Option format A), B), C), D)...
      const optMatch = line.match(/^(\*)?\s*(?:\[?([A-Fa-f])\]?[\)\.\:\-]|(?:\(([A-Fa-f])\)))\s*(.+)$/);
      if (optMatch) {
        isCollectingQuestion = false;
        isCollectingExplanation = false;
        isCollectingReference = false;
        const isAsterisk = Boolean(optMatch[1]);
        const letter = (optMatch[2] || optMatch[3]).toUpperCase();
        let optionText = optMatch[4].trim();

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

      // If we don't have question text yet, this line is question text
      if (!questionText) {
        questionText = line.replace(/^\d+[\.\)\-]\s*/, '').trim();
        isCollectingQuestion = true;
        continue;
      }

      // Multi-line continuation
      if (isCollectingReference) {
        referenceAnswerText += ' ' + line;
      } else if (isCollectingExplanation) {
        explanationText += ' ' + line;
      } else if (isCollectingQuestion) {
        questionText += ' ' + line;
      } else if (rawOptions.length > 0) {
        rawOptions[rawOptions.length - 1].text += ' ' + line;
      }
    }

    questionText = questionText.trim();
    if (!questionText) {
      return;
    }

    // Determine final Question Type:
    let finalType: QuestionType = explicitType || 'opcion_multiple';

    if (!explicitType) {
      // Auto-detect based on extracted structure
      const isVFKey = /^(?:VERDADERO|FALSO|V|F|TRUE|FALSE)$/i.test(explicitCorrectKey);
      const hasVfOptions = rawOptions.length === 2 && 
        rawOptions.some(o => /verdadero/i.test(o.text)) && 
        rawOptions.some(o => /falso/i.test(o.text));

      if (isVFKey || hasVfOptions) {
        finalType = 'verdadero_falso';
      } else if (rawPairs.length >= 2) {
        finalType = 'relacionar';
      } else if (referenceAnswerText || (rawOptions.length === 0 && !explicitCorrectKey)) {
        // If no options were found and no correct letter was given, treat as open-ended question
        finalType = 'abierta';
      } else {
        finalType = 'opcion_multiple';
      }
    }

    // Process question according to its resolved type:
    if (finalType === 'verdadero_falso') {
      let isTrue = true;
      if (explicitCorrectKey) {
        if (/^(?:F|FALSO|FALSE|1)$/i.test(explicitCorrectKey)) {
          isTrue = false;
        } else if (/^(?:V|VERDADERO|TRUE|0)$/i.test(explicitCorrectKey)) {
          isTrue = true;
        }
      } else {
        // Look at raw options if marked
        const falseOpt = rawOptions.find(o => /falso/i.test(o.text) && o.isMarkedCorrect);
        if (falseOpt) isTrue = false;
      }

      const correctIndex = isTrue ? 0 : 1;
      const explanation = explanationText.trim() 
        || `La afirmación es ${isTrue ? 'VERDADERA' : 'FALSA'}.`;

      questions.push({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'verdadero_falso',
        topic: 'Verdadero o Falso',
        question: questionText,
        imageUrl: imageUrl || undefined,
        formula: formula || undefined,
        options: ['Verdadero', 'Falso'],
        correctAnswer: correctIndex,
        explanation,
        points: 25
      });
    } else if (finalType === 'relacionar') {
      let finalPairs = rawPairs;
      if (finalPairs.length < 2) {
        // Fallback: convert options into pairs if pairs weren't explicitly formatted
        if (rawOptions.length >= 2) {
          finalPairs = rawOptions.map((o, oIdx) => ({
            id: `p_${index}_${oIdx + 1}`,
            left: `Elemento ${o.letter}`,
            right: o.text
          }));
        } else {
          finalPairs = [
            { id: `p_${index}_1`, left: 'Concepto A', right: 'Definición A' },
            { id: `p_${index}_2`, left: 'Concepto B', right: 'Definición B' }
          ];
          warnings.push(`Pregunta #${qNum}: Se añadieron parejas modelo para completar el tipo relacionar columnas.`);
        }
      }

      const explanation = explanationText.trim() 
        || 'Relaciona correctamente cada concepto de la columna izquierda con su equivalente en la columna derecha.';

      questions.push({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'relacionar',
        topic: 'Relacionar Columnas',
        question: questionText,
        imageUrl: imageUrl || undefined,
        formula: formula || undefined,
        pairs: finalPairs,
        explanation,
        points: 25
      });
    } else if (finalType === 'abierta') {
      const explanation = explanationText.trim() 
        || 'Se evalúa la claridad argumentativa, dominio conceptual y coherencia técnica en la respuesta.';

      questions.push({
        id: `q_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'abierta',
        topic: 'Pregunta Abierta',
        question: questionText,
        imageUrl: imageUrl || undefined,
        formula: formula || undefined,
        referenceAnswer: referenceAnswerText.trim() || undefined,
        explanation,
        points: 25
      });
    } else {
      // OPCION_MULTIPLE
      const finalOptions: string[] = [];
      let detectedCorrectIdx = -1;

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
        finalOptions.push(rawOptions[0].text);
        finalOptions.push('Ninguna de las opciones anteriores');
        detectedCorrectIdx = 0;
        warnings.push(`Pregunta #${qNum}: Se agregó una segunda opción automática para completar el formato.`);
      } else {
        finalOptions.push('Opción 1');
        finalOptions.push('Opción 2');
        detectedCorrectIdx = 0;
        warnings.push(`Pregunta #${qNum}: Se generaron opciones por defecto para cumplir opción múltiple.`);
      }

      if (detectedCorrectIdx === -1 && explicitCorrectKey) {
        const numKey = parseInt(explicitCorrectKey, 10);
        if (!isNaN(numKey) && numKey >= 1 && numKey <= finalOptions.length) {
          detectedCorrectIdx = numKey - 1;
        } else if (['A', 'B', 'C', 'D', 'E', 'F'].includes(explicitCorrectKey)) {
          detectedCorrectIdx = explicitCorrectKey.charCodeAt(0) - 65;
        }
      }

      if (detectedCorrectIdx < 0 || detectedCorrectIdx >= finalOptions.length) {
        detectedCorrectIdx = 0;
        warnings.push(`Pregunta #${qNum}: Se asignó la opción A como respuesta correcta por defecto.`);
      }

      const correctLetter = String.fromCharCode(65 + detectedCorrectIdx);
      const explanation = explanationText.trim() 
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
        explanation,
        points: 25
      });
    }
  });

  if (questions.length === 0) {
    return {
      questions: [],
      warnings: [],
      errors: ['No se detectaron preguntas válidas. Puedes cargar una de las plantillas de ejemplo para guiarte.']
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

/**
 * Converts an array of Question objects back into structured plain text
 * with support for all 4 question types: opcion_multiple, verdadero_falso, relacionar, abierta.
 */
export function convertQuestionsToPlainText(questions: Question[]): string {
  if (!questions || questions.length === 0) return '';
  const blocks: string[] = [];

  questions.forEach((q) => {
    const lines: string[] = [];
    if (q.type === 'verdadero_falso') {
      lines.push('TIPO: VERDADERO_FALSO');
      lines.push(`PREGUNTA: ${q.question}`);
      if (q.imageUrl) lines.push(`IMAGEN: ${q.imageUrl}`);
      if (q.formula) lines.push(`FORMULA: ${q.formula}`);
      const isTrue = q.correctAnswer === 0 || q.correctAnswer === true || q.correctAnswer === 'Verdadero';
      lines.push(`CORRECTA: ${isTrue ? 'VERDADERO' : 'FALSO'}`);
      if (q.explanation) lines.push(`RETROALIMENTACION: ${q.explanation}`);
    } else if (q.type === 'relacionar') {
      lines.push('TIPO: RELACIONAR');
      lines.push(`PREGUNTA: ${q.question}`);
      if (q.imageUrl) lines.push(`IMAGEN: ${q.imageUrl}`);
      if (q.formula) lines.push(`FORMULA: ${q.formula}`);
      if (q.pairs && q.pairs.length > 0) {
        q.pairs.forEach((p, pIdx) => {
          lines.push(`${pIdx + 1}. ${p.left} -> ${p.right}`);
        });
      }
      if (q.explanation) lines.push(`RETROALIMENTACION: ${q.explanation}`);
    } else if (q.type === 'abierta') {
      lines.push('TIPO: ABIERTA');
      lines.push(`PREGUNTA: ${q.question}`);
      if (q.imageUrl) lines.push(`IMAGEN: ${q.imageUrl}`);
      if (q.formula) lines.push(`FORMULA: ${q.formula}`);
      if (q.referenceAnswer) lines.push(`RESPUESTA_MODELO: ${q.referenceAnswer}`);
      if (q.explanation) lines.push(`RETROALIMENTACION: ${q.explanation}`);
    } else {
      lines.push('TIPO: OPCION_MULTIPLE');
      lines.push(`PREGUNTA: ${q.question}`);
      if (q.imageUrl) lines.push(`IMAGEN: ${q.imageUrl}`);
      if (q.formula) lines.push(`FORMULA: ${q.formula}`);
      if (q.options && q.options.length > 0) {
        q.options.forEach((opt, oIdx) => {
          lines.push(`${String.fromCharCode(65 + oIdx)}) ${opt}`);
        });
      }
      if (q.correctAnswer !== undefined && typeof q.correctAnswer === 'number') {
        lines.push(`CORRECTA: ${String.fromCharCode(65 + q.correctAnswer)}`);
      }
      if (q.explanation) lines.push(`RETROALIMENTACION: ${q.explanation}`);
    }
    blocks.push(lines.join('\n'));
  });

  return blocks.join('\n\n');
}
