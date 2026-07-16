import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  decryptAccountPassword,
  encryptAccountPassword,
} from "@/features/accounts/server/credential-encryption";

const TEST_PASSWORD = "external-account-password";
const TEST_PASSPHRASE = "a memorable encryption passphrase";

test("encrypted account passwords round-trip", async () => {
  const accountId = randomUUID();
  const encryptedCredential = await encryptAccountPassword({
    accountId,
    password: TEST_PASSWORD,
    passphrase: TEST_PASSPHRASE,
  });

  const decryptedPassword = await decryptAccountPassword({
    accountId,
    passphrase: TEST_PASSPHRASE,
    ...encryptedCredential,
  });

  assert.equal(decryptedPassword, TEST_PASSWORD);
});

test("encryption uses a unique salt and IV for each account", async () => {
  const [firstCredential, secondCredential] = await Promise.all([
    encryptAccountPassword({
      accountId: randomUUID(),
      password: TEST_PASSWORD,
      passphrase: TEST_PASSPHRASE,
    }),
    encryptAccountPassword({
      accountId: randomUUID(),
      password: TEST_PASSWORD,
      passphrase: TEST_PASSPHRASE,
    }),
  ]);

  assert.notDeepEqual(firstCredential.passwordSalt, secondCredential.passwordSalt);
  assert.notDeepEqual(firstCredential.passwordIv, secondCredential.passwordIv);
});

test("decryption rejects the wrong passphrase", async () => {
  const accountId = randomUUID();
  const encryptedCredential = await encryptAccountPassword({
    accountId,
    password: TEST_PASSWORD,
    passphrase: TEST_PASSPHRASE,
  });

  await assert.rejects(
    decryptAccountPassword({
      accountId,
      passphrase: "a different encryption passphrase",
      ...encryptedCredential,
    }),
  );
});
