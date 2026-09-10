import { usersRepository } from './users.repository';

export const usersServices = {
  async getProfile(id: string) {
    const result = await usersRepository.findUserById(id);

    if (!result) {
      throw new Error('User not found');
    }
    return result;
  },
};
