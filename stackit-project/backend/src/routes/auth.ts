import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '@/controllers/authController';
import { authMiddleware } from '@/middleware/auth';
import { authRateLimiter, sensitiveRateLimiter } from '@/middleware/rateLimiter';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const passwordResetRequestValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const passwordResetValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
];

const emailVerificationValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Public routes
router.post('/register', 
  authRateLimiter,
  registerValidation,
  asyncHandler(AuthController.register)
);

router.post('/login',
  authRateLimiter,
  loginValidation,
  asyncHandler(AuthController.login)
);

router.post('/refresh-token',
  refreshTokenValidation,
  asyncHandler(AuthController.refreshToken)
);

router.post('/verify-email',
  emailVerificationValidation,
  asyncHandler(AuthController.verifyEmail)
);

router.post('/request-password-reset',
  sensitiveRateLimiter,
  passwordResetRequestValidation,
  asyncHandler(AuthController.requestPasswordReset)
);

router.post('/reset-password',
  sensitiveRateLimiter,
  passwordResetValidation,
  asyncHandler(AuthController.resetPassword)
);

// Protected routes
router.post('/logout',
  authMiddleware,
  asyncHandler(AuthController.logout)
);

router.get('/profile',
  authMiddleware,
  asyncHandler(AuthController.getProfile)
);

// Health check for auth service
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth',
    timestamp: new Date().toISOString()
  });
});

export default router;

