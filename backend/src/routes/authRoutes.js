import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import * as c from '../controllers/authController.js';
import { registerSchema, loginSchema, forgotSchema, resetSchema, changePasswordSchema } from '../utils/schemas.js';

const router = Router();
router.post('/register', authLimiter, validate(registerSchema), c.register);
router.post('/login', authLimiter, validate(loginSchema), c.login);
router.post('/logout', c.logout);
router.post('/forgot-password', authLimiter, validate(forgotSchema), c.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), c.resetPassword);
router.get('/me', protect, c.me);
router.put('/change-password', protect, validate(changePasswordSchema), c.changePassword);
export default router;
