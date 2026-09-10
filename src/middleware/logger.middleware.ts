import Elysia from 'elysia';
import { logger } from '../utils/logger';

export const loggerMiddleware = () =>
  new Elysia({ name: 'logger-middleware' })
    .derive(() => ({
      requestStartTime: Date.now(),
    }))
    .onRequest(({ request }) => {
      logger.info(
        {
          method: request.method,
          url: request.url,
        },
        'Incoming request',
      );
    })
    .onAfterResponse(({ request, set, requestStartTime }) => {
      const duration = Date.now() - requestStartTime;

      logger.info(
        {
          method: request.method,
          url: request.url,
          statusCode: set.status,
          duration: `${duration}ms`,
        },
        'Request completed',
      );
    })
    .onError(({ request, error, set, requestStartTime = 0 }) => {
      const duration = Date.now() - requestStartTime;

      logger.error(
        {
          method: request.method,
          url: request.url,
          statusCode: set.status,
          duration: `${duration}ms`,
          err: error,
        },
        'Request failed',
      );
    })
    .as('global');
