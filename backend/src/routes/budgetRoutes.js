import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { budgetSchema } from '../utils/schemas.js';
import * as c from '../controllers/budgetController.js';

const router = Router();
router.use(protect);
router.route('/').get(c.listBudgets).post(validate(budgetSchema), c.createBudget);
router.route('/:id').put(validate(budgetSchema), c.updateBudget).delete(c.deleteBudget);
export default router;
