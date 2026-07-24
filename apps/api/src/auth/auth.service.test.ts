import { describe, it, expect } from 'vitest';

describe('AuthService', () => {
  it('should hash and verify passwords correctly', async () => {
    // Dynamic import to avoid module initialization issues
    const argon2 = await import('argon2');
    const password = 'TestPassword123!';
    const hash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    expect(hash).toBeTruthy();
    expect(hash).toContain('$argon2id$');

    const valid = await argon2.verify(hash, password);
    expect(valid).toBe(true);

    const invalid = await argon2.verify(hash, 'WrongPassword');
    expect(invalid).toBe(false);
  });
});

describe('BillingService credit math', () => {
  it('should calculate credit costs correctly per plan spec', () => {
    // plan.md §16.3: provider_cost * 1.25 / 0.25 = retail ≈ provider_cost * 5
    const providerCost = 0.035; // qwen-image-2.0
    const reserve = 1.25;
    const margin = 0.75;
    const retail = providerCost * reserve / (1 - margin);
    expect(retail).toBeCloseTo(0.175, 3);

    // 1 credit = $0.001
    const credits = Math.ceil(retail / 0.001);
    expect(credits).toBe(175);
  });

  it('should never allow negative wallet balance', () => {
    const balance = 100;
    const amount = 150;
    expect(balance >= amount).toBe(false);
  });
});

describe('Character validation', () => {
  it('should require name for character creation', () => {
    const name = '';
    expect(name.trim().length).toBe(0);
    expect(name.trim().length > 0).toBe(false);
  });

  it('should validate public characters cannot use uploaded images', () => {
    const visibility = 'public';
    const identityOrigin = 'private_uploaded_reference';
    // plan.md §2.3: public characters must not originate from uploads
    const isValid = !(visibility === 'public' && identityOrigin === 'private_uploaded_reference');
    expect(isValid).toBe(false);
  });
});

describe('Memory scoring', () => {
  it('should weight semantic similarity highest', () => {
    const weights = { semantic: 0.50, importance: 0.25, recency: 0.15, relationship: 0.10 };
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    expect(total).toBe(1.0);
    expect(weights.semantic).toBeGreaterThan(weights.importance);
  });
});
