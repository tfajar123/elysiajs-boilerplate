import { count, eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';
import type { PaginationParams } from '../../utils/pagination';

export const usersRepository = {
  async findUserById(id: string) {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  },

  async findUsers(params: PaginationParams) {
    const [items, countResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt)
        .limit(params.limit)
        .offset(params.offset),
      db.select({ value: count() }).from(users),
    ]);

    return { items, totalItems: countResult[0]?.value ?? 0 };
  },
};
