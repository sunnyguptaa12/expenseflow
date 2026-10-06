import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { recurringSchema } from '../utils/schemas.js';
import * as c from '../controllers/recurringController.js';

const router = Router();
router.use(protect);
router.route('/').get(c.listRecurring).post(validate(recurringSchema), c.createRecurring);
router.route('/:id').put(validate(recurringSchema), c.updateRecurring).delete(c.deleteRecurring);
export default router;
