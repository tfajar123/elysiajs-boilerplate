import Elysia from 'elysia';
import { authMiddleware } from '../../middleware/auth.middleware';
import { usersController } from './users.controller';
import { listUsersQuery } from './users.validation';

export const usersRoutes = new Elysia({
  prefix: '/users',
})
  .use(authMiddleware)
  .get('/', usersController.list, { query: listUsersQuery })
  .get('/me', usersController.getProfile);
