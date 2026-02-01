import { create } from 'zustand';
import { AuthState, UserProfile } from '../types';

export const useUserStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  loading: true,
  setUser: (user: UserProfile | null) => set({ user }),
  setAccessToken: (token: string | null) => set({ accessToken: token }),
  setLoading: (loading: boolean) => set({ loading }),
}));