import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/analyticsController.js';

const router = Router();
router.use(protect);
router.get('/summary', c.summary);
router.get('/categories', c.categories);
router.get('/monthly', c.monthly);
router.get('/insights', c.insights);
export default router;
