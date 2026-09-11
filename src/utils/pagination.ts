import { t } from 'elysia';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta extends PaginationParams {
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Reusable TypeBox properties for pagination query params.
 * Spread it into a route query schema, e.g:
 *
 *   export const listUsersQuery = t.Object({ ...paginationQuery });
 */
export const paginationQuery = {
  page: t.Optional(
    t.Numeric({
      minimum: 1,
      default: DEFAULT_PAGE,
      description: 'Page number (starts from 1)',
    }),
  ),
  limit: t.Optional(
    t.Numeric({
      minimum: 1,
      maximum: MAX_LIMIT,
      default: DEFAULT_LIMIT,
      description: 'Number of items per page',
    }),
  ),
};

/**
 * Parse & normalize pagination query params into Drizzle-ready params.
 * Invalid or missing values fall back to defaults; limit is clamped to MAX_LIMIT.
 */
export const parsePagination = (query: {
  page?: number;
  limit?: number;
}): PaginationParams => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(
    Math.max(Number(query.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

/** Build pagination metadata from the total item count */
export const buildPaginationMeta = (
  totalItems: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && totalPages > 0,
  };
};

/** Wrap a page of items + the total item count into the standard paginated payload */
export const paginate = <T>(
  items: T[],
  totalItems: number,
  params: PaginationParams,
): PaginatedResult<T> => ({
  items,
  pagination: buildPaginationMeta(totalItems, params.page, params.limit),
});
