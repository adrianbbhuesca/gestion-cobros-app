export type Role = 'admin' | 'user';

export interface DriveConfig {
  rootId: string;
  cobrosId: string;
  ingresosId: string;
  sheetId: string;
}

export interface UserSettings {
  diferencias: boolean;
  alertasFecha: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  approved: boolean;
  blocked: boolean;
  notificationsEnabled: boolean;
  notificationSettings: UserSettings;
  drive?: DriveConfig;
  photoURL?: string;
  fcmToken?: string;
}

export interface RecordData {
  id?: string;
  fecha: string; // ISO YYYY-MM-DD
  cobrado: number;
  ingresado: number;
  diferencia: number;
  observaciones: string;
  userId: string;
  userName: string;
  imageUrl?: string;
  fileId?: string;
  type: 'cobro' | 'ingreso';
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export interface SystemLog {
  id: string;
  action: string;
  userId: string;
  details: string;
  timestamp: string;
}