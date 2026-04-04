import { HttpError } from '../../shared/errors.js';

export const projectsService = {
  async createPlaceholder(): Promise<never> {
    throw new HttpError('Projects module is scaffold-only in this pass', 501);
  },
};
