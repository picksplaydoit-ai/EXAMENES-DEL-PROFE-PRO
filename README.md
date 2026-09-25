# 🧪 QuímicaQuiz - Sala de Espera Kahoot, Temporizador Global & Anti-Trampas

Aplicación web completa para aplicar exámenes interactivos en tiempo real con **Sala de Espera estilo Kahoot**, **Temporizador Global sincronizado**, **Carga desde texto plano (Opción Múltiple, Abierta, Relacionar e Imágenes)**, **Código QR dinámico**, **Control de Base de Datos** y **Sistema Anti-Trampas con supervisión en vivo**.

Lista para desplegarse gratis en **Vercel** o utilizarse en un solo archivo independiente (`index.html`) con **CDN de Tailwind CSS**, **CDN de Firebase v10 Modular**, **CDN de QRious** y **Web Audio API**.

---

## 🌟 Características Principales

### 1. 🎮 Sala de Espera & Temporizador Global (Estilo Kahoot)
* **Ingreso y Sala de Espera:** Los alumnos ingresan con su Nombre y Matrícula y acceden a una sala de espera animada con música ambiente opcional y lista de compañeros conectados.
* **Control en Vivo del Docente:**
  * En el panel del profesor aparece la lista en tiempo real de los alumnos formados en la sala.
  * Selector de **Tiempo de Examen** (en minutos, ej. 20 min).
  * Botón **"🚀 Comenzar Examen para Todos"**: Firebase sincroniza el estado de la sesión y lanza una cuenta regresiva 3... 2... 1... simultánea en todas las pantallas.
* **Temporizador Global:** Un reloj sincronizado descuenta el tiempo en todos los dispositivos. Si el tiempo llega a cero, el examen se envía automáticamente.

---

### 2. 📝 Carga desde Texto Plano (Múltiples Tipos de Preguntas con Imágenes)
En el **Panel del Profesor**, haz clic en **"Cargar Examen (Texto Plano)"** para pegar preguntas en los siguientes formatos:

```text
-- TIPO: OPCION_MULTIPLE --
PREGUNTA: ¿Qué tipo de enlace químico se forma entre un metal y un no metal por transferencia completa de electrones?
IMAGEN: https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800
A) Enlace Covalente Polar
B) Enlace Iónico (Electrovalente)
C) Enlace Metálico
D) Enlace Covalente Apolar
CORRECTA: B
RETROALIMENTACION: El enlace iónico resulta de la gran diferencia de electronegatividad.

-- TIPO: RELACIONAR --
PREGUNTA: Relaciona cada sustancia química con su clasificación correspondiente:
IMAGEN: https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800
PAR: NaCl | Sal binaria iónica
PAR: H2SO4 | Ácido oxácido
PAR: He | Gas noble
PAR: NaOH | Base o hidróxido
RETROALIMENTACION: NaCl es sal neutra, H2SO4 ácido fuerte, He gas noble y NaOH hidróxido alcalino.

-- TIPO: ABIERTA --
PREGUNTA: Explica el principio de conservación de la materia formulado por Lavoisier.
IMAGEN: https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800
RESPUESTA_MODELO: La materia no se crea ni se destruye, solo se transforma.
RETROALIMENTACION: En toda reacción ordinaria la masa total de reactivos es igual a la de productos.
```

---

### 3. 🛡️ Sistema Anti-Trampas (Proctoring en Tiempo Real)
* **Detección continua:** Escucha los eventos `visibilitychange` (cambio de pestaña o minimizado) y `blur` (desenfoque o cambio de ventana/aplicación).
* **Alarma Sonora y Advertencia en Pantalla:** Alarma sintetizada mediante Web Audio API y modal emergente con registro de la falta.
* **Límite de 3 Faltas:** A la **3ra advertencia**, el examen se bloquea de forma definitiva y se envía automáticamente.
* **Semáforo en el Panel del Profesor:** Muestra en vivo cuántas faltas acumula cada estudiante con badges de color (Verde: 0 faltas, Amarillo: 1 falta, Naranja: 2 faltas, Rojo: 3 faltas expulsado).

---

### 4. 📱 Código QR Dinámico y Control de Base de Datos
* **Código QR Instantáneo:** Generado en pantalla para que los alumnos lo escaneen con la cámara de su celular y accedan directamente a la sala de espera.
* **Limpiar / Nuevo Grupo:** Botón para reiniciar la base de datos de estudiantes en Firebase Realtime Database y devolver la sala al modo espera para reutilizar el examen con un nuevo grupo.
* **Exportación CSV:** Exporta las calificaciones y bitácora de faltas para Excel / Google Sheets con un clic.

---

## ⚙️ Configuración de Firebase Realtime Database

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
4. En **Configuración del proyecto → Tus apps → Web (`</>`)**, copia tu objeto `firebaseConfig`:
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
5. En la aplicación, haz clic en el botón superior **"Modo Local / Configurar"** y pega tu JSON o campos individuales.
6. Si utilizas el archivo autónomo `index.html` (descargable en el modal de despliegue), pega este objeto dentro de la etiqueta `<script type="module">`.

---

## 🚀 Despliegue Gratis en Vercel

### Opción 1: Archivo Único `index.html` (Super Rápido)
1. En el botón superior **"Desplegar en Vercel"**, descarga el archivo `index.html` autónomo.
2. Sube ese archivo `index.html` a un repositorio en GitHub.
3. En [vercel.com](https://vercel.com/), haz clic en **Add New Project → Import**, selecciona el repositorio y presiona **Deploy**. ¡Listo en 30 segundos!

### Opción 2: Proyecto React Completo (Vite)
1. Sube este repositorio a tu cuenta de GitHub:
   ```bash
   git add .
   git commit -m "feat: Exámenes con Sala Kahoot, Proctoring y Firebase"
   git push origin main
   ```
2. Entra a [vercel.com](https://vercel.com/) e importa el repositorio. Vercel detectará automáticamente Vite y compilará la aplicación.
