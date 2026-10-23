// OTRO - Firebase Configuration & Firestore Setup
const firebaseConfig = {
  apiKey: "AIzaSyAAVeazRylczUaDEfUc5QUT5Lzk45nSjhw",
  authDomain: "otro-fbf44.firebaseapp.com",
  projectId: "otro-fbf44",
  storageBucket: "otro-fbf44.firebasestorage.app",
  messagingSenderId: "912649593061",
  appId: "1:912649593061:web:c737b31e9715d8fc12b40c"
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

    // Enable offline persistence in IndexedDB for PWA support
    db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn("Firebase Persistence: Múltiples pestañas abiertas.");
      } else if (err.code === 'unimplemented') {
        // The current browser does not support persistence.
        console.warn("Firebase Persistence: Navegador sin soporte de IndexedDB.");
      }
    });

    isFirebaseReady = true;
    console.log("🔥 Firebase Firestore conectado exitosamente.");
  } else {
    console.warn("Firebase SDK no detectado; utilizando almacenamiento local.");
  }
} catch (error) {
  console.warn("No se pudo inicializar Firebase:", error);
}
