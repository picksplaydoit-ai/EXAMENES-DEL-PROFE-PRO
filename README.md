# 🧪 QuímicaQuiz - Exámenes con Carga de Texto Plano, Código QR y Anti-Trampas

Aplicación web completa para aplicar exámenes interactivos con **carga dinámica desde texto plano**, **generación de código QR para alumnos**, **control de base de datos** y **sistema anti-trampas con supervisión en vivo**.

Optimizada para desplegarse gratis en **Vercel** o utilizarse en un solo archivo independiente (`index.html`) con **CDN de Tailwind CSS**, **CDN de Firebase v10 Modular** y **CDN de QRious**.

---

## 🌟 Tres Características Clave Incorporadas

### 1. 📝 Carga de Exámenes desde Texto Plano (Bloc de Notas o Chat)
En el **Panel del Profesor**, puedes hacer clic en **"Cargar Examen (Texto)"**, escribir el título y pegar tu examen directamente. El analizador procesa automáticamente el siguiente formato estándar:

```text
PREGUNTA: [Texto de la pregunta]
A) [Opción 1]
B) [Opción 2]
C) [Opción 3]
D) [Opción 4]
CORRECTA: [A/B/C/D]
RETROALIMENTACION: [Texto de explicación]
```

* **Botón "Plantilla de Ejemplo":** Carga instantáneamente preguntas modelo de Química listas para probar o modificar.
* **Sincronización en Tiempo Real:** Al hacer clic en *"Publicar y Cargar Examen"*, las preguntas se guardan en Firebase Realtime Database y se actualizan al instante en las pantallas de todos los alumnos.

---

### 2. 📱 Generación de Código QR y Control de Base de Datos
* **Código QR Dinámico en Pantalla:** Al hacer clic en **"Mostrar Código QR"**, se genera un código QR grande y nítido con la URL exacta del examen. Los alumnos pueden escanearlo con la cámara de su celular para ingresar directamente a la prueba.
  * Incluye botón para copiar el enlace y descargar la imagen del QR en PNG.
* **Control de Base de Datos ("Limpiar / Nuevo Grupo"):**
  * Incluye un botón para **vaciar y reiniciar los resultados anteriores** de los estudiantes en Firebase Realtime Database con un solo clic.
  * Permite reutilizar el mismo examen con una nueva clase o grupo escolar sin borrar las preguntas.

---

### 3. 🛡️ Sistema Anti-Trampas (Proctoring Activo)
* **Supervisión continua:** El sistema escucha los eventos de navegador `visibilitychange` y `blur`.
* **Alerta en pantalla:** Si el alumno cambia de pestaña o minimiza la ventana, la aplicación emite una alarma sonora y muestra una advertencia en pantalla.
* **Regla de las 3 faltas:** A la **3ra advertencia**, el examen se bloquea de manera definitiva y se envía automáticamente con las respuestas contestadas hasta ese momento.
* **Retroalimentación pedagógica:** Al finalizar, el alumno recibe su nota sobre 100 puntos, revisión de reactivos correctos e incorrectos y la explicación configurada en `RETROALIMENTACION:`.

---

### 4. 👨‍🏫 Panel del Docente (Monitor en Vivo)
* **Tabla en tiempo real:** Muestra qué alumnos están en examen, su progreso (ej. 3/5 preguntas), calificación y conteo de faltas.
* **Alerta sonora y visual instantánea:** Cuando un alumno sale de la pestaña, aparece una notificación roja en vivo en la pantalla del profesor.
* **Exportación CSV:** Descarga la lista completa de notas con un clic para abrir en Excel o Google Sheets.

---

## ⚙️ Configuración de Firebase Realtime Database (CDN v10)

1. Ingresa a [console.firebase.google.com](https://console.firebase.google.com/) y crea un proyecto.
2. Ve a **Compilación (Build) → Realtime Database** y haz clic en **Crear base de datos**.
3. En la pestaña **Reglas (Rules)**, habilita lectura y escritura:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
4. En **Configuración del proyecto (engrane) → Tus apps → Web (`</>`)**, copia tu objeto:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "tu-proyecto.firebaseapp.com",
     databaseURL: "https://tu-proyecto-default-rtdb.firebaseio.com",
     projectId: "tu-proyecto",
     storageBucket: "tu-proyecto.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. Pega estas credenciales en el modal **"Modo Local / Configurar"** de la app, o en el archivo autónomo `index.html`.

---

## 📦 CDN Utilizadas en la Versión Autónoma (`index.html`)

Para la versión de un solo archivo ejecutable directamente sin instalar Node.js:
* **Tailwind CSS:** `https://cdn.tailwindcss.com`
* **QRious (Generador de Códigos QR):** `https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js`
* **Firebase v10 Modular:**
  * `https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js`
  * `https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js`

---

## 🚀 Despliegue en Vercel (Gratis en 1 Minuto)

1. Descarga el archivo `standalone_index.html` (o usa el botón **"Descargar HTML Autónomo"** en la barra inferior de la aplicación).
2. Súbelo a un repositorio de [GitHub](https://github.com/new) con el nombre `index.html`.
3. Entra a [vercel.com/new](https://vercel.com/new), selecciona tu repositorio y presiona **Deploy**.
4. ¡Listo! Obtendrás una URL pública segura HTTPS para proyectar el código QR a tus alumnos.
