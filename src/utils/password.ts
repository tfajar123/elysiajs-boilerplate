import argon2 from 'argon2';

export const hashPassword = async (passwword: string) => {
  return argon2.hash(passwword);
};

export const verifyPassword = async (password: string, hash: string) => {
  return argon2.verify(hash, password);
};
