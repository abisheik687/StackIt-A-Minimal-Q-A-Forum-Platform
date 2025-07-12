import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Create a simple Prisma client instance
export const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'pretty',
});

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

