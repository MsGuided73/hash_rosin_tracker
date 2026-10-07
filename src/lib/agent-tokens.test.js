import { describe, expect, test } from 'vitest';
import { generateRawToken, sha256Hex } from './agent-tokens.js';

describe('agent tokens', () => {
  test('raw tokens are prefixed, long, and unique', () => {
    const a = generateRawToken();
    const b = generateRawToken();
    expect(a).toMatch(/^hl_[0-9a-f]{48}$/);
    expect(a).not.toBe(b);
  });

  test('sha256Hex matches the hash the database computes', async () => {
    // Known vector: sha256("hello") — the DB side uses digest(p_token,'sha256')
    expect(await sha256Hex('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });
});
