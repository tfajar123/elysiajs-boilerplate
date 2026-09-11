import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env';

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export const createAccessToken = async (userId: string) => {
  const jti = crypto.randomUUID();

  const token = await new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_EXPIRES_IN)
    .sign(accessSecret);

  const { payload } = await verifyAccessToken(token);

  return {
    token,
    jti,
    expiresAt: payload.exp ?? 0, // unix detik
  };
};

export const createRefreshToken = async (userId: string) => {
  const jti = crypto.randomUUID();

  const token = await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_TOKEN_EXPIRES_IN)
    .sign(refreshSecret);

  const { payload } = await verifyRefreshToken(token);

  return {
    token,
    jti,
    expiresAt: payload.exp ?? 0, // unix detik
  };
};
export const verifyAccessToken = async (token: string) => {
  return jwtVerify(token, accessSecret);
};

export const verifyRefreshToken = async (token: string) => {
  return jwtVerify(token, refreshSecret);
};
