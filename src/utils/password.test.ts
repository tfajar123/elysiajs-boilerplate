import { describe, expect, it } from 'bun:test';
import { hashPassword, verifyPassword } from './password';

describe('password utils', () => {
  it('hashes a password and verifies the correct one', async () => {
    const hashed = await hashPassword('password123');

    expect(hashed).not.toBe('password123');
    expect(await verifyPassword('password123', hashed)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hashed = await hashPassword('password123');

    expect(await verifyPassword('wrong-password', hashed)).toBe(false);
  });

  it('produces a different hash for the same password (unique salt)', async () => {
    const first = await hashPassword('password123');
    const second = await hashPassword('password123');

    expect(first).not.toBe(second);
  });
});
