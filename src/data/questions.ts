import { Question, SavedExam } from '../types';

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
    type: 'opcion_multiple',
    topic: 'Clasificación de Sustancias y Enlaces',
    question: '¿Cuál de las siguientes sustancias corresponde a un ácido oxácido fuerte diprótico muy utilizado en la industria química?',
    imageUrl: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800&auto=format&fit=crop&q=80',
    formula: 'H₂SO₄(ac) → 2H⁺ + SO₄²⁻',
    options: [
      'NaCl (Cloruro de sodio)',
      'H₂SO₄ (Ácido sulfúrico)',
      'He (Gas helio monoatómico)',
      'NaOH (Hidróxido de sodio)'
    ],
    correctAnswer: 1,
    explanation: 'El H₂SO₄ es un oxácido fuerte con azufre en estado de oxidación +6. NaCl es una sal neutra, He es un gas noble inerte y NaOH es una base fuerte.',
    points: 25
  },
  {
    id: 'q3',
    type: 'opcion_multiple',
    topic: 'Leyes Ponderales y Estequiometría',
    question: 'Según la Ley de Conservación de la Materia postulada por Antoine Lavoisier, ¿qué condición fundamental debe cumplirse en una reacción química ordinaria?',
    imageUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop&q=80',
    formula: 'Σ Masa(Reactivos) = Σ Masa(Productos)',
    options: [
      'El volumen de los productos siempre debe duplicar el de los reactivos',
      'La masa total de los reactivos debe ser idéntica a la masa total de los productos obtenidos',
      'La materia se destruye parcialmente para generar energía calorífica',
      'El número de moléculas finales siempre debe ser menor al inicial'
    ],
    correctAnswer: 1,
    explanation: 'La materia no se crea ni se destruye, solo se transforma: el número y tipo de átomos en los reactivos debe ser idéntico al de los productos, por lo que la masa se conserva.',
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

export const PREDEFINED_SAVED_EXAMS: SavedExam[] = [
  {
    id: 'exam_quimica_general',
    title: 'Examen de Química General (Enlaces y Reacciones)',
    description: 'Evaluación de enlaces químicos, clasificación de compuestos, estequiometría y pH.',
    questions: CHEMISTRY_QUESTIONS,
    durationMinutes: 20,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2
  },
  {
    id: 'exam_estequiometria',
    title: 'Examen Parcial: Estequiometría y Balanceo',
    description: 'Preguntas de opción múltiple sobre moles, número de Avogadro y masa molar.',
    questions: [
      {
        id: 'esteq_1',
        type: 'opcion_multiple',
        topic: 'Concepto de Mol',
        question: '¿Cuántas partículas elementales (átomos o moléculas) contiene exactamente 1 mol de cualquier sustancia según el número de Avogadro?',
        formula: 'N_A ≈ 6.022 × 10²³ partículas/mol',
        options: [
          '6.022 × 10²³ partículas',
          '3.00 × 10⁸ partículas',
          '1.602 × 10⁻¹⁹ partículas',
          '9.81 × 10¹² partículas'
        ],
        correctAnswer: 0,
        explanation: 'El número de Avogadro (6.022 × 10²³) define el número de entidades en un mol de sustancia.',
        points: 25
      },
      {
        id: 'esteq_2',
        type: 'opcion_multiple',
        topic: 'Masa Molar',
        question: '¿Cuál es la masa molar del agua (H₂O) considerando las masas atómicas aproximadas H = 1 g/mol y O = 16 g/mol?',
        formula: 'M(H₂O) = 2(1) + 16',
        options: [
          '17 g/mol',
          '18 g/mol',
          '20 g/mol',
          '34 g/mol'
        ],
        correctAnswer: 1,
        explanation: '2 × 1 g/mol (Hidrógeno) + 16 g/mol (Oxígeno) = 18 g/mol.',
        points: 25
      },
      {
        id: 'esteq_3',
        type: 'opcion_multiple',
        topic: 'Reactivo Limitante',
        question: '¿Cómo se define el reactivo limitante en una reacción estequiométrica?',
        options: [
          'El reactivo que se encuentra en mayor cantidad de masa en la mezcla',
          'El reactivo que se consume primero por completo y determina la cantidad máxima de producto formado',
          'El reactivo más costoso del proceso químico',
          'El reactivo que sobra al finalizar la reacción'
        ],
        correctAnswer: 1,
        explanation: 'El reactivo limitante se agota primero, limitando la cantidad teórica de producto que se puede obtener.',
        points: 25
      },
      {
        id: 'esteq_4',
        type: 'opcion_multiple',
        topic: 'Rendimiento Porcentual',
        question: 'Si el rendimiento teórico de una síntesis es 50 g pero en el laboratorio se obtienen 40 g reales, ¿cuál es el porcentaje de rendimiento?',
        formula: '% Rendimiento = (Rendimiento Real / Rendimiento Teórico) × 100',
        options: [
          '90%',
          '80%',
          '75%',
          '65%'
        ],
        correctAnswer: 1,
        explanation: '(40 g / 50 g) × 100 = 80% de rendimiento porcentual.',
        points: 25
      }
    ],
    durationMinutes: 25,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000
  },
  {
    id: 'exam_termoquimica',
    title: 'Examen Rápido: Termoquímica y Cinética Química',
    description: 'Reactivos de opción múltiple sobre entalpía, energía de activación y catalizadores.',
    questions: [
      {
        id: 'termo_1',
        type: 'opcion_multiple',
        topic: 'Termodinámica Química',
        question: '¿Cómo se clasifica un proceso químico en el cual el sistema absorbe calor de sus alrededores (ΔH > 0)?',
        options: [
          'Reacción Exotérmica',
          'Reacción Endotérmica',
          'Reacción Isobárica espontánea',
          'Reacción Adiabática'
        ],
        correctAnswer: 1,
        explanation: 'En las reacciones endotérmicas se absorbe calor del entorno, por lo que la entalpía de los productos es mayor que la de los reactivos (ΔH > 0).',
        points: 25
      },
      {
        id: 'termo_2',
        type: 'opcion_multiple',
        topic: 'Cinética Química',
        question: '¿Cuál es la función principal de un catalizador en una reacción química?',
        options: [
          'Aumentar la masa final de los productos',
          'Disminuir la energía de activación, aumentando la velocidad de reacción sin consumirse',
          'Detener totalmente la reacción para evitar explosiones',
          'Modificar el estado de equilibrio termodinámico permanente'
        ],
        correctAnswer: 1,
        explanation: 'Un catalizador proporciona un camino alternativo con menor energía de activación, acelerando la velocidad tanto directa como inversa.',
        points: 25
      },
      {
        id: 'termo_3',
        type: 'opcion_multiple',
        topic: 'Factores de Velocidad',
        question: '¿Por qué aumentar la temperatura generalmente incrementa la velocidad de una reacción química?',
        options: [
          'Porque destruye las moléculas reactantes inmediatamente',
          'Porque incrementa la energía cinética de las moléculas y la frecuencia de choques eficaces',
          'Porque disminuye la presión osmótica de los reactivos',
          'Porque cambia la identidad de los elementos'
        ],
        correctAnswer: 1,
        explanation: 'Mayor temperatura incrementa la energía cinética promedio de las partículas, aumentando la fracción de choques con energía superior a la de activación.',
        points: 25
      },
      {
        id: 'termo_4',
        type: 'opcion_multiple',
        topic: 'Equilibrio Químico',
        question: 'De acuerdo con el Principio de Le Châtelier, si se incrementa la presión en un sistema gaseoso en equilibrio, ¿hacia dónde se desplazará el equilibrio?',
        options: [
          'Hacia el lado que contenga el menor número de moles de gas',
          'Hacia el lado con mayor número de moles de gas',
          'El equilibrio nunca se perturba ante cambios de presión',
          'Hacia la descomposición total de los productos'
        ],
        correctAnswer: 0,
        explanation: 'El sistema contrarresta el aumento de presión desplazándose en el sentido que ocupe menor volumen gaseoso (menor número de moles de gas).',
        points: 25
      }
    ],
    durationMinutes: 15,
    createdAt: Date.now() - 3600000 * 5,
    updatedAt: Date.now() - 3600000 * 5
  }
];

export const TOTAL_EXAM_POINTS = CHEMISTRY_QUESTIONS.reduce((acc, q) => acc + q.points, 0);

