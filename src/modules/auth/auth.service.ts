import { createAccessToken, createRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { hashPassword, verifyPassword } from '../../utils/password';
import { parseExpiryToSeconds, redisService } from '../../utils/redis';
import { env } from '../../config/env';
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

    // Simpan refresh token ke Redis (whitelist session) dengan TTL otomatis
    await redisService.storeRefreshToken(
      refreshToken.jti,
      user.id,
      parseExpiryToSeconds(env.REFRESH_TOKEN_EXPIRES_IN),
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
    };
  },

  /** Rotasi refresh token: verifikasi token lama di Redis, lalu terbitkan token baru */
  async refresh(refreshToken: string) {
    let payload;
    try {
      const verified = await verifyRefreshToken(refreshToken);
      payload = verified.payload;
    } catch {
      throw new Error('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
      throw new Error('Invalid refresh token');
    }

    // Refresh token harus terdaftar di Redis (belum expired / belum di-revoke)
    const userId = await redisService.getRefreshToken(payload.jti);
    if (!userId || userId !== payload.sub) {
      throw new Error('Refresh token revoked or expired');
    }

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Hapus session lama, terbitkan pasangan token baru
    await redisService.deleteRefreshToken(payload.jti);

    const newAccessToken = await createAccessToken(user.id);
    const newRefreshToken = await createRefreshToken(user.id);

    await redisService.storeRefreshToken(
      newRefreshToken.jti,
      user.id,
      parseExpiryToSeconds(env.REFRESH_TOKEN_EXPIRES_IN),
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      accessToken: newAccessToken.token,
      refreshToken: newRefreshToken.token,
    };
  },

  /** Logout: revoke refresh token di Redis + blacklist access token saat ini */
  async logout(
    userId: string,
    accessTokenJti: string,
    accessTokenExp: number,
    refreshToken?: string,
  ) {
    // Hapus semua refresh token milik user (revoke semua session di device ini)
    if (refreshToken) {
      try {
        const verified = await verifyRefreshToken(refreshToken);
        if (verified.payload.type === 'refresh' && verified.payload.jti) {
          await redisService.deleteRefreshToken(verified.payload.jti);
        }
      } catch {
        // refresh token tidak valid, abaikan
      }
    }

    // Blacklist access token sampai masa berlakunya habis
    await redisService.blacklistAccessToken(
      accessTokenJti,
      accessTokenExp - Math.floor(Date.now() / 1000),
    );

    return { userId };
  },
};
