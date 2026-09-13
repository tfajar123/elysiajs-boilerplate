import Elysia from 'elysia';
import { authController } from './auth,controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import {
  loginBody,
  logoutBody,
  refreshTokenBody,
  registerBody,
} from './auth.validation';
import { rateLimit } from 'elysia-rate-limit';

const rateLimited = new Elysia()
  .use(rateLimit({ duration: 60 * 1000, max: 10 }))
  .post('/login', authController.login, { body: loginBody });

export const authRoutes = new Elysia({
  prefix: '/auth',
})
  .post('/register', authController.register, { body: registerBody })
  .use(rateLimited)
  .post('/refresh', authController.refresh, { body: refreshTokenBody })
  .use(authMiddleware)
  .post('/logout', authController.logout, { body: logoutBody });
