import type { UserProfile } from './auth.schema.js';

export interface VerifiedAccessToken {
  userId: string;
  email: string | null;
}

export interface AuthSessionPayload {
  userId: string;
  email: string | null;
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  expiresAt: string;
}

export interface AuthenticatedSessionResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'bearer';
  expiresIn: number;
  expiresAt: string;
  user: UserProfile;
}

export interface SignInWithPasswordInput {
  email: string;
  password: string;
}

export interface LogoutSessionInput {
  accessToken: string;
  refreshToken: string;
}

export type VerifyAccessToken = (token: string) => Promise<VerifiedAccessToken>;
export type GetProfileByUserId = (userId: string) => Promise<UserProfile>;
export type SignInWithPassword = (
  credentials: SignInWithPasswordInput
) => Promise<AuthSessionPayload>;
export type RefreshAuthSession = (refreshToken: string) => Promise<AuthSessionPayload>;
export type LogoutSession = (tokens: LogoutSessionInput) => Promise<void>;

export interface AuthServiceDependencies {
  verifyAccessToken: VerifyAccessToken;
  getProfileByUserId: GetProfileByUserId;
  signInWithPassword: SignInWithPassword;
  refreshAuthSession: RefreshAuthSession;
  logoutSession: LogoutSession;
}

export type AuthDependencyOverrides = Partial<AuthServiceDependencies>;
