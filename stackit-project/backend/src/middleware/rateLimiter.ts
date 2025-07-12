import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { RateLimitError } from './errorHandler';

// Default rate limit configuration
const defaultConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
};

// Custom key generator that considers user ID for authenticated requests
const keyGenerator = (req: Request): string => {
  const user = (req as any).user;
  if (user?.id) {
    return `user:${user.id}`;
  }
  return req.ip || 'unknown';
};

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response): void => {
  const user = (req as any).user;
  const identifier = user?.id ? `user:${user.id}` : req.ip;
  
  logger.warn(`Rate limit exceeded for ${identifier}`, {
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  throw new RateLimitError('Too many requests, please slow down');
};

// General API rate limiter
export const rateLimiter = rateLimit({
  ...defaultConfig,
  keyGenerator,
  handler: rateLimitHandler,
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: rateLimitHandler,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// More lenient rate limiter for read operations
export const readRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  keyGenerator,
  handler: rateLimitHandler,
});

// Strict rate limiter for write operations
export const writeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  keyGenerator,
  handler: rateLimitHandler,
});

// Very strict rate limiter for sensitive operations
export const sensitiveRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  keyGenerator,
  handler: rateLimitHandler,
});

// Rate limiter for file uploads
export const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  keyGenerator,
  handler: rateLimitHandler,
});

// Custom rate limiter factory for specific endpoints
export const createRateLimiter = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    ...defaultConfig,
    ...options,
    keyGenerator,
    handler: rateLimitHandler,
  });
};

// Helper function to get rate limit status
export const getRateLimitStatus = (req: Request): {
  limit: number;
  remaining: number;
  reset: Date;
} => {
  const limit = parseInt(req.get('RateLimit-Limit') || '0');
  const remaining = parseInt(req.get('RateLimit-Remaining') || '0');
  const resetTime = parseInt(req.get('RateLimit-Reset') || '0');
  
  return {
    limit,
    remaining,
    reset: new Date(resetTime * 1000)
  };
};

