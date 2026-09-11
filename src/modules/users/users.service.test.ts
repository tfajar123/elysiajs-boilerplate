import { beforeEach, describe, expect, it, mock } from 'bun:test';

// Mock the repository boundary (DB access); service + pagination utils stay REAL.
const findUserById = mock(async (_id: string): Promise<any> => undefined);
const findUsers = mock(
  async (_params: any): Promise<any> => ({ items: [], totalItems: 0 }),
);

mock.module('./users.repository', () => ({
  usersRepository: { findUserById, findUsers },
}));

const { usersServices } = await import('./users.service');

beforeEach(() => {
  findUserById.mockClear();
  findUsers.mockClear();
});

describe('usersServices.getProfile', () => {
  it('returns the user profile', async () => {
    findUserById.mockImplementation(async () => ({
      id: 'user-1',
      name: 'John',
      email: 'john@test.com',
    }));

    const result = await usersServices.getProfile('user-1');

    expect(result).toEqual({
      id: 'user-1',
      name: 'John',
      email: 'john@test.com',
    } as any);
  });

  it('throws when the user does not exist', async () => {
    findUserById.mockImplementation(async () => undefined);

    expect(usersServices.getProfile('missing')).rejects.toThrow(
      'User not found',
    );
  });
});

describe('usersServices.listUsers', () => {
  it('passes parsed pagination params to the repository and returns pagination meta', async () => {
    findUsers.mockImplementation(async () => ({
      items: [{ id: 'u1', name: 'John' }],
      totalItems: 11,
    }));

    const result = await usersServices.listUsers({ page: 2, limit: 5 });

    expect(findUsers).toHaveBeenCalledTimes(1);
    expect(findUsers.mock.calls[0][0]).toEqual({
      page: 2,
      limit: 5,
      offset: 5,
    });

    expect(result.items).toEqual([{ id: 'u1', name: 'John' }] as any);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      offset: 5,
      totalItems: 11,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });

  it('defaults to the first page with the default limit when no query is provided', async () => {
    await usersServices.listUsers({});

    expect(findUsers.mock.calls[0][0]).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
    });
  });
});
