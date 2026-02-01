import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider, db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useUserStore } from '../store/user.store';
import { UserProfile } from '../types';

export const Login: React.FC = () => {
  const { setAccessToken } = useUserStore();
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
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
      console.error(err);
      setError('Error iniciando sesión. Intenta nuevamente.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">Bienvenido</h1>
        <p className="text-gray-500 mb-8">Gestión de Cobros e Ingresos</p>
        
        {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">
                {error}
            </div>
        )}

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg shadow-sm transition-all"
        >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Continuar con Google
        </button>
      </div>
    </div>
  );
};