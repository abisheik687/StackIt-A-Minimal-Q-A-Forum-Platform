import { Router } from 'express';
import { query, param } from 'express-validator';
import { optionalAuthMiddleware } from '@/middleware/auth';
import { readRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const getTagsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'usageCount', 'createdAt'])
    .withMessage('Invalid sort field'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Search query must be between 1 and 30 characters')
];

const tagIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Tag ID is required')
];

// Placeholder controller
const TagController = {
  getTags: async (req: any, res: any) => {
    res.json({ message: 'Get tags endpoint - to be implemented' });
  },
  getTag: async (req: any, res: any) => {
    res.json({ message: 'Get tag endpoint - to be implemented' });
  },
  getTagQuestions: async (req: any, res: any) => {
    res.json({ message: 'Get tag questions endpoint - to be implemented' });
  }
};

// Public routes
router.get('/',
  readRateLimiter,
  getTagsValidation,
  optionalAuthMiddleware,
  asyncHandler(TagController.getTags)
);

router.get('/:id',
  readRateLimiter,
  tagIdValidation,
  optionalAuthMiddleware,
  asyncHandler(TagController.getTag)
);

router.get('/:id/questions',
  readRateLimiter,
  tagIdValidation,
  optionalAuthMiddleware,
  asyncHandler(TagController.getTagQuestions)
);

export default router;

