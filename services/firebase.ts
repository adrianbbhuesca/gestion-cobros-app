import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Workaround for import.meta.env type issue
const env = (import.meta as any).env;

// Validación de entorno para evitar errores silenciosos en producción
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(key => !env[key]);
if (missingVars.length > 0) {
  console.error(`Faltan variables de entorno críticas: ${missingVars.join(', ')}`);
}

// VALIDACIÓN CRÍTICA: Detectar si el usuario olvidó cambiar los valores de ejemplo
const placeholderCheck = requiredEnvVars.filter(key => env[key] && (env[key].includes('tu_api_key') || env[key].includes('tu_proyecto')));
if (placeholderCheck.length > 0) {
    const msg = "ERROR FATAL: Parece que sigues usando los valores de ejemplo en el archivo .env (tu_api_key_aqui, etc). Debes poner tus claves reales de Firebase.";
    console.error(msg);
    alert(msg); // Alertar visualmente al usuario
}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Scopes expandidos para Drive y Sheets
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Inicializar Messaging condicionalmente (solo funciona en navegadores soportados)
export const messaging = async () => {
  try {
    const supported = await isSupported();
    if (supported) {
      return getMessaging(app);
    }
    return null;
  } catch (e) {
    console.warn('Messaging not supported/enabled', e);
    return null;
  }
};