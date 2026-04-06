import { z } from 'zod';

import { APP_ROLES } from '../../shared/types.js';

export const appRoleSchema = z.enum(APP_ROLES);

export const authorizationHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+\S+$/, 'Authorization header must use a Bearer token'),
});

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSessionRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutRequestSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional().default(null),
  name: z.string().nullable().optional().default(null),
  role: appRoleSchema,
});

export const rawProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional().default(null),
  name: z.string().nullable().optional().default(null),
  role: z.string(),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type RefreshSessionRequest = z.infer<typeof refreshSessionRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type UserProfile = z.infer<typeof profileSchema>;
export type RawUserProfile = z.infer<typeof rawProfileSchema>;
