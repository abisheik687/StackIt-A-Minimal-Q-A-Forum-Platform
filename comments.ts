import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware, requireOwnership } from '@/middleware/auth';
import { writeRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const createCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1,000 characters'),
  
  body('answerId')
    .optional()
    .notEmpty()
    .withMessage('Answer ID must be provided if commenting on an answer'),
  
  body('questionId')
    .optional()
    .notEmpty()
    .withMessage('Question ID must be provided if commenting on a question')
];

const updateCommentValidation = [
  body('content')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1,000 characters')
];

const commentIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Comment ID is required')
];

// Placeholder controller
const CommentController = {
  createComment: async (req: any, res: any) => {
    res.json({ message: 'Create comment endpoint - to be implemented' });
  },
  updateComment: async (req: any, res: any) => {
    res.json({ message: 'Update comment endpoint - to be implemented' });
  },
  deleteComment: async (req: any, res: any) => {
    res.json({ message: 'Delete comment endpoint - to be implemented' });
  }
};

// All routes require authentication
router.post('/',
  writeRateLimiter,
  authMiddleware,
  createCommentValidation,
  asyncHandler(CommentController.createComment)
);

router.put('/:id',
  writeRateLimiter,
  authMiddleware,
  commentIdValidation,
  updateCommentValidation,
  requireOwnership('id'),
  asyncHandler(CommentController.updateComment)
);

router.delete('/:id',
  writeRateLimiter,
  authMiddleware,
  commentIdValidation,
  requireOwnership('id'),
  asyncHandler(CommentController.deleteComment)
);

export default router;

