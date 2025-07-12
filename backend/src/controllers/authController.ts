import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@/utils/database-simple';
import { PasswordUtils, TokenUtils, SessionUtils, AuthRateLimitUtils } from '@/utils/auth-simple';
import { ValidationError, UnauthorizedError, ConflictError, NotFoundError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export class AuthController {
  /**
   * Register a new user
   */
  static async register(req: Request, res: Response): Promise<void> {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    const { name, email, password } = req.body;
    const clientIp = req.ip || 'unknown';

    // Check rate limiting for registration
    if (!AuthRateLimitUtils.checkLoginAttempts(`register:${clientIp}`, 3, 60 * 60 * 1000)) {
      throw new ValidationError('Too many registration attempts. Please try again later.');
    }

    try {
      // Validate password strength
      const passwordValidation = PasswordUtils.validateStrength(password);
      if (!passwordValidation.isValid) {
        throw new ValidationError(passwordValidation.errors.join(', '));
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await PasswordUtils.hash(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'USER',
          isVerified: false, // Email verification required
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          reputation: true,
          createdAt: true
        }
      });

      // Generate tokens
      const accessToken = TokenUtils.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = TokenUtils.generateRefreshToken(user.id);

      // Create session
      const sessionToken = SessionUtils.generateSessionToken();
      const sessionExpiration = SessionUtils.getSessionExpiration(30); // 30 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: sessionExpiration,
          ipAddress: clientIp,
          userAgent: req.get('User-Agent') || null
        }
      });

      // Generate email verification token
      const verificationToken = TokenUtils.generateTempToken(user.id, 'email-verification');

      // Reset rate limiting on successful registration
      AuthRateLimitUtils.resetLoginAttempts(`register:${clientIp}`);

      logger.info(`New user registered: ${user.email} (${user.id})`);

      res.status(201).json({
        message: 'User registered successfully',
        user,
        tokens: {
          accessToken,
          refreshToken,
          sessionToken
        },
        verificationToken, // In production, this would be sent via email
        expiresAt: TokenUtils.getTokenExpiration(accessToken)
      });

    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  static async login(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    const { email, password, rememberMe = false } = req.body;
    const clientIp = req.ip || 'unknown';
    const identifier = `login:${email}:${clientIp}`;

    // Check rate limiting
    if (!AuthRateLimitUtils.checkLoginAttempts(identifier)) {
      const remaining = AuthRateLimitUtils.getRemainingAttempts(identifier);
      throw new UnauthorizedError(`Too many login attempts. ${remaining} attempts remaining.`);
    }

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { 
          email: email.toLowerCase(),
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          isVerified: true,
          reputation: true,
          lastActiveAt: true
        }
      });

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await PasswordUtils.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Generate tokens
      const accessToken = TokenUtils.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      const refreshToken = TokenUtils.generateRefreshToken(user.id);

      // Create session
      const sessionToken = SessionUtils.generateSessionToken();
      const sessionDays = rememberMe ? 30 : 7;
      const sessionExpiration = SessionUtils.getSessionExpiration(sessionDays);

      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt: sessionExpiration,
          ipAddress: clientIp,
          userAgent: req.get('User-Agent') || null
        }
      });

      // Update last active timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() }
      });

      // Reset rate limiting on successful login
      AuthRateLimitUtils.resetLoginAttempts(identifier);

      logger.info(`User logged in: ${user.email} (${user.id})`);

      // Remove password from response
      const { password: _, ...userResponse } = user;

      res.json({
        message: 'Login successful',
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken,
          sessionToken
        },
        expiresAt: TokenUtils.getTokenExpiration(accessToken)
      });

    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(req: Request, res: Response): Promise<void> {
    const { sessionToken } = req.body;
    const userId = req.user?.id;

    try {
      if (sessionToken) {
        // Invalidate specific session
        await prisma.session.updateMany({
          where: {
            token: sessionToken,
            userId: userId
          },
          data: {
            isActive: false
          }
        });
      } else if (userId) {
        // Invalidate all sessions for the user
        await prisma.session.updateMany({
          where: { userId },
          data: { isActive: false }
        });
      }

      logger.info(`User logged out: ${req.user?.email} (${userId})`);

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = TokenUtils.verifyToken(refreshToken);
      
      if (!decoded.userId) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true 
        },
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true
        }
      });

      if (!user) {
        throw new UnauthorizedError('User not found or inactive');
      }

      // Generate new access token
      const newAccessToken = TokenUtils.generateToken({
        id: user.id,
        email: user.email,
        role: user.role
      });

      res.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        expiresAt: TokenUtils.getTokenExpiration(newAccessToken)
      });

    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Verify email address
   */
  static async verifyEmail(req: Request, res: Response): Promise<void> {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Verification token is required');
    }

    try {
      // Verify the token
      const decoded = TokenUtils.verifyTempToken(token, 'email-verification');

      // Update user verification status
      const user = await prisma.user.update({
        where: { id: decoded.userId },
        data: { isVerified: true },
        select: {
          id: true,
          name: true,
          email: true,
          isVerified: true
        }
      });

      logger.info(`Email verified for user: ${user.email} (${user.id})`);

      res.json({
        message: 'Email verified successfully',
        user
      });

    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    const { email } = req.body;
    const clientIp = req.ip || 'unknown';

    // Rate limiting for password reset requests
    if (!AuthRateLimitUtils.checkLoginAttempts(`reset:${clientIp}`, 3, 60 * 60 * 1000)) {
      throw new ValidationError('Too many password reset requests. Please try again later.');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { 
          email: email.toLowerCase(),
          isActive: true 
        },
        select: { id: true, email: true }
      });

      // Always return success to prevent email enumeration
      if (user) {
        const resetToken = TokenUtils.generateTempToken(user.id, 'password-reset');
        
        // In production, send this token via email
        logger.info(`Password reset requested for: ${user.email} (${user.id})`);
        
        // For demo purposes, we'll return the token
        res.json({
          message: 'Password reset instructions sent to your email',
          resetToken // Remove this in production
        });
      } else {
        res.json({
          message: 'Password reset instructions sent to your email'
        });
      }

    } catch (error) {
      logger.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: Request, res: Response): Promise<void> {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed: ' + errors.array().map(e => e.msg).join(', '));
    }

    const { token, newPassword } = req.body;

    try {
      // Verify reset token
      const decoded = TokenUtils.verifyTempToken(token, 'password-reset');

      // Validate new password
      const passwordValidation = PasswordUtils.validateStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new ValidationError(passwordValidation.errors.join(', '));
      }

      // Hash new password
      const hashedPassword = await PasswordUtils.hash(newPassword);

      // Update user password
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword }
      });

      // Invalidate all existing sessions
      await prisma.session.updateMany({
        where: { userId: decoded.userId },
        data: { isActive: false }
      });

      logger.info(`Password reset completed for user: ${decoded.userId}`);

      res.json({
        message: 'Password reset successful. Please log in with your new password.'
      });

    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          bio: true,
          avatar: true,
          location: true,
          website: true,
          reputation: true,
          isVerified: true,
          createdAt: true,
          lastActiveAt: true,
          _count: {
            select: {
              questions: true,
              answers: true,
              followers: true,
              following: true
            }
          }
        }
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        user
      });

    } catch (error) {
      logger.error('Get profile failed:', error);
      throw error;
    }
  }
}

