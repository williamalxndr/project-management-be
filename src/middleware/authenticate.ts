import type { NextFunction, Request, Response } from 'express';

import type { Env } from '../config/env.js';
import { createGetProfileByUserId } from '../modules/auth/auth.profile.service.js';
import { createSupabaseTokenVerifier } from '../modules/auth/auth.token.service.js';
import type { AuthServiceDependencies } from '../modules/auth/auth.types.js';
import { HttpError } from '../shared/errors.js';

export type AuthMiddlewareDependencies = Pick<
  AuthServiceDependencies,
  'verifyAccessToken' | 'getProfileByUserId'
>;

export const createAuthenticate = (
  dependencies: Partial<AuthMiddlewareDependencies> = {},
  env?: Env
) => {
  const verifyAccessToken = dependencies.verifyAccessToken ?? createSupabaseTokenVerifier(env);
  const getProfileByUserId =
    dependencies.getProfileByUserId ?? createGetProfileByUserId(undefined, env);

  return async (request: Request, _response: Response, next: NextFunction): Promise<void> => {
    const authorization = request.headers.authorization;

    if (!authorization) {
      next(new HttpError('Authentication required', 401));
      return;
    }

    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      next(new HttpError('Authentication required', 401));
      return;
    }

    try {
      const verifiedToken = await verifyAccessToken(token);
      const profile = await getProfileByUserId(verifiedToken.userId);

      request.auth = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
      };

      next();
    } catch (error) {
      if (error instanceof HttpError) {
        next(error);
        return;
      }

      next(new HttpError('Invalid or expired access token', 401));
    }
  };
};

export const authenticate = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  const middleware = createAuthenticate();
  await middleware(request, response, next);
};
