export const STANDALONE_HTML_CODE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuímicaQuiz - Examen Anti-Trampas & Panel en Vivo</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- QRious QR Code Generator CDN -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen">

  <!-- ==========================================
       CONFIGURACIÓN DE FIREBASE (COLOCA TUS CLAVES AQUÍ)
       ========================================== -->
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

    // Reemplaza con tus credenciales de Firebase Console:
    const firebaseConfig = {
      apiKey: "AIzaSyYOUR_API_KEY_HERE",
      authDomain: "tu-proyecto.firebaseapp.com",
      databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
      projectId: "tu-proyecto",
      storageBucket: "tu-proyecto.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef"
    };

    let db = null;
    try {
      if (firebaseConfig.apiKey !== "AIzaSyYOUR_API_KEY_HERE") {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        console.log("Firebase Realtime Database conectado.");
      } else {
        console.warn("Modo Local activo. Configura firebaseConfig para sincronización remota entre dispositivos.");
      }
    } catch (e) {
      console.warn("Modo local activo:", e);
    }

    // Preguntas por Defecto
    let activeQuestions = [
      {
        id: "q1",
        question: "¿Qué tipo de enlace se forma entre un metal y un no metal por transferencia de electrones?",
        options: ["Covalente Polar", "Iónico (Electrovalente)", "Metálico", "Covalente Apolar"],
        correct: 1,
        explanation: "El enlace iónico resulta de la transferencia electrónica debido a la alta diferencia de electronegatividad.",
        points: 25
      },
      {
        id: "q2",
        question: "De acuerdo con Lavoisier, ¿cuáles coeficientes balancean: _ C3H8 + _ O2 -> _ CO2 + _ H2O?",
        options: ["1, 5, 3, 4", "1, 3, 3, 4", "2, 7, 6, 8", "1, 10, 3, 8"],
        correct: 0,
        explanation: "1 C3H8 + 5 O2 produce 3 CO2 + 4 H2O (conservación exacta de átomos en reactivos y productos).",
        points: 25
      },
      {
        id: "q3",
        question: "Si una solución acuosa tiene [H3O+] = 1 x 10^-3 M a 25°C, ¿cuál es su pH y cómo se clasifica?",
        options: ["pH = 11 (Básica)", "pH = 3 (Ácida)", "pH = 7 (Neutra)", "pH = -3 (Anfótera)"],
        correct: 1,
        explanation: "pH = -log(10^-3) = 3. Al ser menor a 7 a 25°C, se clasifica como solución ácida.",
        points: 25
      },
      {
        id: "q4",
        question: "¿Cuántos protones y cuántos neutrones contiene el núcleo del carbono-14 (14_6 C)?",
        options: ["6 protones y 6 neutrones", "8 protones y 6 neutrones", "6 protones y 8 neutrones", "14 protones y 0 neutrones"],
        correct: 2,
        explanation: "El carbono tiene Z=6 protones. Los neutrones son N = A - Z = 14 - 6 = 8 neutrones.",
        points: 25
      }
    ];

    let examTitle = "Examen de Química General";
    let currentStudent = {
      fullName: '',
      matricula: '',
      answers: {},
      warnings: 0,
      cheatLogs: [],
      status: 'not_started',
      score: 0
    };
    let currentQIdx = 0;
    let studentsDB = {};

    // Sincronización BroadcastChannel para pruebas locales en múltiples pestañas
    const channel = new BroadcastChannel('quimica_live_channel_v2');
    channel.onmessage = (e) => {
      if (e.data?.student) {
        studentsDB[e.data.student.matricula] = e.data.student;
        renderTeacherTable();
      } else if (e.data?.type === 'CLEAR_STUDENTS') {
        studentsDB = {};
        renderTeacherTable();
      } else if (e.data?.type === 'NEW_EXAM') {
        activeQuestions = e.data.questions;
        examTitle = e.data.title;
        document.getElementById('examMainTitle').innerText = examTitle;
        if (currentStudent.status === 'in_progress') renderQuestion();
      }
    };

    function syncStudent(st) {
      studentsDB[st.matricula] = st;
      channel.postMessage({ student: st });
      if (db) {
        set(ref(db, 'exams/quimica/students/' + st.matricula), st);
      }
    }

    if (db) {
      // Escuchar alumnos
      onValue(ref(db, 'exams/quimica/students'), (snapshot) => {
        const val = snapshot.val();
        studentsDB = val || {};
        renderTeacherTable();
      });

      // Escuchar examen dinámico
      onValue(ref(db, 'exams/quimica/active_exam'), (snapshot) => {
        const val = snapshot.val();
        if (val && val.questions) {
          activeQuestions = val.questions;
          examTitle = val.title || examTitle;
          document.getElementById('examMainTitle').innerText = examTitle;
          if (currentStudent.status === 'in_progress') renderQuestion();
        }
      });
    }

    // 1. CARGA DE EXÁMENES DESDE TEXTO PLANO
    window.loadPlainTextExam = function() {
      const text = document.getElementById('plainTextInput').value.trim();
      if (!text) return alert("Por favor pega el texto de las preguntas.");

      const blocks = text.split(/(?=^PREGUNTA\s*:)/gmi).map(b => b.trim()).filter(Boolean);
      if (blocks.length === 0) {
        return alert("No se detectó el formato correcto. Asegúrate de que cada reactivo comience con PREGUNTA:");
      }

      const parsed = [];
      blocks.forEach((block, idx) => {
        const lines = block.split('\\n').map(l => l.trim()).filter(Boolean);
        let qText = '';
        const opts = {};
        let correctLetter = '';
        let retro = '';

        lines.forEach(l => {
          const qM = l.match(/^PREGUNTA\s*:\s*(.+)$/i);
          if (qM) qText = qM[1].trim();

          const optM = l.match(/^([A-Da-d])[\)\.\:\-]\s*(.+)$/);
          if (optM) opts[optM[1].toUpperCase()] = optM[2].trim();

          const corM = l.match(/^(?:CORRECTA|RESPUESTA)\s*:\s*([A-Da-d])/i);
          if (corM) correctLetter = corM[1].toUpperCase();

          const retM = l.match(/^(?:RETROALIMENTACION|RETROALIMENTACIÓN|EXPLICACION)\s*:\s*(.*)$/i);
          if (retM) retro = retM[1].trim();
        });

        if (qText && opts['A'] && opts['B']) {
          const optionsArr = [opts['A'], opts['B'], opts['C'] || '', opts['D'] || ''].filter(Boolean);
          const correctIdx = correctLetter ? correctLetter.charCodeAt(0) - 65 : 0;
          parsed.push({
            id: 'q_' + idx,
            question: qText,
            options: optionsArr,
            correct: correctIdx >= 0 && correctIdx < optionsArr.length ? correctIdx : 0,
            explanation: retro || "Respuesta correcta: " + correctLetter,
            points: Math.round(100 / blocks.length)
          });
        }
      });

      if (parsed.length === 0) {
        return alert("No se pudo interpretar ninguna pregunta válida. Revisa el formato de ejemplo.");
      }

      activeQuestions = parsed;
      examTitle = document.getElementById('inputExamTitle').value.trim() || "Examen de Química";
      document.getElementById('examMainTitle').innerText = examTitle;

      // Guardar en Firebase y notificar a pestañas
      if (db) {
        set(ref(db, 'exams/quimica/active_exam'), { title: examTitle, questions: parsed });
      }
      channel.postMessage({ type: 'NEW_EXAM', title: examTitle, questions: parsed });

      alert("¡Examen cargado y publicado con éxito! (" + parsed.length + " preguntas sincronizadas en tiempo real).");
      closeExamLoader();
      renderTeacherTable();
    };

    window.loadTemplateSample = function() {
      document.getElementById('plainTextInput').value = 
\`PREGUNTA: ¿Qué tipo de enlace químico se forma entre un metal y un no metal por transferencia de electrones?
A) Enlace Covalente Polar
B) Enlace Iónico
C) Enlace Metálico
D) Enlace Covalente Apolar
CORRECTA: B
RETROALIMENTACION: El enlace iónico resulta de la transferencia electrónica debido a la gran diferencia de electronegatividad.

PREGUNTA: Según la ley de conservación de la materia, ¿cuáles coeficientes balancean: _ C3H8 + _ O2 -> _ CO2 + _ H2O?
A) 1, 5, 3, 4
B) 1, 3, 3, 4
C) 2, 7, 6, 8
D) 1, 10, 3, 8
CORRECTA: A
RETROALIMENTACION: 1 C3H8 + 5 O2 -> 3 CO2 + 4 H2O produce conservación de átomos en ambos lados.

PREGUNTA: Si una solución acuosa tiene [H3O+] = 1 x 10^-3 M a 25°C, ¿cuál es su pH?
A) pH = 11 (Básica)
B) pH = 3 (Ácida)
C) pH = 7 (Neutra)
D) pH = -3 (Anfótera)
CORRECTA: B
RETROALIMENTACION: pH = -log(10^-3) = 3 (solución ácida).\`;
    };

    // 2. GENERACIÓN DE CÓDIGO QR
    window.showQRCodeModal = function() {
      const studentUrl = window.location.origin + window.location.pathname;
      document.getElementById('qrUrlText').innerText = studentUrl;
      const qrCanvas = document.getElementById('qrCanvas');
      if (window.QRious) {
        new QRious({
          element: qrCanvas,
          value: studentUrl,
          size: 260,
          background: '#ffffff',
          foreground: '#0f172a'
        });
      }
      document.getElementById('qrModal').classList.remove('hidden');
    };

    window.closeQRCodeModal = function() {
      document.getElementById('qrModal').classList.add('hidden');
    };

    window.copyStudentUrl = function() {
      const studentUrl = window.location.origin + window.location.pathname;
      navigator.clipboard.writeText(studentUrl);
      alert("Enlace copiado al portapapeles.");
    };

    // 3. CONTROL DE BASE DE DATOS: LIMPIAR / REINICIAR RESULTADOS
    window.clearDatabaseResults = function() {
      if (confirm("⚠️ ¿Estás seguro de LIMPIAR todos los resultados de los alumnos?\\n\\nEsto borrará las notas de los alumnos anteriores en Firebase para aplicar el examen a un NUEVO GRUPO.\\n(Las preguntas del examen permanecerán intactas).")) {
        studentsDB = {};
        if (db) remove(ref(db, 'exams/quimica/students'));
        channel.postMessage({ type: 'CLEAR_STUDENTS' });
        renderTeacherTable();
        alert("¡Base de datos de alumnos reiniciada con éxito para el nuevo grupo!");
      }
    };

    // SISTEMA ANTI-TRAMPAS
    document.addEventListener("visibilitychange", () => {
      if (currentStudent.status === 'in_progress' && (document.hidden || document.visibilityState === 'hidden')) {
        handleTabViolation("Cambio de pestaña o minimizado detectado");
      }
    });

    window.addEventListener("blur", () => {
      if (currentStudent.status === 'in_progress') {
        handleTabViolation("Ventana desenfocada o cambio de aplicación");
      }
    });

    function handleTabViolation(reason) {
      currentStudent.warnings++;
      currentStudent.cheatLogs.push({
        time: new Date().toLocaleTimeString(),
        reason: reason,
        warningNumber: currentStudent.warnings
      });

      syncStudent(currentStudent);

      if (currentStudent.warnings >= 3) {
        currentStudent.status = 'forced_submission_cheat';
        syncStudent(currentStudent);
        showCheaterModal();
      } else {
        showWarningModal(currentStudent.warnings);
      }
    }

    function showWarningModal(warnNum) {
      const modal = document.getElementById('warningModal');
      document.getElementById('warnCountText').innerText = warnNum + " de 3";
      modal.classList.remove('hidden');
    }

    window.closeWarningModal = function() {
      document.getElementById('warningModal').classList.add('hidden');
      updateExamHeader();
    };

    function showCheaterModal() {
      document.getElementById('warningModal').classList.add('hidden');
      document.getElementById('cheaterExpulsionModal').classList.remove('hidden');
      calculateFinalGrade();
      setTimeout(() => {
        document.getElementById('cheaterExpulsionModal').classList.add('hidden');
        renderResults();
      }, 3500);
    }

    window.setRole = function(role) {
      document.getElementById('studentSection').classList.toggle('hidden', role !== 'student');
      document.getElementById('teacherSection').classList.toggle('hidden', role !== 'teacher');
      document.getElementById('btnRoleStudent').className = role === 'student' ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400';
      document.getElementById('btnRoleTeacher').className = role === 'teacher' ? 'px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 text-white' : 'px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400';
      if (role === 'teacher') renderTeacherTable();
    };

    window.startExam = function(e) {
      e.preventDefault();
      const name = document.getElementById('inputName').value.trim();
      const mat = document.getElementById('inputMatricula').value.trim().toUpperCase();
      if (!name || !mat) return alert("Completa tu nombre y matrícula.");

      currentStudent.fullName = name;
      currentStudent.matricula = mat;
      currentStudent.status = 'in_progress';
      currentStudent.startTime = Date.now();
      currentStudent.answers = {};
      currentStudent.warnings = 0;
      currentStudent.cheatLogs = [];

      syncStudent(currentStudent);

      document.getElementById('studentRegisterForm').classList.add('hidden');
      document.getElementById('examActiveArea').classList.remove('hidden');
      renderQuestion();
      updateExamHeader();
    };

    function updateExamHeader() {
      document.getElementById('examStudentName').innerText = currentStudent.fullName;
      document.getElementById('examStudentMat').innerText = currentStudent.matricula;
      const warnBadge = document.getElementById('examWarnBadge');
      warnBadge.innerText = "Faltas: " + currentStudent.warnings + " / 3";
      if (currentStudent.warnings === 0) {
        warnBadge.className = "px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
      } else if (currentStudent.warnings === 1) {
        warnBadge.className = "px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30";
      } else {
        warnBadge.className = "px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse";
      }
    }

    function renderQuestion() {
      const q = activeQuestions[currentQIdx] || activeQuestions[0];
      if (!q) return;
      document.getElementById('qCounter').innerText = "Pregunta " + (currentQIdx + 1) + " de " + activeQuestions.length;
      document.getElementById('qTitle').innerText = (currentQIdx + 1) + ". " + q.question;

      const container = document.getElementById('qOptionsContainer');
      container.innerHTML = '';

      q.options.forEach((opt, idx) => {
        const isSelected = currentStudent.answers[q.id] === idx;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = "w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-3 " +
          (isSelected ? "bg-indigo-600/30 border-indigo-500 text-white font-semibold" : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800");
        btn.innerHTML = \`<span class="w-6 h-6 rounded bg-slate-700 text-xs font-bold flex items-center justify-center font-mono">\${String.fromCharCode(65+idx)}</span><span>\${opt}</span>\`;
        btn.onclick = () => {
          currentStudent.answers[q.id] = idx;
          syncStudent(currentStudent);
          renderQuestion();
        };
        container.appendChild(btn);
      });

      document.getElementById('btnPrev').disabled = currentQIdx === 0;
      document.getElementById('btnNext').innerText = currentQIdx === activeQuestions.length - 1 ? "Finalizar Examen" : "Siguiente";
    }

    window.prevQuestion = function() {
      if (currentQIdx > 0) { currentQIdx--; renderQuestion(); }
    };

    window.nextQuestion = function() {
      if (currentQIdx < activeQuestions.length - 1) {
        currentQIdx++;
        renderQuestion();
      } else {
        if (confirm("¿Estás seguro de enviar tu examen?")) {
          currentStudent.status = 'submitted';
          calculateFinalGrade();
          syncStudent(currentStudent);
          renderResults();
        }
      }
    };

    function calculateFinalGrade() {
      let score = 0;
      let totalPts = 0;
      activeQuestions.forEach(q => {
        totalPts += (q.points || 20);
        if (currentStudent.answers[q.id] === q.correct) score += (q.points || 20);
      });
      currentStudent.score = score;
      currentStudent.maxScore = totalPts;
    }

    function renderResults() {
      document.getElementById('examActiveArea').classList.add('hidden');
      document.getElementById('examResultsArea').classList.remove('hidden');

      const isCheater = currentStudent.status === 'forced_submission_cheat';
      document.getElementById('resStatusBanner').className = isCheater ? "p-4 rounded-xl bg-rose-600/20 border border-rose-500 text-rose-300 mb-6" : "p-4 rounded-xl bg-emerald-600/20 border border-emerald-500 text-emerald-300 mb-6";
      document.getElementById('resStatusTitle').innerText = isCheater ? "⚠️ Examen bloqueado y enviado por 3 faltas de cambio de pestaña" : "✅ Examen entregado correctamente";
      document.getElementById('resFinalScore').innerText = currentStudent.score + " / " + (currentStudent.maxScore || 100) + " pts";

      const reviewContainer = document.getElementById('resReviewContainer');
      reviewContainer.innerHTML = '';
      activeQuestions.forEach((q, idx) => {
        const studentPick = currentStudent.answers[q.id];
        const isRight = studentPick === q.correct;
        const box = document.createElement('div');
        box.className = "p-4 rounded-xl border mb-3 " + (isRight ? "bg-emerald-950/20 border-emerald-500/40" : "bg-rose-950/20 border-rose-500/40");
        box.innerHTML = \`
          <div class="flex justify-between font-bold text-sm mb-1">
            <span>\${idx + 1}. \${q.question}</span>
            <span class="\${isRight ? 'text-emerald-400' : 'text-rose-400'}">\${isRight ? '+' + (q.points || 20) + ' pts' : '0 pts'}</span>
          </div>
          <p class="text-xs text-slate-300 mb-1">Tu respuesta: <span class="font-semibold \${isRight ? 'text-emerald-400' : 'text-rose-400'}">\${studentPick !== undefined ? q.options[studentPick] : 'Sin responder'}</span></p>
          <p class="text-xs text-emerald-400 mb-2">Respuesta correcta: <span class="font-semibold">\${q.options[q.correct]}</span></p>
          <p class="text-xs text-slate-400 bg-slate-900/80 p-2 rounded">💡 Retroalimentación: \${q.explanation}</p>
        \`;
        reviewContainer.appendChild(box);
      });
    }

    // PANEL EN VIVO DEL PROFESOR
    function renderTeacherTable() {
      const tbody = document.getElementById('teacherTableBody');
      if (!tbody) return;
      tbody.innerHTML = '';

      const list = Object.values(studentsDB);
      document.getElementById('mTotal').innerText = list.length;
      document.getElementById('mActive').innerText = list.filter(s => s.status === 'in_progress').length;
      document.getElementById('mCheated').innerText = list.filter(s => s.warnings >= 3 || s.status === 'forced_submission_cheat').length;
      document.getElementById('activeQCountBadge').innerText = activeQuestions.length + " preguntas activas";

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-slate-500">Esperando que los alumnos escaneen el código QR o ingresen a la prueba...</td></tr>';
        return;
      }

      list.forEach(st => {
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-800 hover:bg-slate-800/40";
        tr.innerHTML = \`
          <td class="py-3 px-4">
            <div class="font-bold text-white">\${st.fullName}</div>
            <div class="text-xs text-indigo-400 font-mono">\${st.matricula}</div>
          </td>
          <td class="py-3 px-4">
            \${st.status === 'in_progress' ? '<span class="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 font-bold">En Examen</span>' :
              st.status === 'forced_submission_cheat' ? '<span class="px-2 py-0.5 rounded text-xs bg-rose-600 text-white font-bold animate-pulse">EXPULSADO (3 faltas)</span>' :
              '<span class="px-2 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-300 font-bold">Completado</span>'}
          </td>
          <td class="py-3 px-4 font-mono font-bold text-white">\${st.score || 0} pts</td>
          <td class="py-3 px-4">
            <span class="px-2.5 py-1 rounded text-xs font-bold \${st.warnings >= 3 ? 'bg-rose-600 text-white' : st.warnings > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400'}">
              \${st.warnings} / 3 faltas
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="deleteStudent('\${st.matricula}')" class="text-xs text-rose-400 hover:underline">Eliminar</button>
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    window.deleteStudent = function(mat) {
      if (confirm("¿Eliminar al alumno?")) {
        delete studentsDB[mat];
        if (db) remove(ref(db, 'exams/quimica/students/' + mat));
        renderTeacherTable();
      }
    };

    window.openExamLoader = function() {
      document.getElementById('examLoaderModal').classList.remove('hidden');
    };

    window.closeExamLoader = function() {
      document.getElementById('examLoaderModal').classList.add('hidden');
    };

    window.exportCSV = function() {
      const list = Object.values(studentsDB);
      if (list.length === 0) return alert("No hay alumnos para exportar.");
      let csv = "Matricula,Nombre,Estado,Puntaje,Faltas\\n";
      list.forEach(st => {
        csv += \`"\${st.matricula}","\${st.fullName}","\${st.status}",\${st.score || 0},\${st.warnings}\\n\`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Reporte_Examen.csv";
      link.click();
    };
  </script>

  <!-- Navbar -->
  <header class="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-30 px-6 py-3 flex justify-between items-center">
    <div class="flex items-center space-x-2">
      <span class="text-2xl">🧪</span>
      <span class="font-extrabold text-lg text-white">Química<span class="text-indigo-400">Quiz</span></span>
      <span class="ml-2 text-xs bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">Anti-Trampas + QR</span>
    </div>
    <div class="flex items-center space-x-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
      <button id="btnRoleStudent" onclick="setRole('student')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white">Vista Alumno</button>
      <button id="btnRoleTeacher" onclick="setRole('teacher')" class="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400">Panel Profesor</button>
    </div>
  </header>

  <!-- SECCIÓN ALUMNO -->
  <main id="studentSection" class="max-w-3xl mx-auto px-4 py-8">
    <div id="studentRegisterForm" class="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl">
      <h1 id="examMainTitle" class="text-2xl font-extrabold text-white text-center mb-2">Examen de Química General</h1>
      <p class="text-slate-400 text-xs text-center mb-6">Ingresa tus datos para comenzar. Sistema con supervisor activo.</p>
      <form onsubmit="startExam(event)" class="space-y-4 max-w-md mx-auto">
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Nombre Completo</label>
          <input id="inputName" type="text" required placeholder="Ej. Camila Torres" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm">
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-300 uppercase mb-1">Matrícula o Código</label>
          <input id="inputMatricula" type="text" required placeholder="Ej. A01928374" class="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono uppercase">
        </div>
        <div class="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-slate-300">
          <p class="font-bold text-amber-300 mb-1">⚠️ AVISO ANTI-TRAMPAS:</p>
          <p>No cambies de pestaña ni minimices la ventana. El sistema cuenta cada falta. A la 3ra advertencia serás expulsado y se enviará tu examen automáticamente.</p>
        </div>
        <button type="submit" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/30">
          Iniciar Examen
        </button>
      </form>
    </div>

    <!-- Área de Examen Activo -->
    <div id="examActiveArea" class="hidden space-y-6">
      <div class="flex justify-between items-center bg-slate-800/90 p-4 rounded-xl border border-slate-700">
        <div>
          <span id="examStudentName" class="font-bold text-white text-sm"></span>
          <span id="examStudentMat" class="text-xs text-indigo-400 font-mono ml-2"></span>
        </div>
        <div id="examWarnBadge" class="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400">
          Faltas: 0 / 3
        </div>
      </div>

      <div class="bg-slate-800/90 p-6 rounded-2xl border border-slate-700 shadow-xl">
        <div class="text-xs text-slate-400 mb-2 font-mono">
          <span id="qCounter"></span>
        </div>
        <h2 id="qTitle" class="text-lg font-bold text-white mb-4"></h2>
        <div id="qOptionsContainer" class="space-y-3 my-6"></div>
        <div class="flex justify-between pt-4 border-t border-slate-700">
          <button id="btnPrev" onclick="prevQuestion()" class="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300">Anterior</button>
          <button id="btnNext" onclick="nextQuestion()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- Área de Resultados -->
    <div id="examResultsArea" class="hidden space-y-6">
      <div id="resStatusBanner" class="p-4 rounded-xl">
        <h2 id="resStatusTitle" class="font-bold text-lg"></h2>
      </div>
      <div class="bg-slate-800/90 p-6 rounded-2xl border border-slate-700 text-center">
        <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Calificación Final</p>
        <div id="resFinalScore" class="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 my-2"></div>
      </div>
      <div id="resReviewContainer"></div>
    </div>
  </main>

  <!-- SECCIÓN PROFESOR (PANEL EN VIVO) -->
  <main id="teacherSection" class="hidden max-w-5xl mx-auto px-4 py-8 space-y-6">
    <!-- Barra Superior del Docente con Acciones -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/90 p-5 rounded-2xl border border-slate-700">
      <div>
        <h1 class="text-xl sm:text-2xl font-black text-white">Panel del Docente</h1>
        <p class="text-xs text-slate-400 mt-0.5">Control de examen, generación de QR y monitoreo de trampas</p>
        <span id="activeQCountBadge" class="inline-block mt-2 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20"></span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button onclick="openExamLoader()" class="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-colors flex items-center space-x-1.5">
          <span>📝 Cargar Examen (Texto)</span>
        </button>
        <button onclick="showQRCodeModal()" class="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors flex items-center space-x-1.5">
          <span>📱 Mostrar QR</span>
        </button>
        <button onclick="clearDatabaseResults()" class="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center space-x-1.5" title="Borrar intentos para un nuevo grupo">
          <span>🔄 Limpiar / Nuevo Grupo</span>
        </button>
        <button onclick="exportCSV()" class="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors">
          <span>📊 CSV</span>
        </button>
      </div>
    </div>

    <!-- Métricas -->
    <div class="grid grid-cols-3 gap-3 text-center">
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div class="text-xs text-slate-400 uppercase font-bold">Total Alumnos</div>
        <div id="mTotal" class="text-2xl font-black text-indigo-400 mt-1">0</div>
      </div>
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div class="text-xs text-slate-400 uppercase font-bold">En Examen</div>
        <div id="mActive" class="text-2xl font-black text-emerald-400 mt-1">0</div>
      </div>
      <div class="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div class="text-xs text-slate-400 uppercase font-bold">Sancionados (3 faltas)</div>
        <div id="mCheated" class="text-2xl font-black text-rose-400 mt-1">0</div>
      </div>
    </div>

    <!-- Tabla en Vivo -->
    <div class="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900 border-b border-slate-700 text-slate-400 font-bold uppercase">
          <tr>
            <th class="py-3 px-4">Alumno</th>
            <th class="py-3 px-4">Estado</th>
            <th class="py-3 px-4">Calificación</th>
            <th class="py-3 px-4">Faltas Anti-Trampas</th>
            <th class="py-3 px-4 text-right">Acción</th>
          </tr>
        </thead>
        <tbody id="teacherTableBody">
          <tr><td colspan="5" class="text-center py-8 text-slate-500">Esperando que los alumnos se conecten...</td></tr>
        </tbody>
      </table>
    </div>
  </main>

  <!-- MODAL: CARGAR EXAMEN DESDE TEXTO PLANO -->
  <div id="examLoaderModal" class="hidden fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
      <div class="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
        <h3 class="text-base font-bold text-white">Cargar Examen desde Texto Plano</h3>
        <button onclick="closeExamLoader()" class="text-slate-400 hover:text-white">✕</button>
      </div>

      <div class="space-y-3 overflow-y-auto pr-1 text-xs">
        <div>
          <label class="block font-bold text-slate-300 uppercase mb-1">Título del Examen:</label>
          <input id="inputExamTitle" type="text" value="Examen de Química General" class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs">
        </div>

        <div class="flex justify-between items-center pt-2">
          <span class="font-bold text-slate-300">Pega aquí tus preguntas:</span>
          <button onclick="loadTemplateSample()" class="text-indigo-400 hover:underline text-xs">Pegar formato de ejemplo</button>
        </div>

        <textarea id="plainTextInput" rows="10" placeholder="PREGUNTA: ¿Texto?&#10;A) Opción 1&#10;B) Opción 2&#10;C) Opción 3&#10;D) Opción 4&#10;CORRECTA: A&#10;RETROALIMENTACION: Explicación..." class="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl font-mono text-xs text-slate-200"></textarea>
      </div>

      <div class="flex justify-between items-center pt-4 border-t border-slate-800 mt-4">
        <button onclick="closeExamLoader()" class="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
        <button onclick="loadPlainTextExam()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 font-bold text-white rounded-xl text-xs shadow-md">
          Cargar y Publicar Examen
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL: CÓDIGO QR PARA ALUMNOS -->
  <div id="qrModal" class="hidden fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
      <h3 class="text-lg font-black text-white">Código QR del Examen</h3>
      <p class="text-xs text-slate-400 mt-1">Los alumnos pueden escanearlo con la cámara de su celular</p>
      
      <div class="my-5 p-3 bg-white rounded-xl inline-block">
        <canvas id="qrCanvas"></canvas>
      </div>

      <p id="qrUrlText" class="font-mono text-[11px] text-indigo-300 truncate bg-slate-800 p-2 rounded-lg mb-4"></p>

      <div class="flex space-x-2">
        <button onclick="copyStudentUrl()" class="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl">Copiar Enlace</button>
        <button onclick="closeQRCodeModal()" class="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- MODAL DE ADVERTENCIA ANTI-TRAMPAS -->
  <div id="warningModal" class="hidden fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
    <div class="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
      <div class="text-4xl mb-2">🚨</div>
      <h3 class="text-lg font-black text-rose-400 uppercase">¡Falta Anti-Trampas!</h3>
      <p class="text-xs text-slate-300 mt-2">Has salido de la pestaña o minimizado la ventana del examen.</p>
      <div class="my-4 p-2 bg-slate-800 rounded-lg text-rose-300 text-xs font-bold font-mono">
        Advertencia <span id="warnCountText">1 de 3</span>
      </div>
      <p class="text-[11px] text-slate-400 mb-4">Esta acción fue reportada en vivo al profesor. A la 3ra advertencia serás expulsado.</p>
      <button onclick="closeWarningModal()" class="w-full py-2.5 bg-rose-600 hover:bg-rose-500 font-bold text-xs rounded-xl text-white">
        Comprendo y vuelvo a mi examen
      </button>
    </div>
  </div>

  <!-- MODAL DE EXPULSIÓN (3 FALTAS) -->
  <div id="cheaterExpulsionModal" class="hidden fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
    <div class="bg-slate-900 border-2 border-red-600 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-bounce">
      <div class="text-5xl mb-2">⛔</div>
      <h3 class="text-xl font-black text-white">¡EXPULSADO POR FALTAS!</h3>
      <p class="text-xs text-rose-300 mt-2 font-semibold">Alcanzaste las 3 advertencias por salirte de la pestaña. Tu examen se ha bloqueado y finalizado automáticamente.</p>
    </div>
  </div>

</body>
</html>
`;
