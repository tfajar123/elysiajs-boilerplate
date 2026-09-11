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

    // Store the refresh token in Redis (session whitelist) with an automatic TTL
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

  /** Refresh token rotation: verify the old token against Redis, then issue new tokens */
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

    // The refresh token must be registered in Redis (not expired / not revoked)
    const userId = await redisService.getRefreshToken(payload.jti);
    if (!userId || userId !== payload.sub) {
      throw new Error('Refresh token revoked or expired');
    }

    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete the old session, issue a new token pair
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

  /** Logout: revoke the refresh token in Redis + blacklist the current access token */
  async logout(
    userId: string,
    accessTokenJti: string,
    accessTokenExp: number,
    refreshToken?: string,
  ) {
    // Delete all refresh tokens owned by the user (revoke this device's session)
    if (refreshToken) {
      try {
        const verified = await verifyRefreshToken(refreshToken);
        if (verified.payload.type === 'refresh' && verified.payload.jti) {
          await redisService.deleteRefreshToken(verified.payload.jti);
        }
      } catch {
        // invalid refresh token, ignore
      }
    }

    // Blacklist the access token until it expires
    await redisService.blacklistAccessToken(
      accessTokenJti,
      accessTokenExp - Math.floor(Date.now() / 1000),
    );

    return { userId };
  },
};
