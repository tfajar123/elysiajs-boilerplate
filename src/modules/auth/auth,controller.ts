import { authServices } from './auth.service';

export const authController = {
  async register({ body }: any) {
    return authServices.register(body.name, body.email, body.password);
  },

  async login({ body }: any) {
    return authServices.login(body.email, body.password);
  },
};
