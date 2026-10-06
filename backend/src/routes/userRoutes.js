import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { avatarUpload } from '../middleware/upload.js';
import { profileSchema } from '../utils/schemas.js';
import * as c from '../controllers/userController.js';

const router = Router();
router.use(protect);
router.put('/profile', validate(profileSchema), c.updateProfile);
router.post('/profile-image', avatarUpload, c.uploadAvatar);
router.delete('/profile-image', c.removeAvatar);
router.get('/profile-image', c.getAvatar);
router.post('/logout-all', c.logoutAllDevices);
export default router;
