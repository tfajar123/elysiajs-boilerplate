import { t } from 'elysia';

export const registerBody = t.Object({
  name: t.String({
    minLength: 2,
    maxLength: 100,
  }),

  email: t.String({
    format: 'email',
  }),

  password: t.String({
    minLength: 8,
    maxLength: 255,
  }),
});

export const loginBody = t.Object({
  email: t.String({
    format: 'email',
  }),
  password: t.String({
    minLength: 8,
  }),
});

export const refreshTokenBody = t.Object({
  refreshToken: t.String(),
});

export const logoutBody = t.Object({
  refreshToken: t.Optional(t.String()),
});
