import cors from '@elysiajs/cors';
import swagger from '@elysiajs/swagger';
import Elysia from 'elysia';
import { authRoutes } from './modules/auth/auth.route';
import { usersRoutes } from './modules/users/users.route';
import { loggerMiddleware } from './middleware/logger.middleware';

export const app = new Elysia({
  prefix: '/api/v1',
})
  .use(cors())
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Elysia API',
          version: '1.0.0',
        },
      },
    }),
  )
  .get('/', () => ({
    message: 'Server is Healthy',
  }))
  .use(loggerMiddleware())
  .use(authRoutes)
  .use(usersRoutes);
