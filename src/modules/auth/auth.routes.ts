import { Router, type Request, type RequestHandler, type Response } from 'express';

import { validate } from '../../middleware/validate.js';
import { HttpError } from '../../shared/errors.js';
import { sendSuccess } from '../../shared/http.js';
import type {
  AuthenticatedSessionResponse,
  GetProfileByUserId,
  LogoutSession,
  RefreshAuthSession,
  SignInWithPassword,
} from './auth.types.js';
import {
  loginRequestSchema,
  logoutRequestSchema,
  refreshSessionRequestSchema,
  type LoginRequest,
  type LogoutRequest,
  type RefreshSessionRequest,
} from './auth.schema.js';

export interface AuthRouterDependencies {
  authenticate: RequestHandler;
  signInWithPassword: SignInWithPassword;
  refreshAuthSession: RefreshAuthSession;
  logoutSession: LogoutSession;
  getProfileByUserId: GetProfileByUserId;
}

const buildAuthResponseData = (
  session: {
    accessToken: string;
    refreshToken: string;
    tokenType: 'bearer';
    expiresIn: number;
    expiresAt: string;
  },
  user: AuthenticatedSessionResponse['user']
): AuthenticatedSessionResponse => ({
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  tokenType: session.tokenType,
  expiresIn: session.expiresIn,
  expiresAt: session.expiresAt,
  user,
});

export const buildAuthRouter = ({
  authenticate,
  signInWithPassword,
  refreshAuthSession,
  logoutSession,
  getProfileByUserId,
}: AuthRouterDependencies): Router => {
  const router = Router();

  router.post(
    '/login',
    validate(loginRequestSchema),
    async (request: Request, response: Response) => {
      const { email, password } = request.body as LoginRequest;
      const session = await signInWithPassword({ email, password });
      const profile = await getProfileByUserId(session.userId);

      return sendSuccess(
        response,
        'Authenticated session created',
        buildAuthResponseData(session, profile)
      );
    }
  );

  router.post(
    '/refresh',
    validate(refreshSessionRequestSchema),
    async (request: Request, response: Response) => {
      const { refreshToken } = request.body as RefreshSessionRequest;
      const session = await refreshAuthSession(refreshToken);
      const profile = await getProfileByUserId(session.userId);

      return sendSuccess(
        response,
        'Authenticated session refreshed',
        buildAuthResponseData(session, profile)
      );
    }
  );

  router.post(
    '/logout',
    validate(logoutRequestSchema),
    async (request: Request, response: Response) => {
      const { accessToken, refreshToken } = request.body as LogoutRequest;

      await logoutSession({
        accessToken,
        refreshToken,
      });

      return sendSuccess(response, 'Authenticated session revoked', {
        signedOut: true,
      });
    }
  );

  router.get('/me', authenticate, (request: Request, response: Response) => {
    if (!request.auth) {
      throw new HttpError('Authentication required', 401);
    }

    return sendSuccess(response, 'Authenticated user retrieved', request.auth);
  });

  return router;
};
