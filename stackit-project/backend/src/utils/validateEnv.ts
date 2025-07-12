import { logger } from './logger';

interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: string;
  NODE_ENV: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: string;
  RATE_LIMIT_MAX_REQUESTS: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'PORT',
  'NODE_ENV',
  'CORS_ORIGIN',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS'
];

export const validateEnv = (): void => {
  const missingVars: string[] = [];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    logger.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate specific values
  const nodeEnv = process.env.NODE_ENV;
  if (!['development', 'production', 'test'].includes(nodeEnv!)) {
    logger.error(`Invalid NODE_ENV: ${nodeEnv}. Must be 'development', 'production', or 'test'.`);
    process.exit(1);
  }

  const port = parseInt(process.env.PORT!, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.error(`Invalid PORT: ${process.env.PORT}. Must be a number between 1 and 65535.`);
    process.exit(1);
  }

  const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS!, 10);
  if (isNaN(rateLimitWindow) || rateLimitWindow < 1000) {
    logger.error(`Invalid RATE_LIMIT_WINDOW_MS: ${process.env.RATE_LIMIT_WINDOW_MS}. Must be a number >= 1000.`);
    process.exit(1);
  }

  const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS!, 10);
  if (isNaN(rateLimitMax) || rateLimitMax < 1) {
    logger.error(`Invalid RATE_LIMIT_MAX_REQUESTS: ${process.env.RATE_LIMIT_MAX_REQUESTS}. Must be a number >= 1.`);
    process.exit(1);
  }

  // Validate JWT secret strength in production
  if (nodeEnv === 'production' && process.env.JWT_SECRET!.length < 32) {
    logger.error('JWT_SECRET must be at least 32 characters long in production.');
    process.exit(1);
  }

  logger.info('✅ Environment validation passed');
};

