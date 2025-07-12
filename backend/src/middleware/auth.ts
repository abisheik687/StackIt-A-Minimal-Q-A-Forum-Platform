import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/database-simple';
import { UnauthorizedError, ForbiddenError } from './errorHandler';
import { logger } from '@/utils/logger';
import { UserRole } from '@prisma/client';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        name: string;
        isVerified: boolean;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Extract token from request headers
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
};

// Verify JWT token and extract user information
const verifyToken = async (token: string): Promise<JwtPayload> => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    } else {
      throw new UnauthorizedError('Token verification failed');
    }
  }
};

// Main authentication middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new UnauthorizedError('Access token is required');
    }

    // Verify the token
    const decoded = await verifyToken(token);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true 
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        isActive: true,
        lastActiveAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Update last active timestamp (async, don't wait)
    prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    }).catch(error => {
      logger.warn('Failed to update lastActiveAt:', error);
    });

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified
    };

    next();
  } catch (error) {
    next(error);
  }
};

// Optional authentication middleware (doesn't throw if no token)
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = await verifyToken(token);
    
    const user = await prisma.user.findUnique({
      where: { 
        id: decoded.userId,
        isActive: true 
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true
      }
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

// Role-based authorization middleware
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

// Verified user middleware
export const requireVerified = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  if (!req.user.isVerified) {
    throw new ForbiddenError('Email verification required');
  }

  next();
};

// Resource ownership middleware
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        throw new ForbiddenError('Resource ID is required');
      }

      // For admins and moderators, allow access to any resource
      if (req.user.role === 'ADMIN' || req.user.role === 'MODERATOR') {
        return next();
      }

      // Check ownership based on the route
      let isOwner = false;
      const userId = req.user.id;

      // Determine resource type and check ownership
      if (req.route.path.includes('/questions')) {
        const question = await prisma.question.findUnique({
          where: { id: resourceId },
          select: { authorId: true }
        });
        isOwner = question?.authorId === userId;
      } else if (req.route.path.includes('/answers')) {
        const answer = await prisma.answer.findUnique({
          where: { id: resourceId },
          select: { authorId: true }
        });
        isOwner = answer?.authorId === userId;
      } else if (req.route.path.includes('/comments')) {
        const comment = await prisma.comment.findUnique({
          where: { id: resourceId },
          select: { authorId: true }
        });
        isOwner = comment?.authorId === userId;
      } else if (req.route.path.includes('/users')) {
        isOwner = resourceId === userId;
      }

      if (!isOwner) {
        throw new ForbiddenError('You can only access your own resources');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Admin or moderator middleware
export const requireModerator = requireRole('ADMIN', 'MODERATOR');

// Admin only middleware
export const requireAdmin = requireRole('ADMIN');

