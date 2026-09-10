import Elysia from 'elysia';
import { verifyAccessToken } from '../utils/jwt';

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
      if (!payload.sub) {
        throw new Error('Invalid token');
      }

      return {
        userId: payload.sub,
      };
    } catch {
      throw new Error('Invalid token');
    }
  },
);
