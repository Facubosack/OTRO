# 📱 Blueprint / Plantilla de Arquitectura Web App (PWA)

Esta es la guía y plantilla base del stack utilizado en **OTRO**. Podés copiar y reutilizar esta estructura para cualquier nueva aplicación web que quieras crear con la misma velocidad, calidad visual y comportamiento de app nativa en el celular.

---

## 🏗️ 1. Resumen del Stack Tecnológico

| Capa | Tecnología | Ventajas y Por Qué se Eligió |
| :--- | :--- | :--- |
| **Estructura** | HTML5 Semántico | Carga instantánea, accesible, sin dependencias ni compiladores. |
| **Estilos** | CSS Moderno (Vanilla) con Variables | Variables CSS para diseño consistente, flexbox/grid, animaciones suaves y soporte modo móvil. |
| **Lógica** | JavaScript ES6 Modular | Modular por responsabilidades (`auth.js`, `storage.js`, `app.js`), sin bundlers pesados (Webpack/Vite). |
| **Base de Datos** | **Firebase Firestore** | Base de datos NoSQL en la nube, reactiva en tiempo real (`onSnapshot`) y persistencia offline con IndexedDB. |
| **Autenticación** | **Firebase Auth (Google)** | Login con 1 clic con cuenta Google (`signInWithPopup`), sin contraseñas complejas. |
| **App Móvil (PWA)** | Service Worker + Manifest | Se instala en la pantalla de inicio de Android/iOS como una app nativa (pantalla completa, sin barra de URL). |
| **Hosting Producción** | **Vercel** (vía GitHub) | Gratuito, certificado SSL (HTTPS) automático y despliegue continuo con cada `git push origin main`. |
| **Servidor Local** | Node (`npx serve`) o Python | Pruebas instantáneas en `http://localhost:3000`. |

---

## 📁 2. Estructura de Carpetas Estándar

```text
mi-nueva-app/
├── index.html              # Estructura principal, modales y carga de scripts
├── manifest.json           # Configuración PWA (nombre, colores, iconos para móvil)
├── sw.js                   # Service Worker (caché offline y carga rápida)
├── package.json            # Opcional (para scripts de desarrollo con npm/npx)
├── .gitignore              # Ignorar node_modules, .DS_Store, etc.
│
├── css/
│   └── style.css           # Design System con variables CSS y media queries móviles
│
├── js/
│   ├── firebase-config.js  # Credenciales e inicialización de Firebase + Firestore + Auth
│   ├── auth.js             # Controlador de inicio de sesión con Google y perfil de usuario
│   ├── storage.js          # Capa de datos (sincronización Firestore en vivo + fallback local)
│   ├── data.js             # Categorías, configuraciones y datos iniciales
│   └── app.js              # Controlador principal de la interfaz, eventos y modales
│
└── assets/
    ├── logo.svg            # Logo vectorial de la marca
    ├── icon-192.png        # Icono PWA para celular (192x192 px)
    └── icon-512.png        # Icono PWA para celular (512x512 px)
```

---

## ⚙️ 3. Archivos Clave y Código Base

### A. Viewport y Reglas Anti-Zoom para Móviles (`index.html`)
Para que en el celular se sienta como una aplicación nativa y **no haga zoom molesto** al tocar los campos de texto:

```html
<!-- Meta tags esenciales en el <head> de index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#EA580C">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="./manifest.json">
```

En tu `style.css`:
```css
/* Evita que Safari en iOS y Chrome en Android hagan auto-zoom al escribir */
input, select, textarea, .form-input {
  font-size: 16px !important;
}
```

---

### B. Manifiesto PWA (`manifest.json`)
Permite instalar la web en la pantalla de inicio del celular:

```json
{
  "name": "Mi Nueva App",
  "short_name": "MiApp",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#F8FAFC",
  "theme_color": "#EA580C",
  "orientation": "portrait",
  "icons": [
    {
      "src": "./assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

### C. Conexión Firebase (`js/firebase-config.js`)
SDKs Compat (versión 10 para navegador sin empaquetadores):

```html
<!-- En index.html antes de cerrar el <body> -->
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>
<script src="./js/firebase-config.js"></script>
```

Contenido de `js/firebase-config.js`:
```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "TU_APP_ID"
};

let db = null;
let auth = null;
let googleProvider = null;
let isFirebaseReady = false;

try {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    auth = firebase.auth();
    googleProvider = new firebase.auth.GoogleAuthProvider();

    // Persistencia offline en IndexedDB
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
    isFirebaseReady = true;
  }
} catch (error) {
  console.warn("Error inicializando Firebase:", error);
}
```

---

### D. Patrón de Sincronización en Tiempo Real (`js/storage.js`)
Escucha cambios en vivo y actualiza la UI automáticamente:

```javascript
initFirestoreSync() {
  if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady && db) {
    db.collection('tu_coleccion').onSnapshot((snapshot) => {
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      // Guardar en caché y avisar a la interfaz
      this._itemsCache = items;
      localStorage.setItem('mis_items', JSON.stringify(items));
      window.dispatchEvent(new CustomEvent('itemsUpdated'));
    });
  }
}
```

---

## 🚀 4. Paso a Paso para Iniciar un Nuevo Proyecto con esta Arquitectura

1. **Crear repositorio en GitHub:**
   - Creás un repo nuevo (ej. `mi-nueva-app`).
   - Clonás en tu máquina local.

2. **Crear proyecto en Firebase Console (`console.firebase.google.com`):**
   - Creás un nuevo proyecto.
   - Creás una base de datos **Cloud Firestore** en modo de prueba.
   - En **Authentication > Sign-in method**, activás **Google**.
   - En **Authentication > Settings > Authorized domains**, agregás tu futuro dominio de Vercel y `localhost`.

3. **Conectar en Vercel (`vercel.com`):**
   - Importás tu repositorio de GitHub en Vercel.
   - Vercel detecta automáticamente que es una web estática y te da un link `https://mi-nueva-app.vercel.app` con HTTPS gratuito.

4. **Flujo de Trabajo Diario:**
   - Hacés cambios en tu código.
   - Probás en local con `npx serve . -l 3000`.
   - Cuando te gusta cómo quedó:
     ```bash
     git add -A
     git commit -m "feat: nueva funcionalidad"
     git push origin main
     ```
   - ¡Vercel actualiza tu web en producción automáticamente en 10 segundos!
