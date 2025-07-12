import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware, requireOwnership } from '@/middleware/auth';
import { writeRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const createAnswerValidation = [
  body('content')
    .trim()
    .isLength({ min: 30, max: 10000 })
    .withMessage('Answer content must be between 30 and 10,000 characters'),
  
  body('questionId')
    .notEmpty()
    .withMessage('Question ID is required')
];

const updateAnswerValidation = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 30, max: 10000 })
    .withMessage('Answer content must be between 30 and 10,000 characters')
];

const voteValidation = [
  body('type')
    .isIn(['UPVOTE', 'DOWNVOTE'])
    .withMessage('Vote type must be either UPVOTE or DOWNVOTE')
];

const answerIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Answer ID is required')
];

// Placeholder controller
const AnswerController = {
  createAnswer: async (req: any, res: any) => {
    res.json({ message: 'Create answer endpoint - to be implemented' });
  },
  updateAnswer: async (req: any, res: any) => {
    res.json({ message: 'Update answer endpoint - to be implemented' });
  },
  deleteAnswer: async (req: any, res: any) => {
    res.json({ message: 'Delete answer endpoint - to be implemented' });
  },
  voteAnswer: async (req: any, res: any) => {
    res.json({ message: 'Vote answer endpoint - to be implemented' });
  },
  acceptAnswer: async (req: any, res: any) => {
    res.json({ message: 'Accept answer endpoint - to be implemented' });
  }
};

// All routes require authentication
router.post('/',
  writeRateLimiter,
  authMiddleware,
  createAnswerValidation,
  asyncHandler(AnswerController.createAnswer)
);

router.put('/:id',
  writeRateLimiter,
  authMiddleware,
  answerIdValidation,
  updateAnswerValidation,
  requireOwnership('id'),
  asyncHandler(AnswerController.updateAnswer)
);

router.delete('/:id',
  writeRateLimiter,
  authMiddleware,
  answerIdValidation,
  requireOwnership('id'),
  asyncHandler(AnswerController.deleteAnswer)
);

router.post('/:id/vote',
  writeRateLimiter,
  authMiddleware,
  answerIdValidation,
  voteValidation,
  asyncHandler(AnswerController.voteAnswer)
);

router.put('/:id/accept',
  writeRateLimiter,
  authMiddleware,
  answerIdValidation,
  asyncHandler(AnswerController.acceptAnswer)
);

export default router;

