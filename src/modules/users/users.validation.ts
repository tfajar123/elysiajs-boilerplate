import { t } from 'elysia';
import { paginationQuery } from '../../utils/pagination';

export const listUsersQuery = t.Object({
  ...paginationQuery,
});
