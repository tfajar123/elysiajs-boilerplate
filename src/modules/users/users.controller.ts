import { response } from '../../utils/response';
import { usersServices } from './users.service';

export const usersController = {
  async getProfile({ userId }: { userId: string }) {
    const user = await usersServices.getProfile(userId);
    return response.success(user, 'User fetched successfully');
  },
};
