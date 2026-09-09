import { createAccessToken, createRefreshToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { authRepository } from './auth.repository';

export const authServices = {
  async register(name: string, email: string, password: string) {
    const hashedPassword = await hashPassword(password);

    const userExists = await authRepository.findUserByEmail(email);
    if (userExists) {
      throw new Error('User already exists');
    }

    const user = await authRepository.createUser(name, email, hashedPassword);

    return user;
  },

  async login(email: string, password: string) {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      throw new Error('Email not found');
    }

    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const accessToken = await createAccessToken(user.id);
    const refreshToken = await createRefreshToken(user.id);

    await authRepository.createRefreshToken(
      user.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  },
};
