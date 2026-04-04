import { HttpError } from '../../shared/errors.js';

export const approvalsService = {
  async createPlaceholder(): Promise<never> {
    throw new HttpError('Approvals module is scaffold-only in this pass', 501);
  },
};
