import { describe, expect, it } from 'bun:test';
import {
  buildPaginationMeta,
  paginate,
  parsePagination,
} from './pagination';

describe('parsePagination', () => {
  it('uses default page and limit when params are missing', () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it('computes the offset for the requested page', () => {
    expect(parsePagination({ page: 3, limit: 5 })).toEqual({
      page: 3,
      limit: 5,
      offset: 10,
    });
  });

  it('falls back to defaults for missing or invalid values', () => {
    expect(parsePagination({ page: 0, limit: 0 })).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
    });

    expect(parsePagination({ page: -3, limit: -1 })).toEqual({
      page: 1,
      limit: 1,
      offset: 0,
    });

    expect(
      parsePagination({ page: Number.NaN, limit: Number.NaN }),
    ).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it('clamps limit to 100', () => {
    expect(parsePagination({ page: 1, limit: 5000 })).toEqual({
      page: 1,
      limit: 100,
      offset: 0,
    });
  });
});

describe('buildPaginationMeta', () => {
  it('returns zeroed meta when there are no items', () => {
    expect(buildPaginationMeta(0, 1, 10)).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });

  it('flags prev/next pages correctly on a middle page', () => {
    expect(buildPaginationMeta(25, 2, 10)).toMatchObject({
      totalItems: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it('flags the last page', () => {
    const meta = buildPaginationMeta(20, 2, 10);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });
});

describe('paginate', () => {
  it('wraps items and pagination meta', () => {
    const result = paginate(['a', 'b'], 2, { page: 1, limit: 10, offset: 0 });

    expect(result.items).toEqual(['a', 'b']);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
