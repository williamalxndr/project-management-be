import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1).optional(),
  deadline: z.string().min(1).optional(),
});
