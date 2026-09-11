import Elysia from 'elysia';
import { verifyAccessToken } from '../utils/jwt';
import { redisService } from '../utils/redis';

export const authMiddleware = new Elysia().derive(
  { as: 'scoped' },
  async ({ headers }) => {
    const authorization = headers.authorization;

    if (!authorization) {
      throw new Error('Authorization header required');
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new Error('Invalid authorization header');
    }

    try {
      const { payload } = await verifyAccessToken(token);
      if (!payload.sub || !payload.jti) {
        throw new Error('Invalid token');
      }

      // Cek Redis: apakah token sudah di-revoke (logout)?
      const isBlacklisted = await redisService.isAccessTokenBlacklisted(
        payload.jti,
      );
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      return {
        userId: payload.sub,
      };
    } catch {
      throw new Error('Invalid token');
    }
  },
);
