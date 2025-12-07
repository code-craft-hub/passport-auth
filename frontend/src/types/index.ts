export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referredBy?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ReferralStats {
  referralCode: string;
  referralCount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}