import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { refreshTokens, users } from '../../db/schema';

export const authRepository = {
  async findUserByEmail(email: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return result[0];
  },

  async findUserById(id: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return result[0];
  },

  async createUser(name: string, email: string, password: string) {
    const result = await db
      .insert(users)
      .values({
        name,
        email,
        password,
      })
      .returning();

    return result[0];
  },

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    const result = await db
      .insert(refreshTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();

    return result[0];
  },
};
