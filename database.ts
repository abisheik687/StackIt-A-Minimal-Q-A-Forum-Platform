import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Create a singleton Prisma client instance
class DatabaseClient {
  private static instance: PrismaClient;
  private static isConnected = false;

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      DatabaseClient.instance = new PrismaClient({
        log: [
          {
            emit: 'event',
            level: 'query',
          },
          {
            emit: 'event',
            level: 'error',
          },
          {
            emit: 'event',
            level: 'info',
          },
          {
            emit: 'event',
            level: 'warn',
          },
        ],
        errorFormat: 'pretty',
      });

      // Set up logging for database operations
      DatabaseClient.instance.$on('query', (e) => {
        logger.database('QUERY', e.target, e.duration);
        if (process.env.NODE_ENV === 'development') {
          logger.debug(`Query: ${e.query}`);
          logger.debug(`Params: ${e.params}`);
        }
      });

      DatabaseClient.instance.$on('error', (e) => {
        logger.error('Database error:', e);
      });

      DatabaseClient.instance.$on('info', (e) => {
        logger.info('Database info:', e.message);
      });

      DatabaseClient.instance.$on('warn', (e) => {
        logger.warn('Database warning:', e.message);
      });

      // Handle connection events
      DatabaseClient.instance.$connect()
        .then(() => {
          DatabaseClient.isConnected = true;
          logger.info('✅ Database connected successfully');
        })
        .catch((error) => {
          logger.error('❌ Failed to connect to database:', error);
          process.exit(1);
        });
    }

    return DatabaseClient.instance;
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseClient.instance && DatabaseClient.isConnected) {
      await DatabaseClient.instance.$disconnect();
      DatabaseClient.isConnected = false;
      logger.info('Database disconnected');
    }
  }

  public static isHealthy(): boolean {
    return DatabaseClient.isConnected;
  }

  // Helper method to check database connection
  public static async checkConnection(): Promise<boolean> {
    try {
      await DatabaseClient.getInstance().$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database connection check failed:', error);
      return false;
    }
  }

  // Helper method for transaction handling
  public static async withTransaction<T>(
    callback: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const prisma = DatabaseClient.getInstance();
    
    return await prisma.$transaction(async (tx) => {
      return await callback(tx as PrismaClient);
    });
  }
}

// Export the singleton instance
export const prisma = DatabaseClient.getInstance();

// Export utility methods
export const {
  disconnect: disconnectDatabase,
  isHealthy: isDatabaseHealthy,
  checkConnection: checkDatabaseConnection,
  withTransaction
} = DatabaseClient;

// Helper function for pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const paginate = async <T>(
  model: any,
  options: PaginationOptions & { where?: any; include?: any; select?: any } = {}
): Promise<PaginationResult<T>> => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    where = {},
    include,
    select
  } = options;

  const skip = (page - 1) * limit;
  const orderBy = { [sortBy]: sortOrder };

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      skip,
      take: limit,
      orderBy
    }),
    model.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

