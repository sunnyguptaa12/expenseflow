import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { incomeSchema } from '../utils/schemas.js';
import { incomeController as c } from '../controllers/transactionController.js';

const router = Router();
router.use(protect);
router.route('/').get(c.list).post(validate(incomeSchema), c.create);
router.route('/:id').get(c.get).put(validate(incomeSchema), c.update).delete(c.remove);
export default router;
