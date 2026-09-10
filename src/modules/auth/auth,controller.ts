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
};
