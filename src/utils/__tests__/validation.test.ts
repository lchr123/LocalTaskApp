/**
 * Unit Tests for Validation Schemas
 *
 * Tests Zod validation schemas for auth-related forms.
 *
 * Validates:
 * - Requirement 1.3: Phone number format (international, country code, max 15 digits),
 *   email format (standard with @ and valid domain), password security policy
 * - Requirement 1.6: Password requirements: min 8 chars, uppercase, lowercase, number, special char
 */

import { registerFormSchema, loginFormSchema, verificationCodeSchema, resetPasswordSchema } from '../validation';

describe('registerFormSchema', () => {
  describe('phone validation (Req 1.3)', () => {
    it('accepts valid international phone numbers with country code', () => {
      const validPhones = [
        '+8613800138000',   // China
        '+81901234567',     // Japan
        '+14155552671',     // US
        '+447911123456',    // UK
        '+1234567890',      // Generic
      ];

      for (const phone of validPhones) {
        const result = registerFormSchema.safeParse({
          phone,
          email: 'test@example.com',
          password: 'Test1234!',
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects phone numbers without country code (+)', () => {
      const result = registerFormSchema.safeParse({
        phone: '13800138000',
        email: 'test@example.com',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone numbers exceeding 15 digits', () => {
      const result = registerFormSchema.safeParse({
        phone: '+1234567890123456', // 16 digits after +
        email: 'test@example.com',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects phone numbers starting with +0', () => {
      const result = registerFormSchema.safeParse({
        phone: '+0123456789',
        email: 'test@example.com',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty phone number', () => {
      const result = registerFormSchema.safeParse({
        phone: '',
        email: 'test@example.com',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('email validation (Req 1.3)', () => {
    it('accepts valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'user.name@domain.co.jp',
        'user+tag@example.org',
        'firstname.lastname@company.com',
      ];

      for (const email of validEmails) {
        const result = registerFormSchema.safeParse({
          phone: '+8613800138000',
          email,
          password: 'Test1234!',
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects email without @ symbol', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'userexample.com',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects email without valid domain', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'user@',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty email', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: '',
        password: 'Test1234!',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('password validation (Req 1.3, 1.6)', () => {
    it('accepts password meeting all requirements', () => {
      const validPasswords = [
        'Test1234!',
        'MyP@ssw0rd',
        'Str0ng!Pass',
        'Ab1!defgh',
      ];

      for (const password of validPasswords) {
        const result = registerFormSchema.safeParse({
          phone: '+8613800138000',
          email: 'test@example.com',
          password,
        });
        expect(result.success).toBe(true);
      }
    });

    it('rejects password shorter than 8 characters', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'test@example.com',
        password: 'Ab1!xyz',  // 7 chars
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without uppercase letter', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'test@example.com',
        password: 'test1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without lowercase letter', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'test@example.com',
        password: 'TEST1234!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without number', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'test@example.com',
        password: 'TestPass!',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without special character', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'test@example.com',
        password: 'Test1234x',
      });
      expect(result.success).toBe(false);
    });

    it('accepts password with exactly 8 characters meeting all rules', () => {
      const result = registerFormSchema.safeParse({
        phone: '+8613800138000',
        email: 'test@example.com',
        password: 'Ab1!defg',  // exactly 8 chars
      });
      expect(result.success).toBe(true);
    });
  });
});

describe('loginFormSchema', () => {
  it('accepts valid login credentials', () => {
    const result = loginFormSchema.safeParse({
      email: 'user@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = loginFormSchema.safeParse({
      email: '',
      password: 'anypassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = loginFormSchema.safeParse({
      email: 'not-an-email',
      password: 'anypassword',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginFormSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('verificationCodeSchema', () => {
  it('accepts valid 6-digit code', () => {
    const result = verificationCodeSchema.safeParse({ code: '123456' });
    expect(result.success).toBe(true);
  });

  it('rejects code shorter than 6 digits', () => {
    const result = verificationCodeSchema.safeParse({ code: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects code longer than 6 digits', () => {
    const result = verificationCodeSchema.safeParse({ code: '1234567' });
    expect(result.success).toBe(false);
  });

  it('rejects code with non-numeric characters', () => {
    const result = verificationCodeSchema.safeParse({ code: '12345a' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid code and password', () => {
    const result = resetPasswordSchema.safeParse({
      code: '123456',
      newPassword: 'NewPass1!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak new password', () => {
    const result = resetPasswordSchema.safeParse({
      code: '123456',
      newPassword: 'weak',
    });
    expect(result.success).toBe(false);
  });
});
