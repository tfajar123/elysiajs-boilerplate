import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users } from '../../db/schema';

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
};
