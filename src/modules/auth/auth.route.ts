import Elysia from 'elysia';
import { authController } from './auth,controller';
import { loginBody, registerBody } from './auth.validation';

export const authRoutes = new Elysia({
  prefix: '/auth',
})
  .post('/register', authController.register, { body: registerBody })
  .post('/login', authController.login, { body: loginBody });
