import { HttpError } from '../../shared/errors.js';

export const tasksService = {
  async createPlaceholder(): Promise<never> {
    throw new HttpError('Tasks module is scaffold-only in this pass', 501);
  },
};
