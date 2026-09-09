const requiredEnv = (name: string): string => {
  const value = Bun.env[name];
  if (!value) {
    throw new Error('Missing environment variable: ' + name);
  }
  return value;
};

export const env = {
  NODE_ENV: Bun.env.NODE_ENV ?? 'development',
  PORT: Number(Bun.env.PORT ?? 3000),
  DATABASE_URL: requiredEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET: requiredEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requiredEnv('JWT_REFRESH_SECRET'),
  ACCESS_TOKEN_EXPIRES_IN: requiredEnv('ACCESS_TOKEN_EXPIRES_IN'),
  REFRESH_TOKEN_EXPIRES_IN: requiredEnv('REFRESH_TOKEN_EXPIRES_IN'),
};
