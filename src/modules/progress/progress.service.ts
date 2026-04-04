import { HttpError } from '../../shared/errors.js';

export const progressService = {
  async createPlaceholder(): Promise<never> {
    throw new HttpError('Progress module is scaffold-only in this pass', 501);
  },
};
