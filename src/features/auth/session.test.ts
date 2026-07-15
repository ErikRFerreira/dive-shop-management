import { expect, test } from 'vitest';

import { exposeUserIdInSession, persistUserIdInJwt } from './session';

test('persists only the authenticated user ID in the JWT', () => {
  const token = persistUserIdInJwt(
    { name: 'Admin User', email: 'admin@example.test' },
    {
      id: 'user-1',
      name: 'Admin User',
      email: 'admin@example.test',
      role: 'ADMIN',
      isActive: true,
      passwordHash: 'secret-hash',
    } as never,
  );

  expect(token.userId).toBe('user-1');
  expect(token).not.toHaveProperty('role');
  expect(token).not.toHaveProperty('isActive');
  expect(token).not.toHaveProperty('passwordHash');
});

test('exposes the persisted user ID through the session', () => {
  const session = exposeUserIdInSession(
    {
      user: {
        id: '',
        name: 'Admin User',
        email: 'admin@example.test',
      },
      expires: '2099-01-01T00:00:00.000Z',
    },
    { userId: 'user-1' },
  );

  expect(session.user.id).toBe('user-1');
  expect(session.user).not.toHaveProperty('role');
  expect(session.user).not.toHaveProperty('isActive');
  expect(session.user).not.toHaveProperty('passwordHash');
});
