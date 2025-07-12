import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { authMiddleware, optionalAuthMiddleware, requireOwnership } from '@/middleware/auth';
import { readRateLimiter, writeRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Import controller (we'll create this next)
// import { UserController } from '@/controllers/userController';

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must be less than 100 characters'),
  
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid website URL')
];

const getUsersValidation = [
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
    .isIn(['reputation', 'createdAt', 'name', 'lastActiveAt'])
    .withMessage('Invalid sort field'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search query must be between 2 and 50 characters')
];

const userIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Invalid user ID format')
];

// Placeholder controller methods (we'll implement these)
const UserController = {
  getUsers: async (req: any, res: any) => {
    res.json({ message: 'Get users endpoint - to be implemented' });
  },
  getUser: async (req: any, res: any) => {
    res.json({ message: 'Get user endpoint - to be implemented' });
  },
  updateProfile: async (req: any, res: any) => {
    res.json({ message: 'Update profile endpoint - to be implemented' });
  },
  followUser: async (req: any, res: any) => {
    res.json({ message: 'Follow user endpoint - to be implemented' });
  },
  unfollowUser: async (req: any, res: any) => {
    res.json({ message: 'Unfollow user endpoint - to be implemented' });
  },
  getUserActivity: async (req: any, res: any) => {
    res.json({ message: 'Get user activity endpoint - to be implemented' });
  }
};

// Public routes
router.get('/',
  readRateLimiter,
  getUsersValidation,
  optionalAuthMiddleware,
  asyncHandler(UserController.getUsers)
);

router.get('/:id',
  readRateLimiter,
  userIdValidation,
  optionalAuthMiddleware,
  asyncHandler(UserController.getUser)
);

router.get('/:id/activity',
  readRateLimiter,
  userIdValidation,
  optionalAuthMiddleware,
  asyncHandler(UserController.getUserActivity)
);

// Protected routes
router.put('/:id',
  writeRateLimiter,
  authMiddleware,
  userIdValidation,
  updateProfileValidation,
  requireOwnership('id'),
  asyncHandler(UserController.updateProfile)
);

router.post('/:id/follow',
  writeRateLimiter,
  authMiddleware,
  userIdValidation,
  asyncHandler(UserController.followUser)
);

router.delete('/:id/follow',
  writeRateLimiter,
  authMiddleware,
  userIdValidation,
  asyncHandler(UserController.unfollowUser)
);

// Health check
router.get('/health/check', (req, res) => {
  res.json({
    status: 'ok',
    service: 'users',
    timestamp: new Date().toISOString()
  });
});

export default router;

