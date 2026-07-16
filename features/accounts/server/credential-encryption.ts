import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import { argon2id, hash } from "argon2";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const KEY_DERIVATION_ALGORITHM = "argon2id";
const ENCRYPTION_VERSION = 1;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ARGON2_MEMORY_COST_KIB = 19_456;
const ARGON2_TIME_COST = 2;
const ARGON2_PARALLELISM = 1;

type EncryptCredentialInput = {
  accountId: string;
  password: string;
  passphrase: string;
};

export type EncryptedCredential = {
  passwordCiphertext: Buffer;
  passwordSalt: Buffer;
  passwordIv: Buffer;
  passwordAuthTag: Buffer;
  encryptionVersion: number;
  encryptionAlgorithm: typeof ENCRYPTION_ALGORITHM;
  keyDerivationAlgorithm: typeof KEY_DERIVATION_ALGORITHM;
  argon2MemoryCost: number;
  argon2TimeCost: number;
  argon2Parallelism: number;
};

type DecryptCredentialInput = EncryptedCredential & {
  accountId: string;
  passphrase: string;
};

function getAuthenticatedData(accountId: string, version: number) {
  return Buffer.from(
    `studenthub:tracked-account:${accountId}:password:v${version}`,
    "utf8",
  );
}

async function deriveEncryptionKey(
  passphrase: string,
  salt: Buffer,
  parameters: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  },
) {
  return hash(passphrase.normalize("NFC"), {
    type: argon2id,
    raw: true,
    salt,
    hashLength: KEY_LENGTH_BYTES,
    memoryCost: parameters.memoryCost,
    timeCost: parameters.timeCost,
    parallelism: parameters.parallelism,
  });
}

export async function encryptAccountPassword({
  accountId,
  password,
  passphrase,
}: EncryptCredentialInput): Promise<EncryptedCredential> {
  const passwordSalt = randomBytes(SALT_LENGTH_BYTES);
  const passwordIv = randomBytes(IV_LENGTH_BYTES);
  const encryptionKey = await deriveEncryptionKey(passphrase, passwordSalt, {
    memoryCost: ARGON2_MEMORY_COST_KIB,
    timeCost: ARGON2_TIME_COST,
    parallelism: ARGON2_PARALLELISM,
  });

  try {
    const cipher = createCipheriv(
      ENCRYPTION_ALGORITHM,
      encryptionKey,
      passwordIv,
      { authTagLength: AUTH_TAG_LENGTH_BYTES },
    );
    cipher.setAAD(
      getAuthenticatedData(accountId, ENCRYPTION_VERSION),
    );
    const passwordCiphertext = Buffer.concat([
      cipher.update(password, "utf8"),
      cipher.final(),
    ]);

    return {
      passwordCiphertext,
      passwordSalt,
      passwordIv,
      passwordAuthTag: cipher.getAuthTag(),
      encryptionVersion: ENCRYPTION_VERSION,
      encryptionAlgorithm: ENCRYPTION_ALGORITHM,
      keyDerivationAlgorithm: KEY_DERIVATION_ALGORITHM,
      argon2MemoryCost: ARGON2_MEMORY_COST_KIB,
      argon2TimeCost: ARGON2_TIME_COST,
      argon2Parallelism: ARGON2_PARALLELISM,
    };
  } finally {
    encryptionKey.fill(0);
  }
}

export async function decryptAccountPassword({
  accountId,
  passphrase,
  passwordCiphertext,
  passwordSalt,
  passwordIv,
  passwordAuthTag,
  encryptionVersion,
  encryptionAlgorithm,
  keyDerivationAlgorithm,
  argon2MemoryCost,
  argon2TimeCost,
  argon2Parallelism,
}: DecryptCredentialInput) {
  if (
    encryptionVersion !== ENCRYPTION_VERSION ||
    encryptionAlgorithm !== ENCRYPTION_ALGORITHM ||
    keyDerivationAlgorithm !== KEY_DERIVATION_ALGORITHM
  ) {
    throw new Error("Unsupported credential encryption format.");
  }

  const encryptionKey = await deriveEncryptionKey(
    passphrase,
    passwordSalt,
    {
      memoryCost: argon2MemoryCost,
      timeCost: argon2TimeCost,
      parallelism: argon2Parallelism,
    },
  );

  try {
    const decipher = createDecipheriv(
      encryptionAlgorithm,
      encryptionKey,
      passwordIv,
      { authTagLength: AUTH_TAG_LENGTH_BYTES },
    );
    decipher.setAAD(
      getAuthenticatedData(accountId, encryptionVersion),
    );
    decipher.setAuthTag(passwordAuthTag);

    return Buffer.concat([
      decipher.update(passwordCiphertext),
      decipher.final(),
    ]).toString("utf8");
  } finally {
    encryptionKey.fill(0);
  }
}
