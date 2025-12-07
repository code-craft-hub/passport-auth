import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { RegisterData, ReferralStats, ApiResponse } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse>) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - handle re-authentication
          const errorMessage = error.response.data?.error;
          if (errorMessage?.includes('revoked')) {
            // Force logout if session was revoked
            await this.handleSessionRevoked();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async getAuthToken(): Promise<string | null> {
    // This will be implemented by Firebase client SDK
    const user = (window as any).firebaseUser;
    if (user) {
      try {
        return await user.getIdToken();
      } catch (error) {
        console.error('Failed to get ID token:', error);
        return null;
      }
    }
    return null;
  }

  private async handleSessionRevoked(): Promise<void> {
    // Clear local auth state and redirect to login
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  // Auth endpoints
  async register(data: RegisterData): Promise<ApiResponse> {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.api.post('/auth/logout');
    return response.data;
  }

  // Referral endpoints
  async getReferralStats(): Promise<ApiResponse<ReferralStats>> {
    const response = await this.api.get('/referral/stats');
    return response.data;
  }

  async getReferralCode(): Promise<ApiResponse<{ referralCode: string }>> {
    const response = await this.api.get('/referral/code');
    return response.data;
  }
}

export const apiService = new ApiService();