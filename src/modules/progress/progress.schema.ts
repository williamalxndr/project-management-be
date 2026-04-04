import { z } from 'zod';

export const submitProgressSchema = z.object({
  progress: z.number().int().min(0).max(100),
  note: z.string().min(1),
  imageUrl: z.string().url(),
  gpsLat: z.number(),
  gpsLng: z.number(),
});
