import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** @param {string} plain */
export async function hashPassword(plain) {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * @param {string} plain
 * @param {string} hash
 */
export async function verifyPassword(plain, hash) {
    return bcrypt.compare(plain, hash);
}
