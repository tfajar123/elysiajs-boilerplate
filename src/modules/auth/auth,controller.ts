import { verifyAccessToken } from '../../utils/jwt';
import { response } from '../../utils/response';
import { authServices } from './auth.service';

export const authController = {
  async register({ body }: any) {
    const user = await authServices.register(
      body.name,
      body.email,
      body.password,
    );
    return response.created(user, 'User created successfully');
  },

  async login({ body }: any) {
    const user = await authServices.login(body.email, body.password);

    return response.success(user, 'User logged in successfully');
  },

  async refresh({ body }: any) {
    const user = await authServices.refresh(body.refreshToken);

    return response.success(user, 'Token refreshed successfully');
  },

  async logout({ headers, body, userId }: any) {
    const authorization: string = headers.authorization;
    const [, token] = authorization.split(' ');

    // Ambil jti & exp dari access token untuk diblacklist di Redis
    const { payload } = await verifyAccessToken(token);

    if (!payload.jti) {
      throw new Error('Invalid token');
    }

    await authServices.logout(
      userId,
      payload.jti,
      payload.exp ?? 0,
      body.refreshToken,
    );

    return response.success(null, 'Logged out successfully');
  },
};
