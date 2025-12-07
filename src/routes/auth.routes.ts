import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRegister, validateLogin } from '../middleware/validation.middleware';

const router: Router = Router();

router.post('/register', validateRegister, authController.register.bind(authController));
router.post('/login', validateLogin, authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));

export default router;