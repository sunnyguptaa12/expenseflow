import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { listAll } from '../controllers/transactionController.js';

const router = Router();
router.get('/', protect, listAll);
export default router;
