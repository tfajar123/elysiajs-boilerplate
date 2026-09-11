import Elysia from 'elysia';
import { authController } from './auth,controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { loginBody, logoutBody, refreshTokenBody, registerBody } from './auth.validation';

export const authRoutes = new Elysia({
  prefix: '/auth',
})
  .post('/register', authController.register, { body: registerBody })
  .post('/login', authController.login, { body: loginBody })
  .post('/refresh', authController.refresh, { body: refreshTokenBody })
  // Route di bawah ini butuh Bearer access token
  .use(authMiddleware)
  .post('/logout', authController.logout, { body: logoutBody });
