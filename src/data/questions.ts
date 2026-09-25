import { Question } from '../types';

export const CHEMISTRY_QUESTIONS: Question[] = [
  {
    id: 'q1',
    topic: 'Enlaces Químicos',
    question: '¿Qué tipo de enlace químico se forma fundamentalmente entre un metal y un no metal debido a una gran diferencia de electronegatividad, resultando en la transferencia completa de electrones?',
    options: [
      'Enlace Covalente Polar',
      'Enlace Iónico (o electrovalente)',
      'Enlace Metálico',
      'Enlace Covalente No Polar'
    ],
    correctAnswer: 1,
    formula: 'Na⁺ + Cl⁻ → NaCl',
    explanation: 'El enlace iónico se produce cuando existe una diferencia de electronegatividad superior a ~1.7 (típicamente entre un metal que cede electrones y un no metal que los capta), generando atracción electrostática entre cationes y aniones.',
    points: 20
  },
  {
    id: 'q2',
    topic: 'Estequiometría y Reacciones',
    question: 'De acuerdo con la Ley de Conservación de la Materia de Lavoisier, ¿cuáles son los coeficientes estequiométricos enteros correctos para balancear la combustión completa del gas propano (C₃H₈)?',
    formula: '_ C₃H₈ + _ O₂ → _ CO₂ + _ H₂O',
    options: [
      '1, 5, 3, 4',
      '1, 3, 3, 4',
      '2, 7, 6, 8',
      '1, 10, 3, 8'
    ],
    correctAnswer: 0,
    explanation: 'C₃H₈ + 5 O₂ → 3 CO₂ + 4 H₂O. Comprobación: 3 carbonos en ambos lados, 8 hidrógenos (4×2=8) y 10 oxígenos (5×2 = 10 reactivos; 3×2 + 4×1 = 10 productos).',
    points: 20
  },
  {
    id: 'q3',
    topic: 'Ácidos y Bases (pH)',
    question: 'Si una solución acuosa a 25°C tiene una concentración de iones hidronio [H₃O⁺] = 1 × 10⁻³ M, ¿cuál es su valor de pH y cómo se clasifica la solución?',
    formula: 'pH = -log[H₃O⁺]',
    options: [
      'pH = 11, solución fuertemente básica',
      'pH = 3, solución ácida',
      'pH = 7, solución neutra',
      'pH = -3, solución anfótera'
    ],
    correctAnswer: 1,
    explanation: 'pH = -log(10⁻³) = 3. En la escala a 25°C, cualquier pH menor a 7 indica una solución ácida ([H⁺] > 10⁻⁷ M).',
    points: 20
  },
  {
    id: 'q4',
    topic: 'Estructura Atómica',
    question: 'En el núcleo de un átomo neutro de carbono-14 (¹⁴₆C), ¿cuántos protones y cuántos neutrones contiene respectivamente?',
    formula: 'Número Másico A = Z + N (Z = 6)',
    options: [
      '6 protones y 6 neutrones',
      '8 protones y 6 neutrones',
      '6 protones y 8 neutrones',
      '14 protones y 0 neutrones'
    ],
    correctAnswer: 2,
    explanation: 'El número atómico Z del carbono es 6 (6 protones). Dado que el número de masa A es 14, el número de neutrones es N = A - Z = 14 - 6 = 8 neutrones.',
    points: 20
  },
  {
    id: 'q5',
    topic: 'Estados de la Materia y Fases',
    question: '¿Cómo se denomina el cambio de estado físico de la materia en el cual una sustancia pasa directamente del estado sólido al gaseoso sin transitar por el estado líquido?',
    formula: 'CO₂(sólido / hielo seco) → CO₂(gas)',
    options: [
      'Fusión',
      'Sublimación',
      'Condensación',
      'Evaporación'
    ],
    correctAnswer: 1,
    explanation: 'La sublimación es el paso directo de sólido a gas. Un ejemplo común en el laboratorio es el hielo seco (dióxido de carbono sólido) o el yodo metálico al calentarse suavemente.',
    points: 20
  }
];

export const TOTAL_EXAM_POINTS = CHEMISTRY_QUESTIONS.reduce((acc, q) => acc + q.points, 0);
