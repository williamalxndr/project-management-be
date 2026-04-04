import type { Request } from 'express';

export const APP_ROLES = ['ADMIN', 'MANAGER', 'SUPERVISOR', 'WORKER'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  name: string | null;
  role: AppRole;
}

export type AuthenticatedRequest = Request & {
  auth: AuthenticatedUser;
};

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors: Record<string, string> | null;
}

export interface ReadinessReport {
  ok: boolean;
  message: string;
  checks: {
    database: 'ok' | 'error' | 'disabled';
    storage: 'placeholder' | 'disabled';
  };
  errors?: Record<string, string>;
}
