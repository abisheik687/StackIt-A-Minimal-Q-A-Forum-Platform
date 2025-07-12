import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { QuestionController } from '@/controllers/questionController';
import { authMiddleware, optionalAuthMiddleware, requireOwnership } from '@/middleware/auth';
import { readRateLimiter, writeRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const createQuestionValidation = [
  body('title')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 30, max: 10000 })
    .withMessage('Description must be between 30 and 10,000 characters'),
  
  body('tags')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('You can add 1 to 5 tags')
    .custom((tags) => {
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.trim().length < 2 || tag.trim().length > 30) {
            throw new Error('Each tag must be between 2 and 30 characters');
          }
        }
      }
      return true;
    })
];

const updateQuestionValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 30, max: 10000 })
    .withMessage('Description must be between 30 and 10,000 characters'),
  
  body('tags')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('You can add 1 to 5 tags')
    .custom((tags) => {
      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          if (typeof tag !== 'string' || tag.trim().length < 2 || tag.trim().length > 30) {
            throw new Error('Each tag must be between 2 and 30 characters');
          }
        }
      }
      return true;
    })
];

const voteValidation = [
  body('type')
    .isIn(['UPVOTE', 'DOWNVOTE'])
    .withMessage('Vote type must be either UPVOTE or DOWNVOTE')
];

const getQuestionsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'viewCount', 'voteCount', 'answerCount', 'title'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('tags')
    .optional()
    .custom((value) => {
      if (value) {
        const tags = value.split(',');
        if (tags.length > 10) {
          throw new Error('Maximum 10 tags allowed in filter');
        }
        for (const tag of tags) {
          if (tag.trim().length < 2 || tag.trim().length > 30) {
            throw new Error('Each tag must be between 2 and 30 characters');
          }
        }
      }
      return true;
    }),
  
  query('status')
    .optional()
    .isIn(['resolved', 'unresolved', 'pinned'])
    .withMessage('Status must be resolved, unresolved, or pinned'),
  
  query('timeframe')
    .optional()
    .isIn(['today', 'week', 'month', 'year'])
    .withMessage('Timeframe must be today, week, month, or year')
];

const questionIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Question ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid question ID format')
];

// Public routes (with optional auth for personalization)
router.get('/',
  readRateLimiter,
  getQuestionsValidation,
  optionalAuthMiddleware,
  asyncHandler(QuestionController.getQuestions)
);

router.get('/:id',
  readRateLimiter,
  questionIdValidation,
  optionalAuthMiddleware,
  asyncHandler(QuestionController.getQuestion)
);

// Protected routes (require authentication)
router.post('/',
  writeRateLimiter,
  authMiddleware,
  createQuestionValidation,
  asyncHandler(QuestionController.createQuestion)
);

router.put('/:id',
  writeRateLimiter,
  authMiddleware,
  questionIdValidation,
  updateQuestionValidation,
  requireOwnership('id'),
  asyncHandler(QuestionController.updateQuestion)
);

router.delete('/:id',
  writeRateLimiter,
  authMiddleware,
  questionIdValidation,
  requireOwnership('id'),
  asyncHandler(QuestionController.deleteQuestion)
);

router.post('/:id/vote',
  writeRateLimiter,
  authMiddleware,
  questionIdValidation,
  voteValidation,
  asyncHandler(QuestionController.voteQuestion)
);

// Health check for questions service
router.get('/health/check', (req, res) => {
  res.json({
    status: 'ok',
    service: 'questions',
    timestamp: new Date().toISOString()
  });
});

export default router;

