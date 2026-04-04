import { z } from 'zod';

import { APP_ROLES } from '../../shared/types.js';

export const appRoleSchema = z.enum(APP_ROLES);

export const authorizationHeaderSchema = z.object({
  authorization: z.string().regex(/^Bearer\s+\S+$/, 'Authorization header must use a Bearer token'),
});

export const profileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().nullable().optional().default(null),
  name: z.string().nullable().optional().default(null),
  role: appRoleSchema,
});

export type UserProfile = z.infer<typeof profileSchema>;
