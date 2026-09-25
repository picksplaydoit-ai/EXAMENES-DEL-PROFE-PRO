import { Question } from '../types';

export const CHEMISTRY_QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'opcion_multiple',
    topic: 'Enlaces Químicos',
    question: '¿Qué tipo de enlace químico se forma fundamentalmente entre un metal y un no metal debido a una gran diferencia de electronegatividad, resultando en la transferencia completa de electrones?',
    imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80',
    formula: 'Na⁺ + Cl⁻ → NaCl',
    options: [
      'Enlace Covalente Polar',
      'Enlace Iónico (o electrovalente)',
      'Enlace Metálico',
      'Enlace Covalente No Polar'
    ],
    correctAnswer: 1,
    explanation: 'El enlace iónico se produce cuando existe una gran diferencia de electronegatividad (típicamente > 1.7), donde el metal cede electrones formándose cationes y el no metal los capta formando aniones electrostáticamente unidos.',
    points: 25
  },
  {
    id: 'q2',
    type: 'relacionar',
    topic: 'Clasificación de Sustancias y Fórmulas',
    question: 'Relaciona cada compuesto o elemento con su clasificación química correcta:',
    imageUrl: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
    pairs: [
      { id: 'p1', left: 'NaCl (Cloruro de sodio)', right: 'Compuesto iónico / Sal binaria' },
      { id: 'p2', left: 'H₂SO₄ (Ácido sulfúrico)', right: 'Ácido oxácido fuerte' },
      { id: 'p3', left: 'He (Helio)', right: 'Gas noble inerte' },
      { id: 'p4', left: 'NaOH (Hidróxido de sodio)', right: 'Base fuerte o álcali cáustico' }
    ],
    explanation: 'El NaCl es una sal neutra iónica; el H₂SO₄ es un oxácido con azufre en estado de oxidación +6; el Helio posee capa electrónica completa; y el NaOH es una base disociable con iones hidroxilo.',
    points: 25
  },
  {
    id: 'q3',
    type: 'abierta',
    topic: 'Leyes Ponderales y Estequiometría',
    question: 'Explica con tus propias palabras el postulado de la Ley de Conservación de la Materia de Lavoisier y por qué es obligatorio balancear una ecuación química.',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    formula: 'Σ Masa(Reactivos) = Σ Masa(Productos)',
    referenceAnswer: 'La materia no se crea ni se destruye, solo se transforma. El número y tipo de átomos debe ser exactamente igual en reactivos y productos.',
    explanation: 'En toda reacción química ordinaria, la masa total de los reactivos debe ser idéntica a la masa de los productos generados; ningún átomo desaparece ni surge de la nada.',
    points: 25
  },
  {
    id: 'q4',
    type: 'opcion_multiple',
    topic: 'Ácidos y Bases (pH)',
    question: 'Si una solución acuosa a 25°C tiene una concentración de iones hidronio [H₃O⁺] = 1 × 10⁻³ M, ¿cuál es su valor de pH y cómo se clasifica la solución?',
    imageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&auto=format&fit=crop&q=80',
    formula: 'pH = -log[H₃O⁺]',
    options: [
      'pH = 11, solución fuertemente básica',
      'pH = 3, solución ácida',
      'pH = 7, solución neutra',
      'pH = -3, solución anfótera'
    ],
    correctAnswer: 1,
    explanation: 'pH = -log(10⁻³) = 3. En la escala a 25°C, cualquier valor de pH inferior a 7 corresponde a una solución ácida ([H⁺] > 10⁻⁷ M).',
    points: 25
  }
];

export const TOTAL_EXAM_POINTS = CHEMISTRY_QUESTIONS.reduce((acc, q) => acc + q.points, 0);
