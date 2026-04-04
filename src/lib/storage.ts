import { getEnv, type Env } from '../config/env.js';
import { HttpError } from '../shared/errors.js';

export interface StorageService {
  bucket: string;
  uploadEvidence: () => Promise<never>;
}

export const createStorageService = (env: Env = getEnv()): StorageService => {
  return {
    bucket: env.supabaseStorageBucket,
    async uploadEvidence() {
      throw new HttpError('Evidence upload is not implemented yet', 501);
    },
  };
};
