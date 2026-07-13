import { expect, test } from 'vitest';

import { hashPassword, verifyPassword } from './password';

test('hashes and verifies a password without retaining plaintext', async () => {
  const password = 'local-test-password';
  const passwordHash = await hashPassword(password);

  expect(passwordHash).not.toBe(password);
  await expect(verifyPassword(password, passwordHash)).resolves.toBe(true);
  await expect(verifyPassword('incorrect-password', passwordHash)).resolves.toBe(
    false,
  );
});
