import { parsePagination, paginate } from '../../utils/pagination';
import { usersRepository } from './users.repository';

export const usersServices = {
  async getProfile(id: string) {
    const result = await usersRepository.findUserById(id);

    if (!result) {
      throw new Error('User not found');
    }
    return result;
  },

  async listUsers(query: { page?: number; limit?: number }) {
    const params = parsePagination(query);
    const { items, totalItems } = await usersRepository.findUsers(params);

    return paginate(items, totalItems, params);
  },
};
