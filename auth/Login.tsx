import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUserStore } from '../store/user.store';
import { UserProfile } from '../types';

export const Login: React.FC = () => {
  const { setAccessToken } = useUserStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        setAccessToken(token);
      }

      const user = result.user;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Crear usuario por defecto
        const newUser: UserProfile = {
          uid: user.uid,
          email: user.email!,
          displayName: user.displayName || 'Usuario',
          role: 'user',
          approved: false,
          blocked: false,
          photoURL: user.photoURL || undefined,
          notificationsEnabled: true,
          notificationSettings: {
            diferencias: true,
            alertasFecha: true
          }
        };
        await setDoc(userRef, newUser);
      }
    } catch (err: any) {
      console.error("Login Error Full Object:", err);
      
      let msg = 'Error iniciando sesión.';
      if (err.code === 'auth/popup-closed-by-user') {
          msg = 'Has cerrado la ventana de inicio de sesión antes de terminar.';
      } else if (err.code === 'auth/invalid-api-key') {
          msg = 'La API Key de Firebase es inválida. Revisa tu archivo .env';
      } else if (err.code === 'auth/network-request-failed') {
          msg = 'Error de conexión. Verifica tu internet.';
      } else if (err.code === 'auth/unauthorized-domain') {
          msg = 'Dominio no autorizado. Agrega "localhost" en Firebase Console -> Authentication -> Settings -> Authorized Domains.';
      } else {
          msg = `Error (${err.code || 'Desconocido'}): ${err.message}`;
      }
      
      setError(msg);
    } finally {
        setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Bienvenido</h1>
        <p className="text-gray-500 mb-8">Gestión de Cobros e Ingresos</p>
        
        {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 text-sm text-left shadow-sm">
                <strong>Ocurrió un problema:</strong>
                <p className="mt-1">{error}</p>
            </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className={`w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-sm transition-all 
            ${isLoggingIn ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50 hover:shadow-md active:scale-[0.98]'}`}
        >
            {isLoggingIn ? (
                <>
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    Conectando con Google...
                </>
            ) : (
                <>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Continuar con Google
                </>
            )}
        </button>
      </div>
    </div>
  );
};