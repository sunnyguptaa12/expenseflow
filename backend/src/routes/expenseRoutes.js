import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { expenseSchema } from '../utils/schemas.js';
import { expenseController as c } from '../controllers/transactionController.js';

const router = Router();
router.use(protect);
router.route('/').get(c.list).post(validate(expenseSchema), c.create);
router.route('/:id').get(c.get).put(validate(expenseSchema), c.update).delete(c.remove);
export default router;
