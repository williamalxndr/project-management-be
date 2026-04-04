import { z } from 'zod';

export const reviewTaskSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().min(1).optional(),
});
