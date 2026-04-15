import { create } from 'zustand';

type User = {
    email: string;
    name: string;
};

type AuthState = {
    token: string | null;
    user: User | null;
    setSession: (token: string, user: User) => void;
    logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    setSession: (token, user) => set({ token, user }),
    logout: () => set({ token: null, user: null })
}));
