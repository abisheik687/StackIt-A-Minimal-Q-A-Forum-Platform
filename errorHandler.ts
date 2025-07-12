import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for common scenarios
export class ValidationError extends CustomError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Too many requests') {
    super(message, 429);
  }
}

// Helper function to handle Prisma errors
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): CustomError => {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const field = error.meta?.target as string[] | undefined;
      const fieldName = field?.[0] || 'field';
      return new ConflictError(`${fieldName} already exists`);
    
    case 'P2025':
      // Record not found
      return new NotFoundError('Record');
    
    case 'P2003':
      // Foreign key constraint violation
      return new ValidationError('Invalid reference to related record');
    
    case 'P2014':
      // Required relation violation
      return new ValidationError('Required relation is missing');
    
    case 'P2021':
      // Table does not exist
      return new CustomError('Database table does not exist', 500, false);
    
    case 'P2022':
      // Column does not exist
      return new CustomError('Database column does not exist', 500, false);
    
    default:
      logger.error('Unhandled Prisma error:', error);
      return new CustomError('Database operation failed', 500, false);
  }
};

// Main error handler middleware
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let customError: AppError;

  // Handle different types of errors
  if (error instanceof CustomError) {
    customError = error;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    customError = handlePrismaError(error);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    customError = new ValidationError('Invalid data provided');
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    customError = new CustomError('Database connection failed', 500, false);
  } else if (error.name === 'ValidationError') {
    // Handle express-validator errors
    customError = new ValidationError(error.message);
  } else if (error.name === 'JsonWebTokenError') {
    customError = new UnauthorizedError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    customError = new UnauthorizedError('Token expired');
  } else if (error.name === 'SyntaxError' && 'body' in error) {
    customError = new ValidationError('Invalid JSON format');
  } else {
    // Unknown error
    customError = new CustomError(
      process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message,
      500,
      false
    );
  }

  // Log error details
  const errorDetails = {
    message: customError.message,
    statusCode: customError.statusCode,
    stack: customError.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    timestamp: new Date().toISOString()
  };

  if (customError.statusCode >= 500) {
    logger.error('Server Error:', errorDetails);
  } else {
    logger.warn('Client Error:', errorDetails);
  }

  // Send error response
  const response: any = {
    error: {
      message: customError.message,
      statusCode: customError.statusCode,
      timestamp: new Date().toISOString()
    }
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = customError.stack;
    response.error.details = errorDetails;
  }

  res.status(customError.statusCode || 500).json(response);
};

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for unmatched routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

