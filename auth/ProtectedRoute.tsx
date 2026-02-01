import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useUserStore } from '../store/user.store';
import { UserProfile } from '../types';
import { initializeDriveStructure } from '../services/drive.service';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<Props> = ({ children, requireAdmin = false }) => {
  const { user, loading, setUser, setLoading, accessToken } = useUserStore();

  useEffect(() => {
    let unsubDoc: () => void | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // 1. Limpieza crítica: Cancelar listener de Firestore anterior si existe para evitar fugas de memoria
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = undefined;
      }

      if (firebaseUser) {
        // Si no tenemos usuario en estado, activamos loading para evitar parpadeos
        if (!user) setLoading(true);

        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // 2. Suscripción robusta al perfil del usuario
        unsubDoc = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as UserProfile;
            setUser(userData);
            
            // Lógica de auto-reparación: Si está aprobado pero falta Drive, intentar inicializar
            // Verificamos explícitamente accessToken para evitar bucles si el token expiró
            if (userData.approved && !userData.drive && accessToken) {
                try {
                    console.log("Detectado usuario aprobado sin config Drive. Inicializando...");
                    const driveConfig = await initializeDriveStructure(accessToken);
                    
                    // Importación dinámica para romper ciclos de dependencia y optimizar carga
                    const { updateDoc } = await import('firebase/firestore');
                    await updateDoc(userRef, { drive: driveConfig });
                } catch (e) {
                    console.error("Auto-init Drive failed (Non-blocking):", e);
                }
            }
          } else {
             // Caso borde: Autenticado en Firebase Auth pero sin documento en Firestore
             console.error("Integridad de datos: Usuario sin perfil en DB");
             setUser(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error en suscripción de perfil:", error);
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup final al desmontar el componente
    return () => {
      unsubscribeAuth();
      if (unsubDoc) unsubDoc();
    };
  }, [accessToken]); // Dependencia en accessToken para reiniciar lógica si cambia el token (re-login)

  if (loading) {
    return (
        <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-900">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-500 animate-pulse font-medium">Cargando sistema...</p>
            </div>
        </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-red-100 dark:border-red-900">
           <h2 className="text-2xl font-bold text-red-600 mb-2">Acceso Restringido</h2>
           <p className="text-gray-600 dark:text-gray-300 mb-6">Esta sección requiere privilegios de Administrador.</p>
           <button onClick={() => window.history.back()} className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
             &larr; Volver
           </button>
        </div>
      </div>
    );
  }

  if (!user.approved) {
    return (
        <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-yellow-100 dark:border-yellow-900 animate-fade-in-up">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-6">
                    <span className="text-3xl">⏳</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Cuenta en Revisión</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Tu solicitud está pendiente de aprobación por un administrador.</p>
                <button 
                  onClick={() => auth.signOut()} 
                  className="w-full py-2.5 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-gray-800 dark:text-white font-medium transition-colors"
                >
                  Volver al Login
                </button>
            </div>
        </div>
    );
  }

  if (user.blocked) {
    return (
        <div className="h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/10 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-red-200 dark:border-red-800">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Cuenta Suspendida</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">El acceso a tu cuenta ha sido revocado temporalmente.</p>
                <button onClick={() => auth.signOut()} className="text-gray-500 hover:text-gray-700 underline text-sm">Cerrar Sesión</button>
            </div>
        </div>
    );
  }

  return <>{children}</>;
};