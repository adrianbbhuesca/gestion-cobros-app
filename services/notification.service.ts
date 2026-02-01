import { getToken } from 'firebase/messaging';
import { messaging, db } from './firebase';
import { doc, addDoc, collection, setDoc } from 'firebase/firestore';
import { UserProfile } from '../types';

// Workaround for import.meta.env type issue
const env = (import.meta as any).env;

export const requestNotificationPermission = async (user: UserProfile) => {
  try {
    const msg = await messaging();
    if (!msg) {
        console.log("Messaging (FCM) no soportado en este navegador/contexto.");
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const vapidKey = env.VITE_VAPID_KEY;
      
      if (!vapidKey) {
        console.error("VITE_VAPID_KEY no configurada en .env");
        return;
      }

      const token = await getToken(msg, { vapidKey });
      
      if (token && user.fcmToken !== token) {
        await setDoc(doc(db, 'users', user.uid), {
          fcmToken: token,
          notificationsEnabled: true
        }, { merge: true });
        
        console.log("FCM Token sincronizado correctamente.");
      }
    } else {
        console.warn("Permiso de notificaciones denegado por el usuario.");
    }
  } catch (error) {
    console.error('Error en requestNotificationPermission:', error);
  }
};

export const createLocalNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  try {
    await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        type
    });
  } catch (e) {
      console.error("Fallo al crear notificación local en Firestore", e);
  }
};

export const createSystemLog = async (userId: string, action: string, details: string) => {
    try {
        await addDoc(collection(db, 'system_logs'), {
            userId,
            action,
            details,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.warn("Log write failed", e);
    }
};