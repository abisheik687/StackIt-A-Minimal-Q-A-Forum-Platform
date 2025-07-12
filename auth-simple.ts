import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Password hashing utilities
export class PasswordUtils {
  static async hash(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(password, salt);
  }

  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  static validateStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// JWT token utilities
export class TokenUtils {
  static generateToken(user: { id: string; email: string; role: string }): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as any);
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
  }

  static verifyToken(token: string): any {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }

  static generateTempToken(userId: string, purpose: string): string {
    return jwt.sign(
      { userId, purpose },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );
  }

  static verifyTempToken(token: string, expectedPurpose: string): any {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (decoded.purpose !== expectedPurpose) {
      throw new Error('Invalid token purpose');
    }
    return decoded;
  }

  static getTokenExpiration(token: string): Date {
    const decoded = jwt.decode(token) as any;
    return new Date(decoded.exp * 1000);
  }
}

// Session utilities
export class SessionUtils {
  static generateSessionToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  static getSessionExpiration(days: number = 7): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + days);
    return expiration;
  }
}

// Rate limiting utilities
export class AuthRateLimitUtils {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  static checkLoginAttempts(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  static resetLoginAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  static getRemainingAttempts(identifier: string, maxAttempts: number = 5): number {
    const record = this.attempts.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - record.count);
  }
}

