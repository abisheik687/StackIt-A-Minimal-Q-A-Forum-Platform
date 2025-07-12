import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { logger } from './logger';

// Password hashing utilities
export class PasswordUtils {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a plain text password
   */
  static async hash(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      return await bcrypt.hash(password, salt);
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare a plain text password with a hashed password
   */
  static async compare(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Password comparison failed:', error);
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Validate password strength
   */
  static validateStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters (aaa, 111, etc.)
      /123456|654321|qwerty|password|admin/i, // Common sequences
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common patterns and is not secure');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// JWT token utilities
export class TokenUtils {
  private static readonly JWT_SECRET = process.env.JWT_SECRET!;
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  /**
   * Generate a JWT token for a user
   */
  static generateToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): string {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      return jwt.sign(payload, this.JWT_SECRET, {
        expiresIn: this.JWT_EXPIRES_IN,
        issuer: 'stackit-api',
        audience: 'stackit-client',
      });
    } catch (error) {
      logger.error('Token generation failed:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Generate a refresh token
   */
  static generateRefreshToken(userId: string): string {
    try {
      return jwt.sign(
        { userId, type: 'refresh' },
        this.JWT_SECRET,
        {
          expiresIn: '30d',
          issuer: 'stackit-api',
          audience: 'stackit-client',
        }
      );
    } catch (error) {
      logger.error('Refresh token generation failed:', error);
      throw new Error('Refresh token generation failed');
    }
  }

  /**
   * Verify and decode a JWT token
   */
  static verifyToken(token: string): {
    userId: string;
    email: string;
    role: UserRole;
    iat: number;
    exp: number;
  } {
    try {
      return jwt.verify(token, this.JWT_SECRET, {
        issuer: 'stackit-api',
        audience: 'stackit-client',
      }) as any;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        logger.error('Token verification failed:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Generate a temporary token for email verification or password reset
   */
  static generateTempToken(userId: string, purpose: 'email-verification' | 'password-reset'): string {
    try {
      return jwt.sign(
        { userId, purpose },
        this.JWT_SECRET,
        {
          expiresIn: purpose === 'email-verification' ? '24h' : '1h',
          issuer: 'stackit-api',
          audience: 'stackit-client',
        }
      );
    } catch (error) {
      logger.error('Temporary token generation failed:', error);
      throw new Error('Temporary token generation failed');
    }
  }

  /**
   * Verify a temporary token
   */
  static verifyTempToken(token: string, expectedPurpose: 'email-verification' | 'password-reset'): {
    userId: string;
    purpose: string;
  } {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'stackit-api',
        audience: 'stackit-client',
      }) as any;

      if (decoded.purpose !== expectedPurpose) {
        throw new Error('Invalid token purpose');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        logger.error('Temporary token verification failed:', error);
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Get token expiration time
   */
  static getTokenExpiration(token: string): Date {
    try {
      const decoded = jwt.decode(token) as any;
      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }
}

// Session utilities
export class SessionUtils {
  /**
   * Generate a secure session token
   */
  static generateSessionToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate session expiration time
   */
  static getSessionExpiration(days: number = 7): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + days);
    return expiration;
  }

  /**
   * Check if a session is expired
   */
  static isSessionExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }
}

// Rate limiting utilities for auth endpoints
export class AuthRateLimitUtils {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Check if an IP/user has exceeded login attempts
   */
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

  /**
   * Reset login attempts for an identifier
   */
  static resetLoginAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Get remaining attempts for an identifier
   */
  static getRemainingAttempts(identifier: string, maxAttempts: number = 5): number {
    const record = this.attempts.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return maxAttempts;
    }
    return Math.max(0, maxAttempts - record.count);
  }
}

