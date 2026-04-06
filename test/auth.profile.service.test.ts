import { describe, expect, it, vi } from 'vitest';

import { LEGACY_PROFILE_ROLE_HINT, LEGACY_PROFILE_ROLE_MESSAGE } from '../src/modules/auth/auth.errors.js';
import { createGetProfileByUserId } from '../src/modules/auth/auth.profile.service.js';
import { HttpError } from '../src/shared/errors.js';

const createProfilesClient = (result: { data: unknown; error: { message: string } | null }) =>
  ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue(result),
        }),
      }),
    }),
  }) as any;

describe('createGetProfileByUserId', () => {
  it('returns a parsed profile for supported roles', async () => {
    const getProfileByUserId = createGetProfileByUserId(
      createProfilesClient({
        data: {
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'ADMIN',
        },
        error: null,
      })
    );

    await expect(getProfileByUserId('fe19d71b-07d6-44d8-ad88-e398f7f7061f')).resolves.toEqual({
      id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    });
  });

  it('returns a dedicated 503 error for legacy manager profiles', async () => {
    const getProfileByUserId = createGetProfileByUserId(
      createProfilesClient({
        data: {
          id: 'fe19d71b-07d6-44d8-ad88-e398f7f7061f',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'MANAGER',
        },
        error: null,
      })
    );

    try {
      await getProfileByUserId('fe19d71b-07d6-44d8-ad88-e398f7f7061f');
      throw new Error('getProfileByUserId did not throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(503);
      expect((error as HttpError).message).toBe(LEGACY_PROFILE_ROLE_MESSAGE);
      expect((error as HttpError).errors).toEqual({
        role: LEGACY_PROFILE_ROLE_HINT,
      });
    }
  });
});
