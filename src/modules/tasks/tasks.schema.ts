import { z } from 'zod';

export const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  deadline: z.string().min(1).optional(),
  assignedTo: z.string().uuid(),
});
