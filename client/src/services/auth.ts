import api from './api';

export interface User {
    id: string;
    email: string;
    name: string;
    color: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export const authService = {
    login: async (email: string, password: string) => {
        const response = await api.post<AuthResponse>('/auth/login', { email, password });
        return response.data;
    },

    register: async (email: string, password: string, name: string) => {
        const response = await api.post<AuthResponse>('/auth/register', { email, password, name });
        return response.data;
    },

    getMe: async () => {
        const response = await api.get<User>('/auth/me');
        return response.data;
    },
};
