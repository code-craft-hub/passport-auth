import { Router } from 'express';
import { referralController } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth.middleware';

const router: Router = Router();

// All referral routes require authentication
router.use(authenticate);

router.get('/stats', referralController.getStats.bind(referralController));
router.get('/code', referralController.getCode.bind(referralController));

export default router;