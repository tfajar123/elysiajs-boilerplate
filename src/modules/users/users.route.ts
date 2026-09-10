import Elysia from 'elysia';
import { authMiddleware } from '../../middleware/auth.middleware';
import { usersController } from './users.controller';

export const usersRoutes = new Elysia({
  prefix: '/users',
})
  .use(authMiddleware)
  .get('/me', usersController.getProfile);
