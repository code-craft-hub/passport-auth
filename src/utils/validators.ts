import { ValidationError } from './errors';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8;
};

export const validateName = (name: string): boolean => {
  return name.length >= 2 && name.length <= 50;
};

export const validateReferralCode = (code: string): boolean => {
  return code.length === 8 && /^[A-Za-z0-9]+$/.test(code);
};

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  referredBy?: string;
}

export const validateRegisterInput = (input: RegisterInput): void => {
  const errors: Record<string, string> = {};

  if (!input.email || !validateEmail(input.email)) {
    errors.email = 'Valid email is required';
  }

  if (!input.password || !validatePassword(input.password)) {
    errors.password = 'Password must be at least 8 characters';
  }

  if (!input.firstName || !validateName(input.firstName)) {
    errors.firstName = 'First name must be between 2 and 50 characters';
  }

  if (!input.lastName || !validateName(input.lastName)) {
    errors.lastName = 'Last name must be between 2 and 50 characters';
  }

  if (input.referredBy && !validateReferralCode(input.referredBy)) {
    errors.referredBy = 'Invalid referral code format';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
};

interface LoginInput {
  email: string;
  password: string;
}

export const validateLoginInput = (input: LoginInput): void => {
  const errors: Record<string, string> = {};

  if (!input.email || !validateEmail(input.email)) {
    errors.email = 'Valid email is required';
  }

  if (!input.password) {
    errors.password = 'Password is required';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }
};